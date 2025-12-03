/**
 * Product Service
 * Manages product stock with automatic status updates
 */

import { BaseService } from './base.service';
import type { Product, StockStatus } from '../models/product.model';

export class ProductService extends BaseService {
    /**
     * Manage stock and automatically update status based on stock level
     * Rules:
     * - stock === 0 → 'out'
     * - stock < 10 → 'low'
     * - stock >= 10 → 'active'
     */
    async manageStockAndStatus(
        productId: number,
        quantityChange: number
    ): Promise<{ data: Product | null; error: any }> {
        try {
            // Step 1: Get current product
            const { data: product, error: fetchError } = await this.repos.products.findById(productId);

            if (fetchError || !product) {
                return {
                    data: null,
                    error: fetchError || new Error('Product not found'),
                };
            }

            // Step 2: Calculate new stock
            const newStock = product.current_stock + quantityChange;

            if (newStock < 0) {
                return {
                    data: null,
                    error: new Error('Insufficient stock. Cannot reduce below zero.'),
                };
            }

            // Step 3: Determine new status based on stock level
            let newStatus: StockStatus;
            if (newStock === 0) {
                newStatus = 'out';
            } else if (newStock < 10) {
                newStatus = 'low';
            } else {
                newStatus = 'active';
            }

            // Step 4: Update product with new stock and status
            const { data: updatedProduct, error: updateError } = await this.repos.products.update(
                productId,
                {
                    current_stock: newStock,
                    stock_status: newStatus,
                }
            );

            if (updateError) {
                return { data: null, error: updateError };
            }

            return { data: updatedProduct, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Check and update status for multiple products (batch operation)
     * Useful for periodic stock status sync
     */
    async updateStockStatusBatch(businessId: number): Promise<{
        updated: number;
        error: any;
    }> {
        try {
            const { data: products, error } = await this.repos.products.findByBusinessId(businessId);

            if (error || !products) {
                return { updated: 0, error };
            }

            let updatedCount = 0;

            for (const product of products) {
                let newStatus: StockStatus;
                if (product.current_stock === 0) {
                    newStatus = 'out';
                } else if (product.current_stock < 10) {
                    newStatus = 'low';
                } else {
                    newStatus = 'active';
                }

                // Only update if status changed
                if (product.stock_status !== newStatus) {
                    await this.repos.products.updateStockStatus(product.id, newStatus);
                    updatedCount++;
                }
            }

            return { updated: updatedCount, error: null };
        } catch (error) {
            return { updated: 0, error };
        }
    }
}
