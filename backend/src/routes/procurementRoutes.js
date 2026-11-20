import express from 'express';
import {
  getPurchaseRequests, createPurchaseRequest, updatePurchaseRequest, deletePurchaseRequest,
  getPurchaseOrders, getPurchaseOrder, createPurchaseOrder, updatePurchaseOrder,
  receivePurchaseOrder, recordVendorPayment, getPayables,
} from '../controllers/procurementController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/payables', getPayables);
router.route('/requests').get(getPurchaseRequests).post(createPurchaseRequest);
router.route('/requests/:id').put(updatePurchaseRequest).delete(deletePurchaseRequest);
router.route('/orders').get(getPurchaseOrders).post(createPurchaseOrder);
router.route('/orders/:id').get(getPurchaseOrder).put(updatePurchaseOrder);
router.post('/orders/:id/receive', receivePurchaseOrder);
router.post('/orders/:id/payments', recordVendorPayment);

export default router;
