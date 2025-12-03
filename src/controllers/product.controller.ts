/**
 * Product Controller
 * Handle product management operations
 */

import { Request, Response } from 'express';
import { initializeApp } from '../api/supabase/client';
import { successResponse, ErrorCodes } from '../utils/response.util';
import {
    isNonEmptyString,
    isNonNegativeNumber,
    isInteger,
    sanitizeString,
    isPositiveNumber,
} from '../utils/validation.util';
import { AppError } from '../middlewares/error.middleware';

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
 * Create product
 * POST /api/v1/businesses/:businessId/products
 */
export async function createProduct(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { name, current_stock, purchase_price, selling_price } = req.body;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Validate required fields
    if (!name || !isNonEmptyString(name)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Product name is required');
    }

    // Validate numbers
    if (current_stock !== undefined && !isNonNegativeNumber(current_stock)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Stock must be a non-negative number');
    }

    if (purchase_price !== undefined && !isNonNegativeNumber(purchase_price)) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Purchase price must be a non-negative number'
        );
    }

    if (selling_price !== undefined && !isNonNegativeNumber(selling_price)) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Selling price must be a non-negative number'
        );
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Determine stock status
    const stock = current_stock || 0;
    let stock_status: 'active' | 'low' | 'out' = 'active';
    if (stock === 0) stock_status = 'out';
    else if (stock < 10) stock_status = 'low';

    // Create product
    const { data: product, error } = await repos.products.create({
        business_id: businessId,
        name: sanitizeString(name),
        current_stock: stock,
        purchase_price: purchase_price || null,
        selling_price: selling_price || null,
        stock_status,
    });

    if (error || !product) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to create product');
    }

    res.status(201).json(successResponse(product, 'Product created successfully'));
}

/**
 * Get all products for a business
 * GET /api/v1/businesses/:businessId/products
 */
export async function getAllProducts(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { status, limit, offset, search } = req.query;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Get products
    const { data: allProducts, error } = await repos.products.findByBusinessId(businessId);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch products');
    }

    let products = allProducts || [];

    // Apply filters
    if (status) {
        products = products.filter((p) => p.stock_status === status);
    }

    if (search) {
        const searchLower = (search as string).toLowerCase();
        products = products.filter((p) => p.name.toLowerCase().includes(searchLower));
    }

    // Apply pagination
    const total = products.length;
    const limitNum = limit ? parseInt(limit as string) : 50;
    const offsetNum = offset ? parseInt(offset as string) : 0;

    products = products.slice(offsetNum, offsetNum + limitNum);

    res.status(200).json(
        successResponse({
            products,
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
 * Get low stock products
 * GET /api/v1/businesses/:businessId/products/low-stock
 */
export async function getLowStockProducts(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const { threshold } = req.query;

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    const thresholdNum = threshold ? parseInt(threshold as string) : 10;

    // Get low stock products
    const { data: products, error } = await repos.products.findLowStock(businessId, thresholdNum);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch low stock products');
    }

    res.status(200).json(successResponse(products || []));
}

/**
 * Get product by ID
 * GET /api/v1/businesses/:businessId/products/:productId
 */
export async function getProductById(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const productId = parseInt(req.params.productId);

    if (isNaN(businessId) || isNaN(productId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business or product ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Get product
    const { data: product, error } = await repos.products.findById(productId);

    if (error || !product) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Product not found');
    }

    // Verify product belongs to business
    if (product.business_id !== businessId) {
        throw new AppError(403, ErrorCodes.UNAUTHORIZED, 'Product does not belong to this business');
    }

    res.status(200).json(successResponse(product));
}

/**
 * Update product
 * PUT /api/v1/businesses/:businessId/products/:productId
 */
export async function updateProduct(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const productId = parseInt(req.params.productId);
    const { name, purchase_price, selling_price } = req.body;

    if (isNaN(businessId) || isNaN(productId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business or product ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Verify product exists and belongs to business
    const { data: product } = await repos.products.findById(productId);
    if (!product || product.business_id !== businessId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Product not found');
    }

    // Validate prices
    if (purchase_price !== undefined && !isNonNegativeNumber(purchase_price)) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Purchase price must be a non-negative number'
        );
    }

    if (selling_price !== undefined && !isNonNegativeNumber(selling_price)) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Selling price must be a non-negative number'
        );
    }

    // Update product
    const { data: updatedProduct, error } = await repos.products.update(productId, {
        name: name ? sanitizeString(name) : undefined,
        purchase_price: purchase_price !== undefined ? purchase_price : undefined,
        selling_price: selling_price !== undefined ? selling_price : undefined,
    });

    if (error || !updatedProduct) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to update product');
    }

    res.status(200).json(successResponse(updatedProduct, 'Product updated successfully'));
}

/**
 * Delete product
 * DELETE /api/v1/businesses/:businessId/products/:productId
 */
export async function deleteProduct(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);
    const productId = parseInt(req.params.productId);

    if (isNaN(businessId) || isNaN(productId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business or product ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Verify product exists and belongs to business
    const { data: product } = await repos.products.findById(productId);
    if (!product || product.business_id !== businessId) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Product not found');
    }

    // Soft delete
    const { error } = await repos.products.softDelete(productId);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to delete product');
    }

    res.status(200).json(successResponse(null, 'Product deleted successfully'));
}

/**
 * Batch update stock status
 * POST /api/v1/businesses/:businessId/products/update-stock-status
 */
export async function updateStockStatusBatch(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const businessId = parseInt(req.params.businessId);

    if (isNaN(businessId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid business ID');
    }

    // Verify business ownership
    await verifyBusinessOwnership(businessId, req.user.email);

    // Update stock status for all products
    const { updated, error } = await services.product.updateStockStatusBatch(businessId);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to update stock status');
    }

    res.status(200).json(
        successResponse({ updated }, `Stock status updated for ${updated} products`)
    );
}
