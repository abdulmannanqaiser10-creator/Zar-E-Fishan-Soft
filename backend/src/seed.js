import dotenv from 'dotenv';
import connectDB from './config/db.js';
import User from './models/User.js';
import Client from './models/Client.js';
import Vendor from './models/Vendor.js';
import Project from './models/Project.js';
import Material from './models/Material.js';
import Transaction from './models/Transaction.js';
import Invoice from './models/Invoice.js';
import PurchaseOrder from './models/PurchaseOrder.js';
import PurchaseRequest from './models/PurchaseRequest.js';
import StockMovement from './models/StockMovement.js';
import Settings from './models/Settings.js';
import Activity from './models/Activity.js';
import Counter from './models/Counter.js';
import SystemPin from './models/SystemPin.js';
import Account from './models/Account.js';
import Quotation from './models/Quotation.js';
import GeneralExpense from './models/GeneralExpense.js';
import LedgerEntry from './models/LedgerEntry.js';
import SalesReturn from './models/SalesReturn.js';
import Blog from './models/Blog.js';
import { WebsiteBudget, WebsiteProject } from './models/WebsiteContent.js';
import { calculateDocumentTotals, roundMoney } from './utils/calculations.js';
import { ensureDefaultAccounts } from './services/ledgerService.js';

dotenv.config();

const clearAll = async () => {
  await Promise.all([
    User.deleteMany({}),
    Client.deleteMany({}),
    Vendor.deleteMany({}),
    Project.deleteMany({}),
    Material.deleteMany({}),
    Transaction.deleteMany({}),
    Invoice.deleteMany({}),
    PurchaseOrder.deleteMany({}),
    PurchaseRequest.deleteMany({}),
    StockMovement.deleteMany({}),
    Settings.deleteMany({}),
    Activity.deleteMany({}),
    Counter.deleteMany({}),
    SystemPin.deleteMany({}),
    Account.deleteMany({}),
    Quotation.deleteMany({}),
    GeneralExpense.deleteMany({}),
    LedgerEntry.deleteMany({}),
    SalesReturn.deleteMany({}),
    Blog.deleteMany({}),
    WebsiteBudget.deleteMany({}),
    WebsiteProject.deleteMany({}),
  ]);
};

