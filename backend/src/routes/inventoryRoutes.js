import express from 'express';
import {
  getMaterials, getMaterial, createMaterial, updateMaterial, deleteMaterial,
  stockIn, stockOut, getMovements, getCategories,
} from '../controllers/inventoryController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/categories', getCategories);
router.get('/movements', getMovements);
router.route('/materials').get(getMaterials).post(createMaterial);
router.route('/materials/:id').get(getMaterial).put(updateMaterial).delete(deleteMaterial);
router.post('/materials/:id/stock-in', stockIn);
router.post('/materials/:id/stock-out', stockOut);

export default router;
