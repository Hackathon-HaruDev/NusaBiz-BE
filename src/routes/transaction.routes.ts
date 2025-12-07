/**
 * Transaction Routes (nested under businesses)
 * /api/v1/businesses/:businessId/transactions/*
 */

import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import * as transactionController from '../controllers/transaction.controller';

const router = Router({ mergeParams: true }); // Merge params to access businessId

// Special endpoints (must come before :transactionId routes)
router.post('/sales', asyncHandler(transactionController.recordSale));
router.post('/purchases', asyncHandler(transactionController.recordPurchase));
router.get('/totals', asyncHandler(transactionController.getTransactionTotals));

// Transaction CRUD
router.post('/', asyncHandler(transactionController.createTransaction));
router.get('/', asyncHandler(transactionController.getAllTransactions));
router.get('/:transactionId', asyncHandler(transactionController.getTransactionById));
router.put('/:transactionId', asyncHandler(transactionController.updateTransaction));
router.delete('/:transactionId', asyncHandler(transactionController.deleteTransaction));

// Special actions
router.put('/:transactionId/cancel', asyncHandler(transactionController.cancelTransaction));

export default router;
