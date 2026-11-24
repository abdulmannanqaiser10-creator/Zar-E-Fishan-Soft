import Quotation from '../models/Quotation.js';
import Account from '../models/Account.js';
import GeneralExpense from '../models/GeneralExpense.js';
import LedgerEntry from '../models/LedgerEntry.js';
import SalesReturn from '../models/SalesReturn.js';
import Blog from '../models/Blog.js';
import { WebsiteBudget, WebsiteProject } from '../models/WebsiteContent.js';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Settings from '../models/Settings.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { getNextSequence, formatDocNumber } from '../services/sequenceService.js';
import { calculateDocumentTotals, roundMoney, ensureNonNegative } from '../utils/calculations.js';
import { postLedger, ensureDefaultAccounts } from '../services/ledgerService.js';
import { logActivity } from '../services/activityService.js';
import { refreshClientBalances, refreshProjectFinance } from '../services/balanceService.js';
import { fileToDataUrl } from '../middleware/upload.js';

/* ---------- Accounts ---------- */
export const listAccounts = asyncHandler(async (req, res) => {
  await ensureDefaultAccounts();
  const data = await Account.find({ isActive: { $ne: false } }).sort({ type: 1, name: 1 });
  res.json({ success: true, data });
});

export const createAccount = asyncHandler(async (req, res) => {
  const { name, type, bankName, accountNumber, openingBalance, notes } = req.body;
  if (!name || !type) throw new AppError('Name and type are required', 400);
  const opening = ensureNonNegative(openingBalance || 0, 'Opening balance');
  const account = await Account.create({
    name, type, bankName, accountNumber, notes,
    openingBalance: opening,
    currentBalance: opening,
  });
  res.status(201).json({ success: true, data: account });
});

export const updateAccount = asyncHandler(async (req, res) => {
  const account = await Account.findById(req.params.id);
  if (!account) throw new AppError('Account not found', 404);
  ['name', 'bankName', 'accountNumber', 'notes', 'isActive'].forEach((f) => {
    if (req.body[f] !== undefined) account[f] = req.body[f];
  });
  await account.save();
  res.json({ success: true, data: account });
});

/* ---------- Quotations ---------- */
export const listQuotations = asyncHandler(async (req, res) => {
  const { search, status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (search) query.quotationNumber = new RegExp(search, 'i');
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Quotation.find(query).populate('client', 'name phone').populate('project', 'name projectId')
      .sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Quotation.countDocuments(query),
  ]);
  res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
});

export const createQuotation = asyncHandler(async (req, res) => {
  const { client, project, items, taxRate, discountAmount, validUntil, notes, status } = req.body;
  if (!client || !items?.length) throw new AppError('Client and items are required', 400);
  const totals = calculateDocumentTotals({ items, taxRate: taxRate || 0, discountAmount: discountAmount || 0 });
  const seq = await getNextSequence('quotation');
  const quotation = await Quotation.create({
    quotationNumber: formatDocNumber('QT', seq),
    client, project,
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount || 0,
      amount: roundMoney(Math.max(0, (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) - (Number(i.discount) || 0))),
    })),
    ...totals,
    validUntil, notes, status: status || 'draft',
    createdBy: req.user._id,
  });
  res.status(201).json({ success: true, data: quotation });
});

export const updateQuotation = asyncHandler(async (req, res) => {
  const q = await Quotation.findById(req.params.id);
  if (!q) throw new AppError('Quotation not found', 404);
  if (req.body.items) {
    const totals = calculateDocumentTotals({
      items: req.body.items,
      taxRate: req.body.taxRate ?? q.taxRate,
      discountAmount: req.body.discountAmount ?? q.discountAmount,
    });
    q.items = req.body.items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discount: i.discount || 0,
      amount: roundMoney(Math.max(0, (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0) - (Number(i.discount) || 0))),
    }));
    Object.assign(q, totals);
  }
  ['status', 'notes', 'validUntil', 'client', 'project'].forEach((f) => {
    if (req.body[f] !== undefined) q[f] = req.body[f];
  });
  await q.save();
  res.json({ success: true, data: q });
});

