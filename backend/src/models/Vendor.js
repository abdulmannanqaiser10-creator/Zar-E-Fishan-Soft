import mongoose from 'mongoose';

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactPerson: { type: String, default: '' },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, default: '' },
    category: { type: String, default: 'General' },
    notes: { type: String, default: '' },
    totalPurchases: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalOutstanding: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

vendorSchema.index({ name: 'text', email: 'text', phone: 'text' });

export default mongoose.model('Vendor', vendorSchema);
