import mongoose from 'mongoose';

const generalExpenseSchema = new mongoose.Schema(
  {
    expenseNumber: { type: String, unique: true, required: true },
    title: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['utilities', 'rent', 'salaries', 'bills', 'transport', 'marketing', 'maintenance', 'other'],
      default: 'other',
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['cash', 'card', 'bank_transfer', 'cheque', 'online', 'other'],
      default: 'cash',
    },
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor' },
    notes: { type: String, default: '' },
    receiptUrl: { type: String, default: '' },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('GeneralExpense', generalExpenseSchema);
