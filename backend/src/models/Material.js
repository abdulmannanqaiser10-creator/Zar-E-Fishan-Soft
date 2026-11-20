import mongoose from 'mongoose';

const materialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sku: { type: String, required: true, unique: true, trim: true, uppercase: true },
    category: { type: String, required: true, trim: true },
    quantity: { type: Number, required: true, default: 0, min: 0 },
    unit: { type: String, required: true, default: 'pcs' },
    costPrice: { type: Number, required: true, min: 0 },
    sellingPrice: { type: Number, default: 0, min: 0 },
    reorderLevel: { type: Number, default: 10, min: 0 },
    description: { type: String, default: '' },
    location: { type: String, default: '' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

materialSchema.virtual('stockValue').get(function stockValue() {
  return (this.quantity || 0) * (this.costPrice || 0);
});

materialSchema.virtual('isLowStock').get(function isLowStock() {
  return (this.quantity || 0) <= (this.reorderLevel || 0);
});

materialSchema.set('toJSON', { virtuals: true });
materialSchema.set('toObject', { virtuals: true });

materialSchema.index({ name: 'text', sku: 'text', category: 'text' });

export default mongoose.model('Material', materialSchema);
