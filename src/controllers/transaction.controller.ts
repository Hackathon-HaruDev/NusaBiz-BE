/**
 * Transaction Controller
 * Handle transaction management operations
 */

import { Request, Response } from 'express';
import { initializeApp } from '../api/supabase/client';
import { successResponse, ErrorCodes } from '../utils/response.util';
import { isNonEmptyString, isPositiveNumber, isInteger } from '../utils/validation.util';
import { AppError } from '../middlewares/error.middleware';
import type { TransactionType, TransactionStatus } from '../models/transaction.model';

const { repos, services } = initializeApp();

/**
 * Helper: Verify business ownership
 */
async function verifyBusinessOwnership(businessId: number, userEmail: string): Promise<void> {
    const { data: business } = await repos.businesses.findById(businessId);
    if (!business) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Business not found');
    }

    const { data: user } = await repos.users.findByEmail(userEmail);
    if (!user || business.user_id !== user.id) {
        throw new AppError(403, ErrorCodes.UNAUTHORIZED, 'Not authorized to access this business');
    }
}

/**
 * Record product sale
 * POST /api/v1/businesses/:businessId/transactions/sales
 */
export async function recordSale(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { products, description } = req.body;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Validate products array
    if (!Array.isArray(products) || products.length === 0) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Products array is required');
    }

    // Validate each product
    for (const product of products) {
        if (
            !product.productId ||
            !isInteger(product.productId) ||
            !product.quantity ||
            !isPositiveNumber(product.quantity) ||
            !product.sellingPrice ||
            !isPositiveNumber(product.sellingPrice)
        ) {
            throw new AppError(
                400,
                ErrorCodes.VALIDATION_ERROR,
                'Each product must have productId, quantity, and sellingPrice'
            );
        }
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Record sale using service
    const { data: transaction, error } = await services.transaction.recordProductSale({
        businessId,
        products,
        description,
    });

    if (error) {
        if (error.message.includes('stock')) {
            throw new AppError(400, ErrorCodes.INSUFFICIENT_STOCK, error.message);
        }
        throw new AppError(500, ErrorCodes.SERVER_ERROR, error.message);
    }

    res.status(201).json(successResponse(transaction, 'Sale recorded successfully'));
}

/**
 * Record stock purchase
 * POST /api/v1/businesses/:businessId/transactions/purchases
 */
export async function recordPurchase(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { products, description } = req.body;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Validate products array
    if (!Array.isArray(products) || products.length === 0) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Products array is required');
    }

    // Validate each product
    for (const product of products) {
        if (
            !product.productId ||
            !isInteger(product.productId) ||
            !product.quantity ||
            !isPositiveNumber(product.quantity) ||
            !product.purchasePrice ||
            !isPositiveNumber(product.purchasePrice)
        ) {
            throw new AppError(
                400,
                ErrorCodes.VALIDATION_ERROR,
                'Each product must have productId, quantity, and purchasePrice'
            );
        }
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Record purchase using service
    const { data: transaction, error } = await services.transaction.recordStockPurchase({
        businessId,
        products,
        description,
    });

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, error.message);
    }

    res.status(201).json(successResponse(transaction, 'Purchase recorded successfully'));
}

/**
 * Create general transaction (non-product)
 * POST /api/v1/businesses/:businessId/transactions
 */
export async function createTransaction(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { type, category, amount, description, status } = req.body;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Validate required fields
    if (!type || (type !== 'Income' && type !== 'Expense')) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Valid type is required (Income or Expense)');
    }

    if (!amount || !isPositiveNumber(amount)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Amount must be a positive number');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Create transaction
    const { data: transaction, error } = await repos.transactions.create({
        business_id: businessId,
        type: type as TransactionType,
        category: category || null,
        amount,
        description: description || null,
        status: (status as TransactionStatus) || 'complete',
    });

    if (error || !transaction) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to create transaction');
    }

    res.status(201).json(successResponse(transaction, 'Transaction created successfully'));
}

/**
 * Get all transactions
 * GET /api/v1/businesses/:businessId/transactions
 */
