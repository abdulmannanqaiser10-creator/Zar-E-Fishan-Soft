import User from '../models/User.js';
import AppError from '../utils/AppError.js';
import asyncHandler from '../utils/asyncHandler.js';
import { logActivity } from '../services/activityService.js';

const sendToken = (user, statusCode, res) => {
  const token = user.getSignedToken();
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      permissions: user.permissions,
      avatar: user.avatar,
    },
  });
};

export const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role } = req.body;
  if (!name || !email || !password) {
    throw new AppError('Name, email and password are required', 400);
  }
  const exists = await User.findOne({ email });
  if (exists) throw new AppError('Email already registered', 400);

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: role || 'staff',
  });
  await logActivity({
    action: 'create',
    module: 'users',
    entityType: 'User',
    entityId: user._id,
    description: `User ${user.name} registered`,
    user: user._id,
  });
  sendToken(user, 201, res);
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Invalid email or password', 401);
  }
  if (!user.isActive) throw new AppError('Account is inactive', 401);

  await logActivity({
    action: 'login',
    module: 'auth',
    entityType: 'User',
    entityId: user._id,
    description: `${user.name} logged in`,
    user: user._id,
  });
  sendToken(user, 200, res);
});

export const getMe = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, email } = req.body;
  const user = await User.findById(req.user._id);
  if (name) user.name = name;
  if (phone !== undefined) user.phone = phone;
  if (email && email !== user.email) {
    const exists = await User.findOne({ email });
    if (exists) throw new AppError('Email already in use', 400);
    user.email = email;
  }
  await user.save();
  res.json({ success: true, user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    throw new AppError('Current and new password are required', 400);
  }
  if (newPassword.length < 6) {
    throw new AppError('New password must be at least 6 characters', 400);
  }
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword))) {
    throw new AppError('Current password is incorrect', 400);
  }
  user.password = newPassword;
  await user.save();
  res.json({ success: true, message: 'Password updated successfully' });
});

export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password').sort({ createdAt: -1 });
  res.json({ success: true, data: users });
});

export const updateUser = asyncHandler(async (req, res) => {
  const { name, role, permissions, isActive, phone } = req.body;
  const user = await User.findById(req.params.id);
  if (!user) throw new AppError('User not found', 404);
  if (name) user.name = name;
  if (role) user.role = role;
  if (permissions) user.permissions = permissions;
  if (typeof isActive === 'boolean') user.isActive = isActive;
  if (phone !== undefined) user.phone = phone;
  await user.save();
  res.json({ success: true, data: user });
});
