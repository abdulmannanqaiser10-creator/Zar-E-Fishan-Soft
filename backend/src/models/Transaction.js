import mongoose from 'mongoose';

const transactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, required: true },
    type: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
    },
    amount: { type: Number, required: true, min: 0 },
    paymentMethod: {
      type: String,
      enum: ['cash', 'bank_transfer', 'cheque', 'card', 'online', 'other'],
      default: 'bank_transfer',
    },
    date: { type: Date, required: true, default: Date.now },
    description: { type: String, default: '' },
    reference: { type: String, default: '' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    // Prevent duplicate linked payments
    uniqueKey: { type: String, sparse: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

transactionSchema.index({ date: -1, type: 1 });
transactionSchema.index({ project: 1 });
transactionSchema.index({ client: 1 });
transactionSchema.index({ vendor: 1 });

export default mongoose.model('Transaction', transactionSchema);
