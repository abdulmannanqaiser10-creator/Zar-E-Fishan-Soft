import PurchaseRequest from '../models/PurchaseRequest.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Transaction from '../models/Transaction.js';
import Settings from '../models/Settings.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { getNextSequence, formatDocNumber } from '../services/sequenceService.js';
import { adjustStock } from '../services/inventoryService.js';
import {
  applyPayment,
  roundMoney,
  ensureNonNegative,
} from '../utils/calculations.js';
import {
  refreshVendorBalances,
  refreshProjectFinance,
} from '../services/balanceService.js';

/* ---------- Purchase Requests ---------- */

export const getPurchaseRequests = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    PurchaseRequest.find(query)
      .populate('project', 'name projectId')
      .populate('requestedBy', 'name')
      .populate('items.material', 'name sku')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    PurchaseRequest.countDocuments(query),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const createPurchaseRequest = asyncHandler(async (req, res) => {
  const { project, items, priority, notes } = req.body;
  if (!items?.length) throw new AppError('At least one item is required', 400);

  const seq = await getNextSequence('purchaseRequest');
  const requestNumber = formatDocNumber('PR', seq);

  const pr = await PurchaseRequest.create({
    requestNumber,
    project,
    requestedBy: req.user._id,
    items,
    priority: priority || 'Medium',
    notes,
  });

  await logActivity({
    action: 'create',
    module: 'procurement',
    entityType: 'PurchaseRequest',
    entityId: pr._id,
    description: `Purchase request ${requestNumber} created`,
    user: req.user._id,
  });

  const populated = await PurchaseRequest.findById(pr._id)
    .populate('project', 'name')
    .populate('requestedBy', 'name')
    .populate('items.material', 'name sku');
  res.status(201).json({ success: true, data: populated });
});

export const updatePurchaseRequest = asyncHandler(async (req, res) => {
  const pr = await PurchaseRequest.findById(req.params.id);
  if (!pr) throw new AppError('Purchase request not found', 404);
  if (pr.status === 'Converted') throw new AppError('Converted requests cannot be edited', 400);

  if (req.body.status === 'Approved') {
    pr.status = 'Approved';
    pr.approvedBy = req.user._id;
    pr.approvedAt = new Date();
  } else if (req.body.status) {
    pr.status = req.body.status;
  }
  if (req.body.items) pr.items = req.body.items;
  if (req.body.priority) pr.priority = req.body.priority;
  if (req.body.notes !== undefined) pr.notes = req.body.notes;
  if (req.body.project !== undefined) pr.project = req.body.project;

  await pr.save();
  res.json({ success: true, data: pr });
});

export const deletePurchaseRequest = asyncHandler(async (req, res) => {
  const pr = await PurchaseRequest.findById(req.params.id);
  if (!pr) throw new AppError('Purchase request not found', 404);
  if (pr.status === 'Converted') throw new AppError('Cannot delete converted request', 400);
  await pr.deleteOne();
  res.json({ success: true, message: 'Purchase request deleted' });
});

/* ---------- Purchase Orders ---------- */

export const getPurchaseOrders = asyncHandler(async (req, res) => {
  const { status, vendor, search, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (vendor) query.vendor = vendor;
  if (search) query.poNumber = new RegExp(search, 'i');

  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    PurchaseOrder.find(query)
      .populate('vendor', 'name phone')
      .populate('project', 'name projectId')
      .populate('items.material', 'name sku unit')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    PurchaseOrder.countDocuments(query),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getPurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id)
    .populate('vendor')
    .populate('project', 'name projectId')
    .populate('items.material', 'name sku unit costPrice')
    .populate('purchaseRequest');
  if (!po) throw new AppError('Purchase order not found', 404);
  res.json({ success: true, data: po });
});

