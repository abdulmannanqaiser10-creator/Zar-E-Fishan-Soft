import mongoose from 'mongoose';

const followUpSchema = new mongoose.Schema(
  {
    date: { type: Date, default: Date.now },
    note: { type: String, required: true },
    nextFollowUp: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: '' },
    address: { type: String, default: '' },
    city: { type: String, default: '' },
    notes: { type: String, default: '' },
    crmStatus: {
      type: String,
      enum: ['Lead', 'Follow-up', 'Closed', 'Client'],
      default: 'Client',
    },
    source: { type: String, default: '' },
    followUps: [followUpSchema],
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