export const convertQuotation = asyncHandler(async (req, res) => {
  const q = await Quotation.findById(req.params.id);
  if (!q) throw new AppError('Quotation not found', 404);
  if (q.status === 'converted') throw new AppError('Already converted', 400);
  const settings = (await Settings.findOne()) || { invoicePrefix: 'INV' };
  const seq = await getNextSequence('invoice');
  const invoice = await Invoice.create({
    invoiceNumber: formatDocNumber(settings.invoicePrefix || 'INV', seq),
    invoiceType: 'client',
    client: q.client,
    project: q.project,
    items: q.items,
    subtotal: q.subtotal,
    taxRate: q.taxRate,
    taxAmount: q.taxAmount,
    discountAmount: q.discountAmount,
    total: q.total,
    paidAmount: 0,
    remainingBalance: q.total,
    status: 'sent',
    notes: q.notes,
    createdBy: req.user._id,
  });
  q.status = 'converted';
  q.convertedInvoice = invoice._id;
  await q.save();
  await refreshClientBalances(q.client);
  res.json({ success: true, data: { quotation: q, invoice } });
});

/* ---------- General Expenses ---------- */
export const listExpenses = asyncHandler(async (req, res) => {
  const { category, page = 1, limit = 20 } = req.query;
  const query = {};
  if (category) query.category = category;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    GeneralExpense.find(query).populate('account project vendor').sort({ date: -1 }).skip(skip).limit(Number(limit)),
    GeneralExpense.countDocuments(query),
  ]);
  res.json({ success: true, data, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } });
});

export const createExpense = asyncHandler(async (req, res) => {
  const { title, category, amount, date, paymentMethod, account, project, vendor, notes } = req.body;
  if (!title || amount == null) throw new AppError('Title and amount are required', 400);
  const safeAmount = ensureNonNegative(amount, 'Amount');
  const seq = await getNextSequence('expense');
  const txnSeq = await getNextSequence('transaction');
  const txn = await Transaction.create({
    transactionId: formatDocNumber('TXN', txnSeq),
    type: 'expense',
    category: category || 'General Expense',
    amount: safeAmount,
    paymentMethod: paymentMethod || 'cash',
    date: date || new Date(),
    description: title,
    project, vendor, account,
    uniqueKey: `gen-exp-${Date.now()}-${safeAmount}`,
    createdBy: req.user._id,
  });
  const expense = await GeneralExpense.create({
    expenseNumber: formatDocNumber('EXP', seq),
    title, category: category || 'other', amount: safeAmount,
    date: date || new Date(), paymentMethod: paymentMethod || 'cash',
    account, project, vendor, notes, transaction: txn._id, createdBy: req.user._id,
  });
  await postLedger({
    type: 'debit', category: 'General Expense', amount: safeAmount,
    description: title, account, project, vendor, transaction: txn._id,
    uniqueKey: `ldg-exp-${expense._id}`, userId: req.user._id, date: date || new Date(),
  });
  if (project) await refreshProjectFinance(project);
  res.status(201).json({ success: true, data: expense });
});

export const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await GeneralExpense.findById(req.params.id);
  if (!expense) throw new AppError('Expense not found', 404);
  if (expense.transaction) await Transaction.findByIdAndDelete(expense.transaction);
  await expense.deleteOne();
  res.json({ success: true, message: 'Expense deleted' });
});

