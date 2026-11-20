import mongoose from 'mongoose';

const stockMovementSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
    type: {
      type: String,
      enum: ['in', 'out', 'adjustment'],
      required: true,
    },
    quantity: { type: Number, required: true, min: 0 },
    previousQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    unitCost: { type: Number, default: 0 },
    reason: { type: String, default: '' },
    reference: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    // Ensures a PO receive line updates stock only once
    uniqueKey: { type: String, sparse: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockMovementSchema.index({ material: 1, createdAt: -1 });

export default mongoose.model('StockMovement', stockMovementSchema);
