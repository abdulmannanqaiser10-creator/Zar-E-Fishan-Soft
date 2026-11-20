import Material from '../models/Material.js';
import StockMovement from '../models/StockMovement.js';
import AppError from '../utils/AppError.js';
import { ensureNonNegative, roundMoney } from '../utils/calculations.js';

const withSession = (query, session) => (session ? query.session(session) : query);

/**
 * Adjust stock. Prevents negative stock.
 * uniqueKey optional — used to idempotently apply PO receive updates.
 * Works on standalone MongoDB (no replica set) without multi-doc transactions.
 */
export const adjustStock = async ({
  materialId,
  type,
  quantity,
  unitCost,
  reason,
  reference,
  project,
  purchaseOrder,
  uniqueKey,
  userId,
  session = null,
}) => {
  const qty = ensureNonNegative(quantity, 'Quantity');
  if (qty === 0 && type !== 'adjustment') {
    throw new AppError('Quantity must be greater than zero', 400);
  }

  if (uniqueKey) {
    const existing = await withSession(StockMovement.findOne({ uniqueKey }), session);
    if (existing) return { movement: existing, skipped: true };
  }

  const material = await withSession(Material.findById(materialId), session);
  if (!material) throw new AppError('Material not found', 404);

  const previousQuantity = material.quantity;
  let newQuantity = previousQuantity;

  if (type === 'in') {
    newQuantity = roundMoney(previousQuantity + qty);
    if (unitCost != null && unitCost >= 0) {
      const totalValue =
        previousQuantity * (material.costPrice || 0) + qty * unitCost;
      material.costPrice =
        newQuantity > 0 ? roundMoney(totalValue / newQuantity) : unitCost;
    }
  } else if (type === 'out') {
    if (previousQuantity < qty) {
      throw new AppError(
        `Insufficient stock for ${material.name}. Available: ${previousQuantity}`,
        400
      );
    }
    newQuantity = roundMoney(previousQuantity - qty);
  } else if (type === 'adjustment') {
    newQuantity = ensureNonNegative(qty, 'Adjusted quantity');
  } else {
    throw new AppError('Invalid stock movement type', 400);
  }

  material.quantity = newQuantity;
  await material.save(session ? { session } : undefined);

  const movementPayload = {
    material: materialId,
    type,
    quantity: type === 'adjustment' ? Math.abs(newQuantity - previousQuantity) : qty,
    previousQuantity,
    newQuantity,
    unitCost: unitCost ?? material.costPrice,
    reason,
    reference,
    project,
    purchaseOrder,
    uniqueKey,
    createdBy: userId,
  };

  let movement;
  try {
    if (session) {
      [movement] = await StockMovement.create([movementPayload], { session });
    } else {
      movement = await StockMovement.create(movementPayload);
    }
  } catch (err) {
    if (err.code === 11000 && uniqueKey) {
      const existing = await StockMovement.findOne({ uniqueKey });
      return { movement: existing, skipped: true };
    }
    throw err;
  }

  return { material, movement, skipped: false };
};
