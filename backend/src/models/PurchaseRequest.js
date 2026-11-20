import mongoose from 'mongoose';

const prItemSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material' },
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 0 },
    estimatedUnitPrice: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const purchaseRequestSchema = new mongoose.Schema(
  {
    requestNumber: { type: String, unique: true, required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: { type: [prItemSchema], required: true },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Rejected', 'Converted'],
      default: 'Pending',
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Medium',
    },
    notes: { type: String, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.model('PurchaseRequest', purchaseRequestSchema);
