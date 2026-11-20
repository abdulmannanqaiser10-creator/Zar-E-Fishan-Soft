import express from 'express';
import {
  getTransactions, createTransaction, updateTransaction, deleteTransaction, getFinanceSummary,
} from '../controllers/financeController.js';
import {
  getInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
  recordPayment, getReceivables,
} from '../controllers/invoiceController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/summary', getFinanceSummary);
router.get('/receivables', getReceivables);
router.route('/transactions').get(getTransactions).post(createTransaction);
router.route('/transactions/:id').put(updateTransaction).delete(deleteTransaction);
router.route('/invoices').get(getInvoices).post(createInvoice);
router.route('/invoices/:id').get(getInvoice).put(updateInvoice).delete(deleteInvoice);
router.post('/invoices/:id/payments', recordPayment);

export default router;
