import express from 'express';
import {
  projectReport, clientReport, financeReport, profitLossReport,
  inventoryReport, procurementReport, vendorReport, invoiceReport,
} from '../controllers/reportController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/projects', projectReport);
router.get('/clients', clientReport);
router.get('/finance', financeReport);
router.get('/profit-loss', profitLossReport);
router.get('/inventory', inventoryReport);
router.get('/procurement', procurementReport);
router.get('/vendors', vendorReport);
router.get('/invoices', invoiceReport);

export default router;
