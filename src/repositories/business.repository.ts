/**
 * Business Repository
 * Handles business-specific database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import type { Business, BusinessWithProducts, BusinessWithTransactions } from '../models/business.model';

export class BusinessRepository extends BaseRepository<Business> {
    constructor(supabase: SupabaseClient) {
        super(supabase, 'Businesses');
    }

    /**
     * Find all businesses for a specific user
     */
    async findByUserId(userId: number): Promise<{ data: Business[] | null; error: any }> {
        return this.findAll({ user_id: userId });
    }

    /**
     * Update business balance
     * Pure data access - no business logic
     * Use BusinessService for business logic
     */
    async updateBalance(
        businessId: number,
        newBalance: number
    ): Promise<{ data: Business | null; error: any }> {
        return this.update(businessId, { current_balance: newBalance } as Partial<Business>);
    }

    /**
     * Get business with its products
     */
    async getBusinessWithProducts(businessId: number): Promise<{ data: BusinessWithProducts | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*, Products(*)')
                .eq('id', businessId)
                .is('deleted_at', null)
                .single();

            return { data: data as BusinessWithProducts, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Get business with transactions
     */
    async getBusinessWithTransactions(
        businessId: number,
        limit?: number
    ): Promise<{ data: BusinessWithTransactions | null; error: any }> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select('*, Transactions(*)')
                .eq('id', businessId)
                .is('deleted_at', null);

            if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query.single();

            return { data: data as BusinessWithTransactions, error };
        } catch (error) {
            return { data: null, error };
        }
    }
}

