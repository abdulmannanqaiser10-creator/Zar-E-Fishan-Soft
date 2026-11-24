import express from 'express';
import {
  register, login, pinLogin, changePin, getMe, updateProfile,
  changePassword, listUsers, updateUser,
} from '../controllers/authController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', login);
router.post('/pin-login', pinLogin);
router.post('/register', protect, authorize('admin'), register);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/password', protect, changePassword);
router.put('/change-pin', protect, authorize('admin', 'manager'), changePin);
router.get('/users', protect, authorize('admin', 'manager'), listUsers);
router.put('/users/:id', protect, authorize('admin'), updateUser);

export default router;
