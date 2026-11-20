import Vendor from '../models/Vendor.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { refreshVendorBalances } from '../services/balanceService.js';

export const getVendors = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20, active } = req.query;
  const query = {};
  if (active === 'true') query.isActive = true;
  if (active === 'false') query.isActive = false;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Vendor.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Vendor.countDocuments(query),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw new AppError('Vendor not found', 404);

  await refreshVendorBalances(vendor._id);
  const refreshed = await Vendor.findById(vendor._id);

  const [orders, payments] = await Promise.all([
    PurchaseOrder.find({ vendor: vendor._id }).sort({ createdAt: -1 }).populate('items.material', 'name sku'),
    Transaction.find({ vendor: vendor._id, type: 'expense' }).sort({ date: -1 }),
  ]);

  res.json({
    success: true,
    data: { ...refreshed.toObject(), purchaseHistory: orders, paymentHistory: payments },
  });
});

export const createVendor = asyncHandler(async (req, res) => {
  const { name, contactPerson, phone, email, address, category, notes } = req.body;
  if (!name || !phone) throw new AppError('Name and phone are required', 400);

  const vendor = await Vendor.create({
    name, contactPerson, phone, email, address, category, notes,
    createdBy: req.user._id,
  });

  await logActivity({
    action: 'create',
    module: 'vendors',
    entityType: 'Vendor',
    entityId: vendor._id,
    description: `Vendor ${vendor.name} created`,
    user: req.user._id,
  });

  res.status(201).json({ success: true, data: vendor });
});

export const updateVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw new AppError('Vendor not found', 404);

  ['name', 'contactPerson', 'phone', 'email', 'address', 'category', 'notes', 'isActive']
    .forEach((f) => {
      if (req.body[f] !== undefined) vendor[f] = req.body[f];
    });
  await vendor.save();
  res.json({ success: true, data: vendor });
});

export const deleteVendor = asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) throw new AppError('Vendor not found', 404);

  const poCount = await PurchaseOrder.countDocuments({ vendor: vendor._id });
  if (poCount > 0) {
    throw new AppError('Cannot delete vendor with purchase history. Deactivate instead.', 400);
  }
  await vendor.deleteOne();
  res.json({ success: true, message: 'Vendor deleted' });
});
