/**
 * Product Repository
 * Handles product-specific database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import type { Product, StockStatus } from '../models/product.model';

export class ProductRepository extends BaseRepository<Product> {
    constructor(supabase: SupabaseClient) {
        super(supabase, 'Products');
    }

    /**
     * Find all products for a specific business
     */
    async findByBusinessId(businessId: number): Promise<{ data: Product[] | null; error: any }> {
        return this.findAll({ business_id: businessId });
    }

    /**
     * Update product stock quantity
     * Pure data access - no business logic
     * Use ProductService for business logic
     */
    async updateStock(
        productId: number,
        newStock: number
    ): Promise<{ data: Product | null; error: any }> {
        return this.update(productId, { current_stock: newStock } as Partial<Product>);
    }

    /**
     * Find products with low stock
     */
    async findLowStock(
        businessId: number,
        threshold: number = 10
    ): Promise<{ data: Product[] | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .eq('business_id', businessId)
                .lte('current_stock', threshold)
                .is('deleted_at', null)
                .order('current_stock', { ascending: true });

            return { data: data as Product[], error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Update stock status
     */
    async updateStockStatus(
        productId: number,
        status: StockStatus
    ): Promise<{ data: Product | null; error: any }> {
        return this.update(productId, { stock_status: status } as Partial<Product>);
    }

    /**
     * Find products by status
     */
    async findByStatus(
        businessId: number,
        status: StockStatus
    ): Promise<{ data: Product[] | null; error: any }> {
        return this.findAll({ business_id: businessId, stock_status: status });
    }

    /**
     * Get products with price range filter
     */
    async findByPriceRange(
        businessId: number,
        minPrice: number,
        maxPrice: number
    ): Promise<{ data: Product[] | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .eq('business_id', businessId)
                .gte('selling_price', minPrice)
                .lte('selling_price', maxPrice)
                .is('deleted_at', null);

            return { data: data as Product[], error };
        } catch (error) {
            return { data: null, error };
        }
    }
}