const seed = async () => {
  await connectDB();
  console.log('Clearing existing data...');
  await clearAll();

  const admin = await User.create({
    name: 'Admin User',
    email: 'admin@zarefishan.com',
    password: 'admin123',
    phone: '+92 300 1234567',
    role: 'admin',
  });

  await User.create({
    name: 'Sara Manager',
    email: 'manager@zarefishan.com',
    password: 'manager123',
    phone: '+92 300 7654321',
    role: 'manager',
  });

  await SystemPin.ensureDefault('1234');
  await ensureDefaultAccounts();

  await Settings.create({
    companyName: 'Zar-E-Fishan',
    email: 'info@zarefishan.com',
    phone: '+92 42 1234567',
    address: 'Lahore, Pakistan',
    currency: 'PKR',
    currencySymbol: 'Rs',
    taxRate: 5,
    invoicePrefix: 'INV',
    poPrefix: 'PO',
    projectPrefix: 'ZEF',
  });

  const clients = await Client.insertMany([
    {
      name: 'Ayesha Khan',
      phone: '+92 321 1112233',
      email: 'ayesha@email.com',
      address: 'DHA Phase 5, Lahore',
      city: 'Lahore',
      createdBy: admin._id,
    },
    {
      name: 'Bilal Ahmed',
      phone: '+92 333 4445566',
      email: 'bilal@email.com',
      address: 'Bahria Town, Islamabad',
      city: 'Islamabad',
      createdBy: admin._id,
    },
    {
      name: 'Fatima Zahra',
      phone: '+92 300 9988776',
      email: 'fatima@email.com',
      address: 'Clifton Block 4, Karachi',
      city: 'Karachi',
      createdBy: admin._id,
    },
  ]);

  const vendors = await Vendor.insertMany([
    {
      name: 'Premium Woods Co.',
      contactPerson: 'Imran Ali',
      phone: '+92 301 5556677',
      email: 'sales@premiumwoods.com',
      address: 'Industrial Area, Lahore',
      category: 'Timber',
      createdBy: admin._id,
    },
    {
      name: 'Luxe Fabrics',
      contactPerson: 'Nadia Raza',
      phone: '+92 302 8889900',
      email: 'orders@luxefabrics.com',
      address: 'Faisalabad Road',
      category: 'Textiles',
      createdBy: admin._id,
    },
  ]);

  const materials = await Material.insertMany([
    {
      name: 'Oak Veneer Panel',
      sku: 'WOOD-001',
      category: 'Wood',
      quantity: 120,
      unit: 'sheets',
      costPrice: 4500,
      sellingPrice: 6200,
      reorderLevel: 20,
      createdBy: admin._id,
    },
    {
      name: 'Italian Marble Tile',
      sku: 'TILE-001',
      category: 'Flooring',
      quantity: 85,
      unit: 'boxes',
      costPrice: 12000,
      sellingPrice: 15500,
      reorderLevel: 15,
      createdBy: admin._id,
    },
    {
      name: 'Velvet Curtain Fabric',
      sku: 'FAB-001',
      category: 'Textiles',
      quantity: 8,
      unit: 'meters',
      costPrice: 2800,
      sellingPrice: 4200,
      reorderLevel: 25,
      createdBy: admin._id,
    },
    {
      name: 'Brass Wall Light',
      sku: 'LGT-001',
      category: 'Lighting',
      quantity: 40,
      unit: 'pcs',
      costPrice: 7500,
      sellingPrice: 11000,
      reorderLevel: 10,
      createdBy: admin._id,
    },
  ]);

  await Counter.create([
    { name: 'project', seq: 3 },
    { name: 'invoice', seq: 2 },
    { name: 'purchaseOrder', seq: 1 },
    { name: 'purchaseRequest', seq: 1 },
    { name: 'transaction', seq: 6 },
  ]);

  const projects = await Project.insertMany([
    {
      projectId: 'ZEF-0001',
      name: 'DHA Villa Interior',
      client: clients[0]._id,
      budget: 2500000,
      startDate: new Date('2026-01-15'),
      endDate: new Date('2026-06-30'),
      status: 'In Progress',
      progress: 45,
      description: 'Full villa interior redesign with custom furniture.',
      location: 'DHA Phase 5, Lahore',
      totalRevenue: 800000,
      totalExpenses: 320000,
      tasks: [
        { title: 'Concept presentation', status: 'done', completedAt: new Date() },
        { title: 'Material selection', status: 'done', completedAt: new Date() },
        { title: 'Living room execution', status: 'in_progress' },
        { title: 'Master bedroom fit-out', status: 'todo' },
      ],
      createdBy: admin._id,
    },
    {
      projectId: 'ZEF-0002',
      name: 'Bahria Apartment Makeover',
      client: clients[1]._id,
      budget: 900000,
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-04-15'),
      status: 'Planning',
      progress: 15,
      description: 'Modern apartment interior with smart storage.',
      location: 'Bahria Town, Islamabad',
      totalRevenue: 200000,
      totalExpenses: 45000,
      tasks: [
        { title: 'Site survey', status: 'done', completedAt: new Date() },
        { title: 'Mood boards', status: 'in_progress' },
      ],
      createdBy: admin._id,
    },
    {
      projectId: 'ZEF-0003',
      name: 'Clifton Penthouse',
      client: clients[2]._id,
      budget: 4800000,
      startDate: new Date('2025-08-01'),
      endDate: new Date('2026-01-20'),
      status: 'Completed',
      progress: 100,
      description: 'Luxury penthouse with panoramic sea view interiors.',
      location: 'Clifton, Karachi',
      totalRevenue: 4800000,
      totalExpenses: 2100000,
      tasks: [
        { title: 'Handover', status: 'done', completedAt: new Date() },
      ],
      createdBy: admin._id,
    },
  ]);

  const invItems1 = [
    { description: 'Design consultation package', quantity: 1, unitPrice: 150000, discount: 0 },
    { description: 'Living room furniture set', quantity: 1, unitPrice: 650000, discount: 50000 },
  ];
  const totals1 = calculateDocumentTotals({ items: invItems1, taxRate: 5, discountAmount: 0 });

  const invoice1 = await Invoice.create({
    invoiceNumber: 'INV-0001',
    client: clients[0]._id,
    project: projects[0]._id,
    items: invItems1.map((i) => ({
      ...i,
      amount: roundMoney(i.quantity * i.unitPrice - (i.discount || 0)),
    })),
    ...totals1,
    paidAmount: 400000,
    remainingBalance: roundMoney(totals1.total - 400000),
    status: 'partial',
    issueDate: new Date('2026-02-10'),
    dueDate: new Date('2026-03-10'),
    payments: [
      {
        amount: 400000,
        method: 'bank_transfer',
        date: new Date('2026-02-15'),
        reference: 'TRX-AYE-001',
      },
    ],
    createdBy: admin._id,
  });

  const invItems2 = [
    { description: 'Advance design fee', quantity: 1, unitPrice: 200000, discount: 0 },
  ];
  const totals2 = calculateDocumentTotals({ items: invItems2, taxRate: 5 });

  await Invoice.create({
    invoiceNumber: 'INV-0002',
    client: clients[1]._id,
    project: projects[1]._id,
    items: invItems2.map((i) => ({
      ...i,
      amount: roundMoney(i.quantity * i.unitPrice),
    })),
    ...totals2,
    paidAmount: totals2.total,
    remainingBalance: 0,
    status: 'paid',
    issueDate: new Date('2026-02-05'),
    dueDate: new Date('2026-02-20'),
    payments: [
      {
        amount: totals2.total,
        method: 'bank_transfer',
        date: new Date('2026-02-08'),
        reference: 'TRX-BIL-001',
      },
    ],
    createdBy: admin._id,
  });

  await Transaction.insertMany([
    {
      transactionId: 'TXN-0001',
      type: 'income',
      category: 'Invoice Payment',
      amount: 400000,
      paymentMethod: 'bank_transfer',
      date: new Date('2026-02-15'),
      description: 'Payment for INV-0001',
      client: clients[0]._id,
      project: projects[0]._id,
      invoice: invoice1._id,
      uniqueKey: 'seed-inv1-pay',
      createdBy: admin._id,
    },
    {
      transactionId: 'TXN-0002',
      type: 'income',
      category: 'Invoice Payment',
      amount: totals2.total,
      paymentMethod: 'bank_transfer',
      date: new Date('2026-02-08'),
      description: 'Payment for INV-0002',
      client: clients[1]._id,
      project: projects[1]._id,
      uniqueKey: 'seed-inv2-pay',
      createdBy: admin._id,
    },
    {
      transactionId: 'TXN-0003',
      type: 'income',
      category: 'Project Milestone',
      amount: 800000,
      paymentMethod: 'bank_transfer',
      date: new Date('2026-01-20'),
      description: 'Milestone payment – Clifton Penthouse',
      client: clients[2]._id,
      project: projects[2]._id,
      createdBy: admin._id,
    },
    {
      transactionId: 'TXN-0004',
      type: 'expense',
      category: 'Materials',
      amount: 180000,
      paymentMethod: 'bank_transfer',
      date: new Date('2026-02-12'),
      description: 'Wood panels for DHA Villa',
      project: projects[0]._id,
      vendor: vendors[0]._id,
      createdBy: admin._id,
    },
    {
      transactionId: 'TXN-0005',
      type: 'expense',
      category: 'Labor',
      amount: 140000,
      paymentMethod: 'cash',
      date: new Date('2026-02-18'),
      description: 'Carpentry labor – DHA Villa',
      project: projects[0]._id,
      createdBy: admin._id,
    },
    {
      transactionId: 'TXN-0006',
      type: 'expense',
      category: 'Transport',
      amount: 45000,
      paymentMethod: 'cash',
      date: new Date('2026-02-03'),
      description: 'Material delivery – Bahria project',
      project: projects[1]._id,
      createdBy: admin._id,
    },
  ]);

  const poItems = [
    {
      material: materials[0]._id,
      quantity: 30,
      unitPrice: 4500,
      taxRate: 5,
      amount: roundMoney(30 * 4500 * 1.05),
      receivedQuantity: 0,
    },
    {
      material: materials[3]._id,
      quantity: 10,
      unitPrice: 7500,
      taxRate: 5,
      amount: roundMoney(10 * 7500 * 1.05),
      receivedQuantity: 0,
    },
  ];
  const poSubtotal = roundMoney(30 * 4500 + 10 * 7500);
  const poTax = roundMoney(poSubtotal * 0.05);
  const poTotal = roundMoney(poSubtotal + poTax);

  await PurchaseOrder.create({
    poNumber: 'PO-0001',
    vendor: vendors[0]._id,
    project: projects[0]._id,
    items: poItems,
    subtotal: poSubtotal,
    taxAmount: poTax,
    discountAmount: 0,
    total: poTotal,
    paidAmount: 0,
    remainingBalance: poTotal,
    status: 'Ordered',
    orderDate: new Date('2026-02-20'),
    expectedDate: new Date('2026-03-05'),
    notes: 'Urgent delivery for living room',
    createdBy: admin._id,
  });

  await PurchaseRequest.create({
    requestNumber: 'PR-0001',
    project: projects[1]._id,
    requestedBy: admin._id,
    items: [
      {
        material: materials[2]._id,
        description: 'Velvet Curtain Fabric',
        quantity: 50,
        estimatedUnitPrice: 2800,
      },
    ],
    status: 'Approved',
    priority: 'High',
    notes: 'Needed for window treatments',
    approvedBy: admin._id,
    approvedAt: new Date(),
  });

  // Refresh client balances from invoices
  for (const c of clients) {
    const invoices = await Invoice.find({ client: c._id, status: { $ne: 'cancelled' } });
    c.totalProjectValue = roundMoney(invoices.reduce((s, i) => s + i.total, 0));
    c.totalPaid = roundMoney(invoices.reduce((s, i) => s + i.paidAmount, 0));
    c.totalPending = roundMoney(invoices.reduce((s, i) => s + i.remainingBalance, 0));
    await c.save();
  }

  await Activity.create({
    action: 'seed',
    module: 'system',
    description: 'Database seeded with sample Zar-E-Fishan data',
    user: admin._id,
  });

  console.log('Seed completed successfully.');
  console.log('Login PIN: 1234');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
