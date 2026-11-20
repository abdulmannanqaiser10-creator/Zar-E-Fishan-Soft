import Settings from '../models/Settings.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';

export const getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({});
  }
  res.json({ success: true, data: settings });
});

export const updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = await Settings.create({});

  const allowed = [
    'companyName', 'logo', 'email', 'phone', 'address', 'website',
    'currency', 'currencySymbol', 'taxRate', 'taxLabel',
    'invoicePrefix', 'invoiceFooter', 'poPrefix', 'projectPrefix',
    'fiscalYearStart', 'dateFormat', 'lowStockAlert', 'backupEnabled', 'theme',
  ];

  allowed.forEach((key) => {
    if (req.body[key] !== undefined) settings[key] = req.body[key];
  });

  await settings.save();
  await logActivity({
    action: 'update',
    module: 'settings',
    entityType: 'Settings',
    entityId: settings._id,
    description: 'Company settings updated',
    user: req.user._id,
  });

  res.json({ success: true, data: settings });
});
