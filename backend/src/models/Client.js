import mongoose from 'mongoose';

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    notes: { type: String, default: '' },
    totalProjectValue: { type: Number, default: 0 },
    totalPaid: { type: Number, default: 0 },
    totalPending: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

clientSchema.index({ name: 'text', email: 'text', phone: 'text' });

export default mongoose.model('Client', clientSchema);
