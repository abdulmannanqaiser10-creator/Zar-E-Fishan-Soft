import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { getNextSequence, formatDocNumber } from '../services/sequenceService.js';
import {
  calculateDocumentTotals,
  applyPayment,
  roundMoney,
} from '../utils/calculations.js';
import {
  refreshClientBalances,
  refreshProjectFinance,
} from '../services/balanceService.js';

const deriveStatus = (invoice) => {
  if (invoice.status === 'cancelled' || invoice.status === 'draft') return invoice.status;
  if (invoice.remainingBalance <= 0) return 'paid';
  if (invoice.paidAmount > 0) return 'partial';
  if (invoice.dueDate && new Date(invoice.dueDate) < new Date()) return 'overdue';
  return invoice.status === 'sent' ? 'sent' : 'sent';
};

export const getInvoices = asyncHandler(async (req, res) => {
  const { search, status, client, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (client) query.client = client;
  if (search) {
    query.$or = [
      { invoiceNumber: new RegExp(search, 'i') },
      { notes: new RegExp(search, 'i') },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Invoice.find(query)
      .populate('client', 'name phone email')
      .populate('project', 'name projectId')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Invoice.countDocuments(query),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate('client')
    .populate('project', 'name projectId');
  if (!invoice) throw new AppError('Invoice not found', 404);
  res.json({ success: true, data: invoice });
});

export const createInvoice = asyncHandler(async (req, res) => {
  const {
    client, project, items, taxRate, discountAmount, discountPercent,
    issueDate, dueDate, notes, status,
  } = req.body;

  if (!client || !items?.length) {
    throw new AppError('Client and at least one item are required', 400);
  }

  const settings = (await Settings.findOne()) || { taxRate: 0, invoicePrefix: 'INV' };
  const rate = taxRate != null ? taxRate : settings.taxRate || 0;

  const totals = calculateDocumentTotals({
    items,
    taxRate: rate,
    discountAmount: discountAmount || 0,
    discountPercent: discountPercent || 0,
  });

  const mappedItems = items.map((item, i) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    discount: item.discount || 0,
    amount: totals.subtotal && items.length
      ? roundMoney(
          Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0))
        )
      : 0,
  }));

  const seq = await getNextSequence('invoice');
  const invoiceNumber = formatDocNumber(settings.invoicePrefix || 'INV', seq);

  const invoice = await Invoice.create({
    invoiceNumber,
    client,
    project,
    items: mappedItems,
    ...totals,
    discountPercent: discountPercent || 0,
    paidAmount: 0,
    remainingBalance: totals.total,
    status: status || 'draft',
    issueDate: issueDate || new Date(),
    dueDate,
    notes,
    createdBy: req.user._id,
  });

  await refreshClientBalances(client);
  await logActivity({
    action: 'create',
    module: 'finance',
    entityType: 'Invoice',
    entityId: invoice._id,
    description: `Invoice ${invoiceNumber} created`,
    user: req.user._id,
  });

  const populated = await Invoice.findById(invoice._id)
    .populate('client', 'name')
    .populate('project', 'name projectId');
  res.status(201).json({ success: true, data: populated });
});

export const updateInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.paidAmount > 0 && req.body.items) {
    throw new AppError('Cannot change items on an invoice with payments', 400);
  }

  if (req.body.items) {
    const totals = calculateDocumentTotals({
      items: req.body.items,
      taxRate: req.body.taxRate ?? invoice.taxRate,
      discountAmount: req.body.discountAmount ?? invoice.discountAmount,
      discountPercent: req.body.discountPercent ?? invoice.discountPercent,
    });
    invoice.items = req.body.items.map((item) => ({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discount: item.discount || 0,
      amount: roundMoney(
        Math.max(0, (Number(item.quantity) || 0) * (Number(item.unitPrice) || 0) - (Number(item.discount) || 0))
      ),
    }));
    Object.assign(invoice, totals);
    invoice.remainingBalance = roundMoney(invoice.total - invoice.paidAmount);
  }

  ['client', 'project', 'issueDate', 'dueDate', 'notes', 'status', 'taxRate', 'discountAmount', 'discountPercent']
    .forEach((f) => {
      if (req.body[f] !== undefined) invoice[f] = req.body[f];
    });

  invoice.status = deriveStatus(invoice);
  await invoice.save();
  await refreshClientBalances(invoice.client);
  res.json({ success: true, data: invoice });
});

export const recordPayment = asyncHandler(async (req, res) => {
  const { amount, method, date, reference, notes } = req.body;
  if (amount == null) throw new AppError('Payment amount is required', 400);

  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.status === 'cancelled') throw new AppError('Cannot pay a cancelled invoice', 400);

  const paymentResult = applyPayment({
    total: invoice.total,
    previouslyPaid: invoice.paidAmount,
    paymentAmount: amount,
  });

  const uniqueKey = `inv-pay-${invoice._id}-${invoice.payments.length}-${paymentResult.paymentAmount}-${date || Date.now()}`;
  const dup = await Transaction.findOne({ uniqueKey });
  if (dup) throw new AppError('Duplicate payment prevented', 400);

  const seq = await getNextSequence('transaction');
  const transactionId = formatDocNumber('TXN', seq);

  let txn;
  try {
    txn = await Transaction.create({
      transactionId,
      type: 'income',
      category: 'Invoice Payment',
      amount: paymentResult.paymentAmount,
      paymentMethod: method || 'bank_transfer',
      date: date || new Date(),
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      reference,
      project: invoice.project,
      client: invoice.client,
      invoice: invoice._id,
      uniqueKey,
      createdBy: req.user._id,
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError('Duplicate payment prevented', 400);
    throw err;
  }

  invoice.payments.push({
    amount: paymentResult.paymentAmount,
    method: method || 'bank_transfer',
    date: date || new Date(),
    reference,
    notes,
    transaction: txn._id,
  });
  invoice.paidAmount = paymentResult.paidAmount;
  invoice.remainingBalance = paymentResult.remainingBalance;
  invoice.status = deriveStatus(invoice);
  await invoice.save();

  await refreshClientBalances(invoice.client);
  if (invoice.project) await refreshProjectFinance(invoice.project);

  await logActivity({
    action: 'payment',
    module: 'finance',
    entityType: 'Invoice',
    entityId: invoice._id,
    description: `Payment of ${paymentResult.paymentAmount} recorded for ${invoice.invoiceNumber}`,
    user: req.user._id,
  });

  const populated = await Invoice.findById(invoice._id)
    .populate('client', 'name')
    .populate('project', 'name projectId');
  res.json({ success: true, data: populated });
});

export const deleteInvoice = asyncHandler(async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) throw new AppError('Invoice not found', 404);
  if (invoice.paidAmount > 0) {
    throw new AppError('Cannot delete invoice with payments. Cancel it instead.', 400);
  }
  const clientId = invoice.client;
  await invoice.deleteOne();
  await refreshClientBalances(clientId);
  res.json({ success: true, message: 'Invoice deleted' });
});

export const getReceivables = asyncHandler(async (req, res) => {
  const invoices = await Invoice.find({
    status: { $in: ['sent', 'partial', 'overdue'] },
    remainingBalance: { $gt: 0 },
  })
    .populate('client', 'name phone')
    .populate('project', 'name projectId')
    .sort({ dueDate: 1 });

  const total = roundMoney(invoices.reduce((s, i) => s + i.remainingBalance, 0));
  res.json({ success: true, data: invoices, total });
});
