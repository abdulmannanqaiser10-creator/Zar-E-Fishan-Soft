import Client from '../models/Client.js';
import Vendor from '../models/Vendor.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Transaction from '../models/Transaction.js';
import { roundMoney } from '../utils/calculations.js';

export const refreshClientBalances = async (clientId, session = null) => {
  const opts = session ? { session } : {};
  const invoices = await Invoice.find(
    { client: clientId, status: { $ne: 'cancelled' } },
    null,
    opts
  );
  const totalProjectValue = roundMoney(
    invoices.reduce((s, inv) => s + (inv.total || 0), 0)
  );
  const totalPaid = roundMoney(
    invoices.reduce((s, inv) => s + (inv.paidAmount || 0), 0)
  );
  const totalPending = roundMoney(
    invoices.reduce((s, inv) => s + (inv.remainingBalance || 0), 0)
  );

  await Client.findByIdAndUpdate(
    clientId,
    { totalProjectValue, totalPaid, totalPending },
    opts
  );
  return { totalProjectValue, totalPaid, totalPending };
};

export const refreshVendorBalances = async (vendorId, session = null) => {
  const opts = session ? { session } : {};
  const orders = await PurchaseOrder.find(
    { vendor: vendorId, status: { $ne: 'Cancelled' } },
    null,
    opts
  );
  const totalPurchases = roundMoney(orders.reduce((s, o) => s + (o.total || 0), 0));
  const totalPaid = roundMoney(orders.reduce((s, o) => s + (o.paidAmount || 0), 0));
  const totalOutstanding = roundMoney(
    orders.reduce((s, o) => s + (o.remainingBalance || 0), 0)
  );

  await Vendor.findByIdAndUpdate(
    vendorId,
    { totalPurchases, totalPaid, totalOutstanding },
    opts
  );
  return { totalPurchases, totalPaid, totalOutstanding };
};

export const refreshProjectFinance = async (projectId, session = null) => {
  if (!projectId) return null;
  const opts = session ? { session } : {};
  const mongoose = (await import('mongoose')).default;
  const pid =
    projectId instanceof mongoose.Types.ObjectId
      ? projectId
      : new mongoose.Types.ObjectId(String(projectId));
  const [income, expense] = await Promise.all([
    Transaction.aggregate([
      { $match: { project: pid, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).session(session || null),
    Transaction.aggregate([
      { $match: { project: pid, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]).session(session || null),
  ]);

  const totalRevenue = roundMoney(income[0]?.total || 0);
  const totalExpenses = roundMoney(expense[0]?.total || 0);

  await Project.findByIdAndUpdate(
    projectId,
    { totalRevenue, totalExpenses },
    opts
  );
  return { totalRevenue, totalExpenses };
};
