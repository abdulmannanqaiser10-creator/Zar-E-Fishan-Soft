import Client from '../models/Client.js';
import Project from '../models/Project.js';
import Invoice from '../models/Invoice.js';
import Transaction from '../models/Transaction.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { refreshClientBalances } from '../services/balanceService.js';

export const getClients = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20, active } = req.query;
  const query = {};
  if (active === 'true') query.isActive = true;
  if (active === 'false') query.isActive = false;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') },
      { phone: new RegExp(search, 'i') },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Client.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Client.countDocuments(query),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new AppError('Client not found', 404);

  const [projects, invoices, payments] = await Promise.all([
    Project.find({ client: client._id }).sort({ createdAt: -1 }),
    Invoice.find({ client: client._id }).sort({ createdAt: -1 }),
    Transaction.find({ client: client._id, type: 'income' }).sort({ date: -1 }),
  ]);

  await refreshClientBalances(client._id);
  const refreshed = await Client.findById(client._id);

  res.json({
    success: true,
    data: { ...refreshed.toObject(), projects, invoices, paymentHistory: payments },
  });
});

export const createClient = asyncHandler(async (req, res) => {
  const { name, phone, email, address, city, notes } = req.body;
  if (!name || !phone) throw new AppError('Name and phone are required', 400);

  const client = await Client.create({
    name,
    phone,
    email,
    address,
    city,
    notes,
    createdBy: req.user._id,
  });

  await logActivity({
    action: 'create',
    module: 'clients',
    entityType: 'Client',
    entityId: client._id,
    description: `Client ${client.name} created`,
    user: req.user._id,
  });

  res.status(201).json({ success: true, data: client });
});

export const updateClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new AppError('Client not found', 404);

  const fields = ['name', 'phone', 'email', 'address', 'city', 'notes', 'isActive'];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) client[f] = req.body[f];
  });
  await client.save();

  await logActivity({
    action: 'update',
    module: 'clients',
    entityType: 'Client',
    entityId: client._id,
    description: `Client ${client.name} updated`,
    user: req.user._id,
  });

  res.json({ success: true, data: client });
});

export const deleteClient = asyncHandler(async (req, res) => {
  const client = await Client.findById(req.params.id);
  if (!client) throw new AppError('Client not found', 404);

  const projectCount = await Project.countDocuments({ client: client._id });
  if (projectCount > 0) {
    throw new AppError('Cannot delete client with existing projects. Deactivate instead.', 400);
  }

  await client.deleteOne();
  await logActivity({
    action: 'delete',
    module: 'clients',
    entityType: 'Client',
    entityId: client._id,
    description: `Client ${client.name} deleted`,
    user: req.user._id,
  });

  res.json({ success: true, message: 'Client deleted' });
});
