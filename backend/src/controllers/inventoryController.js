import Material from '../models/Material.js';
import StockMovement from '../models/StockMovement.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { adjustStock } from '../services/inventoryService.js';
import { calculateInventoryValue, ensureNonNegative } from '../utils/calculations.js';

export const getMaterials = asyncHandler(async (req, res) => {
  const { search, category, lowStock, page = 1, limit = 20 } = req.query;
  const query = { isActive: { $ne: false } };
  if (req.query.active === 'false') query.isActive = false;
  if (category) query.category = category;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { sku: new RegExp(search, 'i') },
      { category: new RegExp(search, 'i') },
    ];
  }

  let materials = await Material.find(query).sort({ name: 1 });
  if (lowStock === 'true') {
    materials = materials.filter((m) => m.quantity <= m.reorderLevel);
  }

  const total = materials.length;
  const skip = (Number(page) - 1) * Number(limit);
  const data = materials.slice(skip, skip + Number(limit));
  const valuation = calculateInventoryValue(materials);

  res.json({
    success: true,
    data,
    valuation,
    lowStockCount: materials.filter((m) => m.quantity <= m.reorderLevel).length,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) throw new AppError('Material not found', 404);
  const movements = await StockMovement.find({ material: material._id })
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('project', 'name projectId')
    .populate('createdBy', 'name');
  res.json({ success: true, data: { ...material.toObject(), movements } });
});

export const createMaterial = asyncHandler(async (req, res) => {
  const {
    name, sku, category, quantity, unit, costPrice, sellingPrice,
    reorderLevel, description, location,
  } = req.body;
  if (!name || !sku || !category || costPrice == null) {
    throw new AppError('Name, SKU, category and cost price are required', 400);
  }

  const openingQty = ensureNonNegative(quantity || 0, 'Quantity');
  const material = await Material.create({
    name,
    sku: String(sku).toUpperCase(),
    category,
    quantity: 0,
    unit: unit || 'pcs',
    costPrice: ensureNonNegative(costPrice, 'Cost price'),
    sellingPrice: ensureNonNegative(sellingPrice || 0, 'Selling price'),
    reorderLevel: ensureNonNegative(reorderLevel ?? 10, 'Reorder level'),
    description,
    location,
    createdBy: req.user._id,
  });

  if (openingQty > 0) {
    await adjustStock({
      materialId: material._id,
      type: 'in',
      quantity: openingQty,
      unitCost: material.costPrice,
      reason: 'Initial stock',
      reference: 'OPENING',
      uniqueKey: `opening-${material._id}`,
      userId: req.user._id,
    });
  }

  const refreshed = await Material.findById(material._id);

  await logActivity({
    action: 'create',
    module: 'inventory',
    entityType: 'Material',
    entityId: material._id,
    description: `Material ${material.name} (${material.sku}) created`,
    user: req.user._id,
  });

  res.status(201).json({ success: true, data: refreshed || material });
});

export const updateMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) throw new AppError('Material not found', 404);

  ['name', 'category', 'unit', 'description', 'location', 'isActive'].forEach((f) => {
    if (req.body[f] !== undefined) material[f] = req.body[f];
  });
  if (req.body.sku) material.sku = String(req.body.sku).toUpperCase();
  if (req.body.costPrice != null) material.costPrice = ensureNonNegative(req.body.costPrice, 'Cost price');
  if (req.body.sellingPrice != null) material.sellingPrice = ensureNonNegative(req.body.sellingPrice, 'Selling price');
  if (req.body.reorderLevel != null) material.reorderLevel = ensureNonNegative(req.body.reorderLevel, 'Reorder level');
  // Quantity changes must go through stock movements
  await material.save();
  res.json({ success: true, data: material });
});

export const deleteMaterial = asyncHandler(async (req, res) => {
  const material = await Material.findById(req.params.id);
  if (!material) throw new AppError('Material not found', 404);
  if (material.quantity > 0) {
    throw new AppError('Cannot delete material with remaining stock. Adjust to zero first.', 400);
  }
  material.isActive = false;
  await material.save();
  res.json({ success: true, message: 'Material deactivated' });
});

export const stockIn = asyncHandler(async (req, res) => {
  const { quantity, unitCost, reason, reference, project } = req.body;
  const result = await adjustStock({
    materialId: req.params.id,
    type: 'in',
    quantity,
    unitCost,
    reason: reason || 'Stock in',
    reference,
    project,
    userId: req.user._id,
  });
  res.json({ success: true, data: result });
});

export const stockOut = asyncHandler(async (req, res) => {
  const { quantity, reason, reference, project } = req.body;
  const result = await adjustStock({
    materialId: req.params.id,
    type: 'out',
    quantity,
    reason: reason || 'Stock out',
    reference,
    project,
    userId: req.user._id,
  });
  res.json({ success: true, data: result });
});

export const getMovements = asyncHandler(async (req, res) => {
  const { material, type, page = 1, limit = 50 } = req.query;
  const query = {};
  if (material) query.material = material;
  if (type) query.type = type;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    StockMovement.find(query)
      .populate('material', 'name sku unit')
      .populate('project', 'name projectId')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    StockMovement.countDocuments(query),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getCategories = asyncHandler(async (req, res) => {
  const categories = await Material.distinct('category');
  res.json({ success: true, data: categories.filter(Boolean) });
});