/* ---------- Ledger ---------- */
export const listLedger = asyncHandler(async (req, res) => {
  const { startDate, endDate, account, client, vendor, page = 1, limit = 50 } = req.query;
  const query = {};
  if (account) query.account = account;
  if (client) query.client = client;
  if (vendor) query.vendor = vendor;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    LedgerEntry.find(query).populate('account client vendor project').sort({ date: -1 }).skip(skip).limit(Number(limit)),
    LedgerEntry.countDocuments(query),
  ]);
  const credits = data.filter((e) => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const debits = data.filter((e) => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  res.json({
    success: true, data,
    summary: { credits: roundMoney(credits), debits: roundMoney(debits), net: roundMoney(credits - debits) },
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

/* ---------- Sales Returns ---------- */
export const listSalesReturns = asyncHandler(async (req, res) => {
  const data = await SalesReturn.find().populate('client', 'name').populate('invoice', 'invoiceNumber').sort({ createdAt: -1 }).limit(100);
  res.json({ success: true, data });
});

export const createSalesReturn = asyncHandler(async (req, res) => {
  const { client, invoice, project, items, reason, refundMethod, account, taxAmount } = req.body;
  if (!client || !items?.length) throw new AppError('Client and items required', 400);
  const subtotal = roundMoney(items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0));
  const tax = ensureNonNegative(taxAmount || 0, 'Tax');
  const total = roundMoney(subtotal + tax);
  const seq = await getNextSequence('salesReturn');
  const ret = await SalesReturn.create({
    returnNumber: formatDocNumber('SR', seq),
    client, invoice, project,
    items: items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      amount: roundMoney((Number(i.quantity) || 0) * (Number(i.unitPrice) || 0)),
      material: i.material,
    })),
    subtotal, taxAmount: tax, total, reason,
    refundMethod: refundMethod || 'cash', account,
    status: 'approved', createdBy: req.user._id,
  });
  const txnSeq = await getNextSequence('transaction');
  const txn = await Transaction.create({
    transactionId: formatDocNumber('TXN', txnSeq),
    type: 'expense',
    category: 'Sales Return',
    amount: total,
    paymentMethod: refundMethod || 'cash',
    date: new Date(),
    description: `Sales return ${ret.returnNumber}`,
    client, project, account,
    uniqueKey: `sr-${ret._id}`,
    createdBy: req.user._id,
  });
  await postLedger({
    type: 'debit', category: 'Sales Return', amount: total,
    description: ret.returnNumber, account, client, project, transaction: txn._id,
    uniqueKey: `ldg-sr-${ret._id}`, userId: req.user._id,
  });
  ret.status = 'refunded';
  await ret.save();
  res.status(201).json({ success: true, data: ret });
});

/* ---------- CRM follow-ups ---------- */
export const addFollowUp = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new AppError('Client not found', 404);
  const { note, nextFollowUp, crmStatus } = req.body;
  if (!note) throw new AppError('Follow-up note is required', 400);
  client.followUps.push({ note, nextFollowUp, createdBy: req.user._id });
  if (crmStatus) client.crmStatus = crmStatus;
  else if (client.crmStatus === 'Lead') client.crmStatus = 'Follow-up';
  await client.save();
  res.status(201).json({ success: true, data: client });
});

/* ---------- Project media & expenses ---------- */
export const addProjectMedia = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  let url = req.body.url || '';
  let type = req.body.type || 'image';
  let name = req.body.name || 'media';
  let size = 0;
  if (req.file) {
    url = fileToDataUrl(req.file);
    type = req.file.mimetype.startsWith('video') ? 'video' : 'image';
    name = req.file.originalname;
    size = req.file.size;
  }
  if (!url) throw new AppError('Media file or URL is required', 400);
  project.media.push({ type, url, name, size });
  await project.save();
  res.status(201).json({ success: true, data: project });
});

export const deleteProjectMedia = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const media = project.media.id(req.params.mediaId);
  if (!media) throw new AppError('Media not found', 404);
  media.deleteOne();
  await project.save();
  res.json({ success: true, data: project });
});

export const addProjectExpense = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const { title, category, amount, date, paymentMethod, account, notes } = req.body;
  if (!title || amount == null) throw new AppError('Title and amount required', 400);
  const safeAmount = ensureNonNegative(amount, 'Amount');
  const txnSeq = await getNextSequence('transaction');
  const txn = await Transaction.create({
    transactionId: formatDocNumber('TXN', txnSeq),
    type: 'expense',
    category: category || 'Project Expense',
    amount: safeAmount,
    paymentMethod: paymentMethod || 'cash',
    date: date || new Date(),
    description: `${title} (${project.projectId})`,
    project: project._id,
    account,
    uniqueKey: `pexp-${project._id}-${Date.now()}`,
    createdBy: req.user._id,
  });
  project.projectExpenses.push({
    title, category: category || 'General', amount: safeAmount,
    date: date || new Date(), paymentMethod: paymentMethod || 'cash',
    account, notes, transaction: txn._id,
  });
  await project.save();
  await postLedger({
    type: 'debit', category: 'Project Expense', amount: safeAmount,
    description: title, account, project: project._id, transaction: txn._id,
    uniqueKey: `ldg-pexp-${txn._id}`, userId: req.user._id,
  });
  await refreshProjectFinance(project._id);
  const refreshed = await Project.findById(project._id).populate('client');
  res.status(201).json({ success: true, data: refreshed });
});

