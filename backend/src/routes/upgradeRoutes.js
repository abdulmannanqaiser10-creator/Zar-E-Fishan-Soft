import express from 'express';
import { protect } from '../middleware/auth.js';
import { uploadMemory } from '../middleware/upload.js';
import {
  listAccounts, createAccount, updateAccount,
  listQuotations, createQuotation, updateQuotation, convertQuotation,
  listExpenses, createExpense, deleteExpense,
  listLedger,
  listSalesReturns, createSalesReturn,
  addFollowUp,
  addProjectMedia, deleteProjectMedia, addProjectExpense, deleteProjectExpense,
  pendingPayments, cashFlowReport, balanceSheet,
} from '../controllers/upgradeController.js';

const router = express.Router();
router.use(protect);

router.get('/accounts', listAccounts);
router.post('/accounts', createAccount);
router.put('/accounts/:id', updateAccount);

router.get('/quotations', listQuotations);
router.post('/quotations', createQuotation);
router.put('/quotations/:id', updateQuotation);
router.post('/quotations/:id/convert', convertQuotation);

router.get('/expenses', listExpenses);
router.post('/expenses', createExpense);
router.delete('/expenses/:id', deleteExpense);

router.get('/ledger', listLedger);

router.get('/sales-returns', listSalesReturns);
router.post('/sales-returns', createSalesReturn);

router.post('/clients/:id/follow-ups', addFollowUp);

router.post('/projects/:id/media', uploadMemory.single('file'), addProjectMedia);
router.delete('/projects/:id/media/:mediaId', deleteProjectMedia);
router.post('/projects/:id/expenses', addProjectExpense);
router.delete('/projects/:id/expenses/:expenseId', deleteProjectExpense);

router.get('/pending-payments', pendingPayments);
router.get('/reports/cash-flow', cashFlowReport);
router.get('/reports/balance-sheet', balanceSheet);

export default router;