export async function getAllTransactions(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { type, category, status, startDate, endDate, limit, offset } = req.query;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Build filters
    const filters: any = {};
    if (type) filters.type = type as TransactionType;
    if (category) filters.category = category;
    if (status) filters.status = status as TransactionStatus;

    // Build date range filter
    const dateRangeFilter =
        startDate && endDate
            ? {
                startDate: startDate as string,
                endDate: endDate as string,
            }
            : undefined;

    // Get transactions
    const { data: allTransactions, error } = await repos.transactions.findByBusinessId(
        businessId,
        { ...filters, dateRange: dateRangeFilter }
    );

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch transactions');
    }

    let transactions = allTransactions || [];

    // Apply pagination
    const total = transactions.length;
    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    transactions = transactions.slice(offsetNum, offsetNum + limitNum);

    res.status(200).json(
        successResponse({
            transactions,
            pagination: {
                total,
                limit: limitNum,
                offset: offsetNum,
                hasMore: offsetNum + limitNum < total,
            },
        })
    );
}

/**
 * Get transaction by ID
 * GET /api/v1/businesses/:businessId/transactions/:transactionId
 */
export async function getTransactionById(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const transactionId = parseInt(req.params.transactionId);

    if (isNaN(businessId) || isNaN(transactionId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business or transaction ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Get transaction with details
    const { data: transaction, error } = await repos.transactions.findWithDetails(transactionId);

    if (error || !transaction) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Transaction not found');
    }

    // Verify transaction belongs to business
    if (transaction.business_id !== businessId) {
        throw new AppError(
            403,
            ErrorCodes.UNAUTHORIZED,
            'Transaction does not belong to this business'
        );
    }

    res.status(200).json(successResponse(transaction));
}

/**
 * Update transaction
 * PUT /api/v1/businesses/:businessId/transactions/:transactionId
 */
export async function updateTransaction(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const transactionId = parseInt(req.params.transactionId);
    const { description, status } = req.body;

    if (isNaN(businessId) || isNaN(transactionId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business or transaction ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Verify transaction exists and belongs to business
    const { data: transaction } = await repos.transactions.findById(transactionId);
    if (!transaction || transaction.business_id !== businessId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Transaction not found');
    }

    // Update transaction (limited fields)
    const { data: updatedTransaction, error } = await repos.transactions.update(transactionId, {
        description: description || undefined,
        status: status || undefined,
    });

    if (error || !updatedTransaction) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to update transaction');
    }

    res.status(200).json(successResponse(updatedTransaction, 'Transaction updated successfully'));
}

/**
 * Cancel transaction
 * PUT /api/v1/businesses/:businessId/transactions/:transactionId/cancel
 */
export async function cancelTransaction(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const transactionId = parseInt(req.params.transactionId);

    if (isNaN(businessId) || isNaN(transactionId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business or transaction ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Verify transaction exists and belongs to business
    const { data: transaction } = await repos.transactions.findById(transactionId);
    if (!transaction || transaction.business_id !== businessId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Transaction not found');
    }

    // Update status to cancel
    const { data: cancelledTransaction, error } = await repos.transactions.update(transactionId, {
        status: 'cancel',
    });

    if (error || !cancelledTransaction) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to cancel transaction');
    }

    res.status(200).json(successResponse(cancelledTransaction, 'Transaction cancelled successfully'));
}

/**
 * Delete transaction
 * DELETE /api/v1/businesses/:businessId/transactions/:transactionId
 */
export async function deleteTransaction(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const transactionId = parseInt(req.params.transactionId);

    if (isNaN(businessId) || isNaN(transactionId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business or transaction ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Verify transaction exists and belongs to business
    const { data: transaction } = await repos.transactions.findById(transactionId);
    if (!transaction || transaction.business_id !== businessId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Transaction not found');
    }

    // Soft delete
    const { error } = await repos.transactions.softDelete(transactionId);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to delete transaction');
    }

    res.status(200).json(successResponse(null, 'Transaction deleted successfully'));
}

/**
 * Get transaction totals
 * GET /api/v1/businesses/:businessId/transactions/totals
 */
export async function getTransactionTotals(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { startDate, endDate } = req.query;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Build date filter
    const dateFilter =
        startDate && endDate
            ? {
                startDate: startDate as string,
                endDate: endDate as string,
            }
            : undefined;

    // Get totals
    const { data: totals, error } = await repos.transactions.getTotalsByType(
        businessId,
        dateFilter
    );

    if (error || !totals) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch transaction totals');
    }

    res.status(200).json(
        successResponse({
            income: totals.income,
            expense: totals.expense,
            net: totals.income - totals.expense,
            dateRange: dateFilter,
        })
    );
}