export const createPurchaseOrder = asyncHandler(async (req, res) => {
  const {
    vendor, project, items, discountAmount, taxRate, notes,
    expectedDate, purchaseRequest, status,
  } = req.body;

  if (!vendor || !items?.length) {
    throw new AppError('Vendor and items are required', 400);
  }

  const mapped = items.map((item) => {
    const qty = ensureNonNegative(item.quantity, 'Quantity');
    const price = ensureNonNegative(item.unitPrice, 'Unit price');
    const itemTax = Number(item.taxRate) || 0;
    const line = roundMoney(qty * price);
    const tax = roundMoney((line * itemTax) / 100);
    return {
      material: item.material,
      quantity: qty,
      unitPrice: price,
      taxRate: itemTax,
      amount: roundMoney(line + tax),
      receivedQuantity: 0,
    };
  });

  const settings = (await Settings.findOne()) || { poPrefix: 'PO', taxRate: 0 };

  // Prefer document-level tax when provided; otherwise sum item-level tax
  const itemTaxSum = roundMoney(mapped.reduce((s, i) => s + (i.amount - i.quantity * i.unitPrice), 0));
  const subtotal = roundMoney(mapped.reduce((s, i) => s + i.quantity * i.unitPrice, 0));
  const discount = Math.min(discountAmount || 0, subtotal);
  const taxAmount = taxRate != null && taxRate > 0
    ? roundMoney(((subtotal - discount) * taxRate) / 100)
    : itemTaxSum;
  const total = roundMoney(subtotal - discount + taxAmount);

  const seq = await getNextSequence('purchaseOrder');
  const poNumber = formatDocNumber(settings.poPrefix || 'PO', seq);

  const po = await PurchaseOrder.create({
    poNumber,
    purchaseRequest,
    vendor,
    project,
    items: mapped,
    subtotal,
    taxAmount,
    discountAmount: discount,
    total,
    paidAmount: 0,
    remainingBalance: total,
    status: status || 'Pending',
    expectedDate,
    notes,
    createdBy: req.user._id,
  });

  if (purchaseRequest) {
    await PurchaseRequest.findByIdAndUpdate(purchaseRequest, { status: 'Converted' });
  }

  await refreshVendorBalances(vendor);
  await logActivity({
    action: 'create',
    module: 'procurement',
    entityType: 'PurchaseOrder',
    entityId: po._id,
    description: `Purchase order ${poNumber} created`,
    user: req.user._id,
  });

  const populated = await PurchaseOrder.findById(po._id)
    .populate('vendor', 'name')
    .populate('items.material', 'name sku');
  res.status(201).json({ success: true, data: populated });
});

export const updatePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError('Purchase order not found', 404);
  if (po.status === 'Received' || po.status === 'Cancelled') {
    throw new AppError(`Cannot edit a ${po.status} purchase order`, 400);
  }

  if (req.body.status) {
    const allowed = ['Pending', 'Approved', 'Ordered', 'Cancelled'];
    if (!allowed.includes(req.body.status) && req.body.status !== 'Received') {
      throw new AppError('Invalid status', 400);
    }
    if (req.body.status === 'Received') {
      throw new AppError('Use the receive endpoint to mark as received', 400);
    }
    if (req.body.status === 'Cancelled' && po.inventoryUpdated) {
      throw new AppError('Cannot cancel after inventory has been updated', 400);
    }
    po.status = req.body.status;
  }
  if (req.body.notes !== undefined) po.notes = req.body.notes;
  if (req.body.expectedDate) po.expectedDate = req.body.expectedDate;

  await po.save();
  await refreshVendorBalances(po.vendor);
  res.json({ success: true, data: po });
});

/**
 * Receive PO — updates inventory exactly once (idempotent via inventoryUpdated + uniqueKey)
 * and records procurement expense once. Compatible with standalone MongoDB.
 */
