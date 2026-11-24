import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
  },
  { _id: false }
);

const salesReturnSchema = new mongoose.Schema(
  {
    returnNumber: { type: String, unique: true, required: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client', required: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    items: { type: [itemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true, min: 0 },
    reason: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'approved', 'refunded', 'cancelled'],
      default: 'pending',
    },
    refundMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other'],
      default: 'cash',
    },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    date: { type: Date, default: Date.now },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('SalesReturn', salesReturnSchema);