/* ---------- Pending payments / notifications ---------- */
export const pendingPayments = asyncHandler(async (req, res) => {
  const settings = (await Settings.findOne()) || { pendingPaymentAlertDays: 7 };
  const days = settings.pendingPaymentAlertDays || 7;
  const alertDate = new Date();
  alertDate.setDate(alertDate.getDate() + days);

  const receivables = await Invoice.find({
    $and: [
      { remainingBalance: { $gt: 0 } },
      { status: { $in: ['sent', 'partial', 'overdue'] } },
      { $or: [{ invoiceType: 'client' }, { invoiceType: { $exists: false } }, { invoiceType: null }] },
    ],
  }).populate('client', 'name phone').populate('project', 'name').sort({ dueDate: 1 });

  const payables = await Invoice.find({
    invoiceType: { $in: ['supplier', 'purchase'] },
    remainingBalance: { $gt: 0 },
    status: { $nin: ['cancelled', 'paid'] },
  }).populate('vendor', 'name phone').sort({ dueDate: 1 });

  const notifications = [];
  receivables.forEach((inv) => {
    const overdue = inv.dueDate && new Date(inv.dueDate) < new Date();
    const dueSoon = inv.dueDate && new Date(inv.dueDate) <= alertDate;
    if (overdue || dueSoon) {
      notifications.push({
        type: overdue ? 'overdue' : 'due_soon',
        kind: 'receivable',
        invoiceNumber: inv.invoiceNumber,
        party: inv.client?.name,
        amount: inv.remainingBalance,
        dueDate: inv.dueDate,
        id: inv._id,
      });
    }
  });
  payables.forEach((inv) => {
    const overdue = inv.dueDate && new Date(inv.dueDate) < new Date();
    if (overdue) {
      notifications.push({
        type: 'overdue',
        kind: 'payable',
        invoiceNumber: inv.invoiceNumber,
        party: inv.vendor?.name,
        amount: inv.remainingBalance,
        dueDate: inv.dueDate,
        id: inv._id,
      });
    }
  });

  res.json({
    success: true,
    data: { receivables, payables, notifications },
    totals: {
      receivables: roundMoney(receivables.reduce((s, i) => s + i.remainingBalance, 0)),
      payables: roundMoney(payables.reduce((s, i) => s + i.remainingBalance, 0)),
    },
  });
});

/* ---------- Cash flow / Balance sheet ---------- */
export const cashFlowReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = {};
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }
  const rows = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { month: { $month: '$date' }, year: { $year: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1 } },
  ]);
  const accounts = await Account.find({ isActive: true });
  res.json({
    success: true,
    data: rows,
    accounts: accounts.map((a) => ({ name: a.name, type: a.type, balance: a.currentBalance })),
    cashOnHand: roundMoney(accounts.filter((a) => a.type === 'cash').reduce((s, a) => s + a.currentBalance, 0)),
    bankBalance: roundMoney(accounts.filter((a) => a.type === 'bank').reduce((s, a) => s + a.currentBalance, 0)),
  });
});

export const balanceSheet = asyncHandler(async (req, res) => {
  await ensureDefaultAccounts();
  const accounts = await Account.find({ isActive: true });
  const receivables = await Invoice.aggregate([
    { $match: { remainingBalance: { $gt: 0 }, status: { $nin: ['cancelled'] }, $or: [{ invoiceType: 'client' }, { invoiceType: { $exists: false } }] } },
    { $group: { _id: null, total: { $sum: '$remainingBalance' } } },
  ]);
  const payables = await Invoice.aggregate([
    { $match: { remainingBalance: { $gt: 0 }, invoiceType: { $in: ['supplier', 'purchase'] }, status: { $ne: 'cancelled' } } },
    { $group: { _id: null, total: { $sum: '$remainingBalance' } } },
  ]);
  const inventory = await (await import('../models/Material.js')).default.find({ isActive: true });
  const inventoryValue = roundMoney(inventory.reduce((s, m) => s + (m.quantity || 0) * (m.costPrice || 0), 0));

  const cashBank = roundMoney(accounts.reduce((s, a) => s + (a.currentBalance || 0), 0));
  const ar = roundMoney(receivables[0]?.total || 0);
  const ap = roundMoney(payables[0]?.total || 0);
  const assets = roundMoney(cashBank + ar + inventoryValue);
  const liabilities = ap;
  const equity = roundMoney(assets - liabilities);

  res.json({
    success: true,
    data: {
      assets: { cashBank, accountsReceivable: ar, inventory: inventoryValue, total: assets },
      liabilities: { accountsPayable: ap, total: liabilities },
      equity: { total: equity },
      accounts,
    },
  });
});

