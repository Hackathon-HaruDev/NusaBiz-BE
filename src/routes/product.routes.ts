/**
 * Product Routes (nested under businesses)
 * /api/v1/businesses/:businessId/products/*
 */

import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import * as productController from '../controllers/product.controller';

const router = Router({ mergeParams: true }); // Merge params to access businessId

// Batch operations (must come before :productId routes)
router.post('/update-stock-status', asyncHandler(productController.updateStockStatusBatch));

// Special queries (must come before :productId routes)
router.get('/low-stock', asyncHandler(productController.getLowStockProducts));

// Product CRUD
router.post('/', asyncHandler(productController.createProduct));
router.get('/', asyncHandler(productController.getAllProducts));
router.get('/:productId', asyncHandler(productController.getProductById));
router.put('/:productId', asyncHandler(productController.updateProduct));
router.delete('/:productId', asyncHandler(productController.deleteProduct));

export default router;
