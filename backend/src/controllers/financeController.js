import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { getNextSequence, formatDocNumber } from '../services/sequenceService.js';
import { ensureNonNegative, calculateProfit } from '../utils/calculations.js';
import {
  refreshClientBalances,
  refreshVendorBalances,
  refreshProjectFinance,
} from '../services/balanceService.js';

export const getTransactions = asyncHandler(async (req, res) => {
  const {
    type, category, project, client, vendor,
    search, startDate, endDate, page = 1, limit = 20,
  } = req.query;
  const query = {};
  if (type) query.type = type;
  if (category) query.category = category;
  if (project) query.project = project;
  if (client) query.client = client;
  if (vendor) query.vendor = vendor;
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }
  if (search) {
    query.$or = [
      { description: new RegExp(search, 'i') },
      { reference: new RegExp(search, 'i') },
      { transactionId: new RegExp(search, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Transaction.find(query)
      .populate('project', 'name projectId')
      .populate('client', 'name')
      .populate('vendor', 'name')
      .populate('account', 'name type')
      .sort({ date: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Transaction.countDocuments(query),
  ]);

  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const createTransaction = asyncHandler(async (req, res) => {
  const {
    type, category, amount, paymentMethod, date, description,
    reference, project, client, vendor, account, uniqueKey,
  } = req.body;

  if (!type || !category || amount == null) {
    throw new AppError('Type, category and amount are required', 400);
  }
  const safeAmount = ensureNonNegative(amount, 'Amount');
  if (safeAmount === 0) throw new AppError('Amount must be greater than zero', 400);

  if (uniqueKey) {
    const dup = await Transaction.findOne({ uniqueKey });
    if (dup) throw new AppError('Duplicate financial transaction prevented', 400);
  }

  const seq = await getNextSequence('transaction');
  const transactionId = formatDocNumber('TXN', seq);

  const txn = await Transaction.create({
    transactionId,
    type,
    category,
    amount: safeAmount,
    paymentMethod: paymentMethod || 'bank_transfer',
    date: date || new Date(),
    description,
    reference,
    project,
    client,
    vendor,
    account,
    uniqueKey,
    createdBy: req.user._id,
  });

  const { postLedger } = await import('../services/ledgerService.js');
  await postLedger({
    type: type === 'income' ? 'credit' : 'debit',
    category,
    amount: safeAmount,
    description: description || category,
    account,
    client,
    vendor,
    project,
    transaction: txn._id,
    uniqueKey: uniqueKey ? `ldg-${uniqueKey}` : `ldg-txn-${txn._id}`,
    userId: req.user._id,
    date: date || new Date(),
  });

  if (project) await refreshProjectFinance(project);
  if (client) await refreshClientBalances(client);
  if (vendor) await refreshVendorBalances(vendor);

  await logActivity({
    action: 'create',
    module: 'finance',
    entityType: 'Transaction',
    entityId: txn._id,
    description: `${type} ${transactionId} of ${safeAmount} recorded`,
    user: req.user._id,
  });

  const populated = await Transaction.findById(txn._id)
    .populate('project', 'name projectId')
    .populate('client', 'name')
    .populate('vendor', 'name');

  res.status(201).json({ success: true, data: populated });
});

export const updateTransaction = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if (!txn) throw new AppError('Transaction not found', 404);
  if (txn.invoice || txn.purchaseOrder) {
    throw new AppError('Linked invoice/PO transactions cannot be edited directly', 400);
  }

  const prevProject = txn.project;
  const prevClient = txn.client;
  const prevVendor = txn.vendor;

  ['type', 'category', 'paymentMethod', 'date', 'description', 'reference', 'project', 'client', 'vendor']
    .forEach((f) => {
      if (req.body[f] !== undefined) txn[f] = req.body[f];
    });
  if (req.body.amount != null) txn.amount = ensureNonNegative(req.body.amount, 'Amount');

  await txn.save();

  await refreshProjectFinance(prevProject);
  await refreshProjectFinance(txn.project);
  if (prevClient) await refreshClientBalances(prevClient);
  if (txn.client) await refreshClientBalances(txn.client);
  if (prevVendor) await refreshVendorBalances(prevVendor);
  if (txn.vendor) await refreshVendorBalances(txn.vendor);

  res.json({ success: true, data: txn });
});

export const deleteTransaction = asyncHandler(async (req, res) => {
  const txn = await Transaction.findById(req.params.id);
  if (!txn) throw new AppError('Transaction not found', 404);
  if (txn.invoice || txn.purchaseOrder) {
    throw new AppError('Linked invoice/PO transactions cannot be deleted directly', 400);
  }

  const { project, client, vendor } = txn;
  await txn.deleteOne();
  if (project) await refreshProjectFinance(project);
  if (client) await refreshClientBalances(client);
  if (vendor) await refreshVendorBalances(vendor);

  res.json({ success: true, message: 'Transaction deleted' });
});

export const getFinanceSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = {};
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = new Date(startDate);
    if (endDate) match.date.$lte = new Date(endDate);
  }

  const summary = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$type',
        total: { $sum: '$amount' },
        count: { $sum: 1 },
      },
    },
  ]);

  const income = summary.find((s) => s._id === 'income')?.total || 0;
  const expenses = summary.find((s) => s._id === 'expense')?.total || 0;

  res.json({
    success: true,
    data: {
      income,
      expenses,
      profit: calculateProfit(income, expenses),
      byType: summary,
    },
  });
});