/* ---------- Website module ---------- */
export const listBlogs = asyncHandler(async (req, res) => {
  const data = await Blog.find().sort({ createdAt: -1 }).populate('author', 'name');
  res.json({ success: true, data });
});

export const saveBlog = asyncHandler(async (req, res) => {
  const { title, content, excerpt, coverImage, status, tags } = req.body;
  if (!title) throw new AppError('Title is required', 400);
  const slug = (req.body.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let blog;
  if (req.params.id) {
    blog = await Blog.findById(req.params.id);
    if (!blog) throw new AppError('Blog not found', 404);
    Object.assign(blog, { title, slug, content, excerpt, coverImage, status, tags });
    if (status === 'published' && !blog.publishedAt) blog.publishedAt = new Date();
    await blog.save();
  } else {
    blog = await Blog.create({
      title, slug, content, excerpt, coverImage,
      status: status || 'draft', tags,
      publishedAt: status === 'published' ? new Date() : undefined,
      author: req.user._id,
    });
  }
  res.status(req.params.id ? 200 : 201).json({ success: true, data: blog });
});

export const deleteBlog = asyncHandler(async (req, res) => {
  await Blog.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Blog deleted' });
});

export const listWebsiteBudgets = asyncHandler(async (req, res) => {
  const data = await WebsiteBudget.find().sort({ createdAt: -1 });
  res.json({ success: true, data });
});

export const saveWebsiteBudget = asyncHandler(async (req, res) => {
  const { title, category, allocated, spent, period, notes } = req.body;
  if (!title || allocated == null) throw new AppError('Title and allocated amount required', 400);
  let doc;
  if (req.params.id) {
    doc = await WebsiteBudget.findByIdAndUpdate(req.params.id, {
      title, category, allocated: ensureNonNegative(allocated), spent: ensureNonNegative(spent || 0), period, notes,
    }, { new: true });
  } else {
    doc = await WebsiteBudget.create({
      title, category, allocated: ensureNonNegative(allocated), spent: ensureNonNegative(spent || 0), period, notes,
    });
  }
  res.status(req.params.id ? 200 : 201).json({ success: true, data: doc });
});

export const deleteWebsiteBudget = asyncHandler(async (req, res) => {
  await WebsiteBudget.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Budget deleted' });
});

export const listWebsiteProjects = asyncHandler(async (req, res) => {
  const data = await WebsiteProject.find().populate('linkedProject', 'name projectId').sort({ sortOrder: 1, createdAt: -1 });
  res.json({ success: true, data });
});

export const saveWebsiteProject = asyncHandler(async (req, res) => {
  const { title, description, coverImage, gallery, linkedProject, status, featured, sortOrder } = req.body;
  if (!title) throw new AppError('Title is required', 400);
  const slug = (req.body.slug || title).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  let doc;
  if (req.params.id) {
    doc = await WebsiteProject.findByIdAndUpdate(req.params.id, {
      title, slug, description, coverImage, gallery, linkedProject, status, featured, sortOrder,
    }, { new: true });
  } else {
    doc = await WebsiteProject.create({
      title, slug, description, coverImage, gallery, linkedProject,
      status: status || 'draft', featured: !!featured, sortOrder: sortOrder || 0,
    });
  }
  res.status(req.params.id ? 200 : 201).json({ success: true, data: doc });
});

export const deleteWebsiteProject = asyncHandler(async (req, res) => {
  await WebsiteProject.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'Website project deleted' });
});

export const updateFonts = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});
  settings.fonts = { ...(settings.fonts?.toObject?.() || settings.fonts || {}), ...req.body.fonts };
  if (req.body.logo !== undefined) settings.logo = req.body.logo;
  await settings.save();
  res.json({ success: true, data: settings });
});
