import Project from '../models/Project.js';
import Client from '../models/Client.js';
import Transaction from '../models/Transaction.js';
import Material from '../models/Material.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Vendor from '../models/Vendor.js';
import Invoice from '../models/Invoice.js';
import asyncHandler from '../utils/asyncHandler.js';
import {
  calculateProfit,
  calculateInventoryValue,
  roundMoney,
} from '../utils/calculations.js';

const dateMatch = (startDate, endDate, field = 'date') => {
  if (!startDate && !endDate) return {};
  const range = {};
  if (startDate) range.$gte = new Date(startDate);
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    range.$lte = end;
  }
  return { [field]: range };
};

export const projectReport = asyncHandler(async (req, res) => {
  const { status, startDate, endDate } = req.query;
  const query = { ...dateMatch(startDate, endDate, 'startDate') };
  if (status) query.status = status;

  const projects = await Project.find(query)
    .populate('client', 'name phone')
    .sort({ startDate: -1 });

  const summary = {
    count: projects.length,
    totalBudget: roundMoney(projects.reduce((s, p) => s + (p.budget || 0), 0)),
    totalRevenue: roundMoney(projects.reduce((s, p) => s + (p.totalRevenue || 0), 0)),
    totalExpenses: roundMoney(projects.reduce((s, p) => s + (p.totalExpenses || 0), 0)),
  };
  summary.profit = calculateProfit(summary.totalRevenue, summary.totalExpenses);

  res.json({ success: true, data: projects, summary });
});

export const clientReport = asyncHandler(async (req, res) => {
  const clients = await Client.find().sort({ totalProjectValue: -1 });
  const summary = {
    count: clients.length,
    totalValue: roundMoney(clients.reduce((s, c) => s + (c.totalProjectValue || 0), 0)),
    totalPaid: roundMoney(clients.reduce((s, c) => s + (c.totalPaid || 0), 0)),
    totalPending: roundMoney(clients.reduce((s, c) => s + (c.totalPending || 0), 0)),
  };
  res.json({ success: true, data: clients, summary });
});

export const financeReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, type } = req.query;
  const match = { ...dateMatch(startDate, endDate) };
  if (type) match.type = type;

  const transactions = await Transaction.find(match)
    .populate('client', 'name')
    .populate('vendor', 'name')
    .populate('project', 'name projectId')
    .sort({ date: -1 });

  const income = roundMoney(
    transactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  );
  const expenses = roundMoney(
    transactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  );

  const byCategory = {};
  transactions.forEach((t) => {
    const key = `${t.type}:${t.category}`;
    byCategory[key] = (byCategory[key] || 0) + t.amount;
  });

  // Monthly for charts
  const year = startDate ? new Date(startDate).getFullYear() : new Date().getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59);
  const monthly = await Transaction.aggregate([
    { $match: { date: { $gte: yearStart, $lte: yearEnd } } },
    {
      $group: {
        _id: { month: { $month: '$date' }, type: '$type' },
        total: { $sum: '$amount' },
      },
    },
  ]);

  const monthlyChart = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month,
      label: new Date(2000, i, 1).toLocaleString('en', { month: 'short' }),
      revenue: roundMoney(
        monthly.find((m) => m._id.month === month && m._id.type === 'income')?.total || 0
      ),
      expenses: roundMoney(
        monthly.find((m) => m._id.month === month && m._id.type === 'expense')?.total || 0
      ),
    };
  });

  res.json({
    success: true,
    data: transactions,
    summary: {
      income,
      expenses,
      profit: calculateProfit(income, expenses),
      byCategory,
    },
    monthlyChart,
  });
});

export const profitLossReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const match = { ...dateMatch(startDate, endDate) };

  const byCategory = await Transaction.aggregate([
    { $match: match },
    {
      $group: {
        _id: { type: '$type', category: '$category' },
        total: { $sum: '$amount' },
      },
    },
    { $sort: { '_id.type': 1, total: -1 } },
  ]);

  const income = roundMoney(
    byCategory.filter((c) => c._id.type === 'income').reduce((s, c) => s + c.total, 0)
  );
  const expenses = roundMoney(
    byCategory.filter((c) => c._id.type === 'expense').reduce((s, c) => s + c.total, 0)
  );

  res.json({
    success: true,
    data: {
      incomeItems: byCategory.filter((c) => c._id.type === 'income'),
      expenseItems: byCategory.filter((c) => c._id.type === 'expense'),
      income,
      expenses,
      profit: calculateProfit(income, expenses),
    },
  });
});

export const inventoryReport = asyncHandler(async (req, res) => {
  const materials = await Material.find({ isActive: true }).sort({ category: 1, name: 1 });
  const valuation = calculateInventoryValue(materials);
  const lowStock = materials.filter((m) => m.quantity <= m.reorderLevel);

  res.json({
    success: true,
    data: materials,
    summary: {
      count: materials.length,
      valuation,
      lowStockCount: lowStock.length,
      lowStock,
    },
  });
});

export const procurementReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;
  const query = { ...dateMatch(startDate, endDate, 'orderDate') };
  if (status) query.status = status;

  const orders = await PurchaseOrder.find(query)
    .populate('vendor', 'name')
    .populate('project', 'name')
    .sort({ orderDate: -1 });

  const summary = {
    count: orders.length,
    total: roundMoney(orders.reduce((s, o) => s + (o.total || 0), 0)),
    paid: roundMoney(orders.reduce((s, o) => s + (o.paidAmount || 0), 0)),
    outstanding: roundMoney(orders.reduce((s, o) => s + (o.remainingBalance || 0), 0)),
  };

  res.json({ success: true, data: orders, summary });
});

export const vendorReport = asyncHandler(async (req, res) => {
  const vendors = await Vendor.find().sort({ totalPurchases: -1 });
  const summary = {
    count: vendors.length,
    totalPurchases: roundMoney(vendors.reduce((s, v) => s + (v.totalPurchases || 0), 0)),
    totalPaid: roundMoney(vendors.reduce((s, v) => s + (v.totalPaid || 0), 0)),
    totalOutstanding: roundMoney(vendors.reduce((s, v) => s + (v.totalOutstanding || 0), 0)),
  };
  res.json({ success: true, data: vendors, summary });
});

export const invoiceReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, status } = req.query;
  const query = { ...dateMatch(startDate, endDate, 'issueDate') };
  if (status) query.status = status;

  const invoices = await Invoice.find(query)
    .populate('client', 'name')
    .populate('project', 'name')
    .sort({ issueDate: -1 });

  res.json({
    success: true,
    data: invoices,
    summary: {
      count: invoices.length,
      total: roundMoney(invoices.reduce((s, i) => s + i.total, 0)),
      paid: roundMoney(invoices.reduce((s, i) => s + i.paidAmount, 0)),
      remaining: roundMoney(invoices.reduce((s, i) => s + i.remainingBalance, 0)),
    },
  });
});
