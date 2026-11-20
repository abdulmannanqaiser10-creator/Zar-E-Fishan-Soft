import Project from '../models/Project.js';
import Client from '../models/Client.js';
import Transaction from '../models/Transaction.js';
import Invoice from '../models/Invoice.js';
import PurchaseOrder from '../models/PurchaseOrder.js';
import Material from '../models/Material.js';
import Activity from '../models/Activity.js';
import asyncHandler from '../utils/asyncHandler.js';
import { calculateProfit, roundMoney } from '../utils/calculations.js';

export const getDashboard = asyncHandler(async (req, res) => {
  const now = new Date();
  const yearStart = new Date(now.getFullYear(), 0, 1);

  const [
    totalProjects,
    activeProjects,
    completedProjects,
    totalClients,
    incomeAgg,
    expenseAgg,
    recentProjects,
    recentTransactions,
    recentActivities,
    statusOverview,
    monthlyIncome,
    monthlyExpense,
    pendingInvoices,
    outstandingPOs,
    lowStockMaterials,
  ] = await Promise.all([
    Project.countDocuments(),
    Project.countDocuments({ status: { $in: ['Planning', 'In Progress'] } }),
    Project.countDocuments({ status: 'Completed' }),
    Client.countDocuments({ isActive: true }),
    Transaction.aggregate([
      { $match: { type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
    Project.find()
      .populate('client', 'name')
      .sort({ updatedAt: -1 })
      .limit(5),
    Transaction.find()
      .populate('client', 'name')
      .populate('vendor', 'name')
      .populate('project', 'name')
      .sort({ date: -1 })
      .limit(8),
    Activity.find()
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(10),
    Project.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Transaction.aggregate([
      { $match: { type: 'income', date: { $gte: yearStart } } },
      {
        $group: {
          _id: { month: { $month: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]),
    Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: yearStart } } },
      {
        $group: {
          _id: { month: { $month: '$date' } },
          total: { $sum: '$amount' },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]),
    Invoice.aggregate([
      {
        $match: {
          status: { $in: ['sent', 'partial', 'overdue'] },
          remainingBalance: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$remainingBalance' },
          count: { $sum: 1 },
        },
      },
    ]),
    PurchaseOrder.aggregate([
      {
        $match: {
          status: { $ne: 'Cancelled' },
          remainingBalance: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$remainingBalance' },
          count: { $sum: 1 },
        },
      },
    ]),
    Material.find({ isActive: true }).then((mats) =>
      mats.filter((m) => m.quantity <= m.reorderLevel).slice(0, 5)
    ),
  ]);

  const revenue = roundMoney(incomeAgg[0]?.total || 0);
  const expenses = roundMoney(expenseAgg[0]?.total || 0);

  const months = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    return {
      month,
      label: new Date(2000, i, 1).toLocaleString('en', { month: 'short' }),
      revenue: roundMoney(
        monthlyIncome.find((m) => m._id.month === month)?.total || 0
      ),
      expenses: roundMoney(
        monthlyExpense.find((m) => m._id.month === month)?.total || 0
      ),
    };
  });

  res.json({
    success: true,
    data: {
      stats: {
        totalProjects,
        activeProjects,
        completedProjects,
        totalClients,
        revenue,
        expenses,
        profit: calculateProfit(revenue, expenses),
        pendingPayments: roundMoney(pendingInvoices[0]?.total || 0),
        pendingPaymentCount: pendingInvoices[0]?.count || 0,
        outstandingBalances: roundMoney(outstandingPOs[0]?.total || 0),
        outstandingCount: outstandingPOs[0]?.count || 0,
      },
      monthlyChart: months,
      projectStatusOverview: statusOverview.map((s) => ({
        status: s._id,
        count: s.count,
      })),
      recentProjects,
      recentTransactions,
      recentActivities,
      lowStockAlerts: lowStockMaterials,
    },
  });
});
