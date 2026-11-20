import express from 'express';
import {
  getVendors, getVendor, createVendor, updateVendor, deleteVendor,
} from '../controllers/vendorController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.route('/').get(getVendors).post(createVendor);
router.route('/:id').get(getVendor).put(updateVendor).delete(deleteVendor);

export default router;