export const receivePurchaseOrder = asyncHandler(async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError('Purchase order not found', 404);
  if (po.status === 'Cancelled') throw new AppError('Cannot receive a cancelled PO', 400);
  if (po.inventoryUpdated || po.status === 'Received') {
    throw new AppError('This purchase order has already been received', 400);
  }

  for (const item of po.items) {
    const uniqueKey = `po-receive-${po._id}-${item._id}`;
    await adjustStock({
      materialId: item.material,
      type: 'in',
      quantity: item.quantity,
      unitCost: item.unitPrice,
      reason: `Received from PO ${po.poNumber}`,
      reference: po.poNumber,
      project: po.project,
      purchaseOrder: po._id,
      uniqueKey,
      userId: req.user._id,
    });
    item.receivedQuantity = item.quantity;
  }

  po.status = 'Received';
  po.receivedDate = new Date();
  po.inventoryUpdated = true;

  if (!po.expenseRecorded) {
    const uniqueKey = `po-expense-${po._id}`;
    const existing = await Transaction.findOne({ uniqueKey });
    if (!existing) {
      const seq = await getNextSequence('transaction');
      try {
        await Transaction.create({
          transactionId: formatDocNumber('TXN', seq),
          type: 'expense',
          category: 'Procurement',
          amount: po.total,
          paymentMethod: 'other',
          date: new Date(),
          description: `Procurement expense for ${po.poNumber}`,
          reference: po.poNumber,
          project: po.project,
          vendor: po.vendor,
          purchaseOrder: po._id,
          uniqueKey,
          createdBy: req.user._id,
        });
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
    po.expenseRecorded = true;
  }

  await po.save();

  await refreshVendorBalances(po.vendor);
  if (po.project) await refreshProjectFinance(po.project);

  await logActivity({
    action: 'receive',
    module: 'procurement',
    entityType: 'PurchaseOrder',
    entityId: po._id,
    description: `PO ${po.poNumber} received; inventory updated`,
    user: req.user._id,
  });

  const populated = await PurchaseOrder.findById(po._id)
    .populate('vendor', 'name')
    .populate('items.material', 'name sku');
  res.json({ success: true, data: populated });
});

export const recordVendorPayment = asyncHandler(async (req, res) => {
  const { amount, method, date, reference, notes } = req.body;
  if (amount == null) throw new AppError('Payment amount is required', 400);

  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) throw new AppError('Purchase order not found', 404);

  const paymentResult = applyPayment({
    total: po.total,
    previouslyPaid: po.paidAmount,
    paymentAmount: amount,
  });

  const uniqueKey = `po-pay-${po._id}-${po.paidAmount}-${paymentResult.paymentAmount}-${date || Date.now()}`;
  const dup = await Transaction.findOne({ uniqueKey });
  if (dup) throw new AppError('Duplicate payment prevented', 400);

  const seq = await getNextSequence('transaction');
  try {
    await Transaction.create({
      transactionId: formatDocNumber('TXN', seq),
      type: 'expense',
      category: 'Vendor Payment',
      amount: paymentResult.paymentAmount,
      paymentMethod: method || 'bank_transfer',
      date: date || new Date(),
      description: notes || `Vendor payment for ${po.poNumber}`,
      reference,
      project: po.project,
      vendor: po.vendor,
      purchaseOrder: po._id,
      uniqueKey,
      createdBy: req.user._id,
    });
  } catch (err) {
    if (err.code === 11000) throw new AppError('Duplicate payment prevented', 400);
    throw err;
  }

  po.paidAmount = paymentResult.paidAmount;
  po.remainingBalance = paymentResult.remainingBalance;
  await po.save();

  await refreshVendorBalances(po.vendor);
  if (po.project) await refreshProjectFinance(po.project);

  res.json({ success: true, data: po });
});

export const getPayables = asyncHandler(async (req, res) => {
  const orders = await PurchaseOrder.find({
    status: { $ne: 'Cancelled' },
    remainingBalance: { $gt: 0 },
  })
    .populate('vendor', 'name phone')
    .populate('project', 'name projectId')
    .sort({ orderDate: 1 });

  const total = roundMoney(orders.reduce((s, o) => s + o.remainingBalance, 0));
  res.json({ success: true, data: orders, total });
});
