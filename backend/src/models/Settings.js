import mongoose from 'mongoose';

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: 'Zar-E-Fishan' },
    logo: { type: String, default: '' },
    email: { type: String, default: '' },
    phone: { type: String, default: '' },
    address: { type: String, default: '' },
    website: { type: String, default: '' },
    currency: { type: String, default: 'PKR' },
    currencySymbol: { type: String, default: 'Rs' },
    taxRate: { type: Number, default: 0, min: 0 },
    taxLabel: { type: String, default: 'Tax' },
    invoicePrefix: { type: String, default: 'INV' },
    invoiceFooter: { type: String, default: 'Thank you for your business.' },
    poPrefix: { type: String, default: 'PO' },
    projectPrefix: { type: String, default: 'ZEF' },
    fiscalYearStart: { type: Number, default: 1 },
    dateFormat: { type: String, default: 'DD/MM/YYYY' },
    lowStockAlert: { type: Boolean, default: true },
    backupEnabled: { type: Boolean, default: false },
    theme: {
      primary: { type: String, default: '#3F4932' },
      accent: { type: String, default: '#C5A675' },
      background: { type: String, default: '#F8F5ED' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Settings', settingsSchema);
