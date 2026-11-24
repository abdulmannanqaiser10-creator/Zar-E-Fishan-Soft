import mongoose from 'mongoose';

const ledgerEntrySchema = new mongoose.Schema(
  {
    entryNumber: { type: String, unique: true, required: true },
    date: { type: Date, default: Date.now, required: true },
    type: {
      type: String,
      enum: ['debit', 'credit'],
      required: true,
    },
    category: { type: String, required: true },
    description: { type: String, default: '' },
    amount: { type: Number, required: true, min: 0 },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'Client' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    reference: { type: String, default: '' },
    uniqueKey: { type: String, sparse: true, unique: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ledgerEntrySchema.index({ date: -1, category: 1 });

export default mongoose.model('LedgerEntry', ledgerEntrySchema);
