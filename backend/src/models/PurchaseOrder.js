import mongoose from 'mongoose';

const poItemSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
    quantity: { type: Number, required: true, min: 0 },
    unitPrice: { type: Number, required: true, min: 0 },
    taxRate: { type: Number, default: 0, min: 0 },
    amount: { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, default: 0, min: 0 },
  },
  { _id: true }
);

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber: { type: String, unique: true, required: true },
    purchaseRequest: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseRequest' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    items: { type: [poItemSchema], required: true },
    subtotal: { type: Number, required: true, min: 0 },
    taxAmount: { type: Number, default: 0, min: 0 },
    discountAmount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    paidAmount: { type: Number, default: 0, min: 0 },
    remainingBalance: { type: Number, default: 0, min: 0 },
    status: {
      type: String,
      enum: ['Pending', 'Approved', 'Ordered', 'Received', 'Cancelled'],
      default: 'Pending',
    },
    orderDate: { type: Date, default: Date.now },
    expectedDate: { type: Date },
    receivedDate: { type: Date },
    notes: { type: String, default: '' },
    inventoryUpdated: { type: Boolean, default: false },
    expenseRecorded: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('PurchaseOrder', purchaseOrderSchema);
