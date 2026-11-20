import Project from '../models/Project.js';
import Transaction from '../models/Transaction.js';
import Activity from '../models/Activity.js';
import Settings from '../models/Settings.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';
import { getNextSequence, formatDocNumber } from '../services/sequenceService.js';
import { refreshProjectFinance } from '../services/balanceService.js';
import { ensureNonNegative } from '../utils/calculations.js';

export const getProjects = asyncHandler(async (req, res) => {
  const { search, status, client, page = 1, limit = 20 } = req.query;
  const query = {};
  if (status) query.status = status;
  if (client) query.client = client;
  if (search) {
    query.$or = [
      { name: new RegExp(search, 'i') },
      { projectId: new RegExp(search, 'i') },
    ];
  }
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Project.find(query)
      .populate('client', 'name phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Project.countDocuments(query),
  ]);
  res.json({
    success: true,
    data,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

export const getProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id).populate('client');
  if (!project) throw new AppError('Project not found', 404);

  await refreshProjectFinance(project._id);
  const refreshed = await Project.findById(project._id).populate('client');

  const [transactions, activities] = await Promise.all([
    Transaction.find({ project: project._id }).sort({ date: -1 }),
    Activity.find({ entityId: project._id }).sort({ createdAt: -1 }).limit(50).populate('user', 'name'),
  ]);

  res.json({
    success: true,
    data: { ...refreshed.toObject(), transactions, activities },
  });
});

export const createProject = asyncHandler(async (req, res) => {
  const { name, client, budget, startDate, endDate, description, location, notes, status } = req.body;
  if (!name || !client || budget == null || !startDate) {
    throw new AppError('Name, client, budget and start date are required', 400);
  }
  const safeBudget = ensureNonNegative(budget, 'Budget');
  const settings = await Settings.findOne() || { projectPrefix: 'ZEF' };
  const seq = await getNextSequence('project');
  const projectId = formatDocNumber(settings.projectPrefix || 'ZEF', seq);

  const project = await Project.create({
    projectId,
    name,
    client,
    budget: safeBudget,
    startDate,
    endDate,
    description,
    location,
    notes,
    status: status || 'Planning',
    createdBy: req.user._id,
  });

  await logActivity({
    action: 'create',
    module: 'projects',
    entityType: 'Project',
    entityId: project._id,
    description: `Project ${project.projectId} – ${project.name} created`,
    user: req.user._id,
  });

  const populated = await Project.findById(project._id).populate('client', 'name phone');
  res.status(201).json({ success: true, data: populated });
});

export const updateProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);

  const fields = [
    'name', 'client', 'description', 'startDate', 'endDate',
    'status', 'location', 'notes', 'progress',
  ];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) project[f] = req.body[f];
  });
  if (req.body.budget != null) project.budget = ensureNonNegative(req.body.budget, 'Budget');
  if (project.status === 'Completed') project.progress = 100;

  await project.save();
  await logActivity({
    action: 'update',
    module: 'projects',
    entityType: 'Project',
    entityId: project._id,
    description: `Project ${project.projectId} updated`,
    user: req.user._id,
  });

  const populated = await Project.findById(project._id).populate('client', 'name phone');
  res.json({ success: true, data: populated });
});

export const deleteProject = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);

  const txCount = await Transaction.countDocuments({ project: project._id });
  if (txCount > 0) {
    throw new AppError('Cannot delete project with financial transactions. Set status to On Hold instead.', 400);
  }

  await project.deleteOne();
  await logActivity({
    action: 'delete',
    module: 'projects',
    entityType: 'Project',
    entityId: project._id,
    description: `Project ${project.projectId} deleted`,
    user: req.user._id,
  });
  res.json({ success: true, message: 'Project deleted' });
});

export const addTask = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const { title, description, dueDate, status } = req.body;
  if (!title) throw new AppError('Task title is required', 400);

  project.tasks.push({ title, description, dueDate, status: status || 'todo' });
  project.recalculateProgress();
  await project.save();
  res.status(201).json({ success: true, data: project });
});

export const updateTask = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const task = project.tasks.id(req.params.taskId);
  if (!task) throw new AppError('Task not found', 404);

  ['title', 'description', 'dueDate', 'status'].forEach((f) => {
    if (req.body[f] !== undefined) task[f] = req.body[f];
  });
  if (task.status === 'done' && !task.completedAt) task.completedAt = new Date();
  if (task.status !== 'done') task.completedAt = undefined;

  project.recalculateProgress();
  await project.save();
  res.json({ success: true, data: project });
});

export const deleteTask = asyncHandler(async (req, res) => {
  const project = await Project.findById(req.params.id);
  if (!project) throw new AppError('Project not found', 404);
  const task = project.tasks.id(req.params.taskId);
  if (!task) throw new AppError('Task not found', 404);
  task.deleteOne();
  project.recalculateProgress();
  await project.save();
  res.json({ success: true, data: project });
});
