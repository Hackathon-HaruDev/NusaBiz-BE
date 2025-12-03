/**
 * Transaction Repository
 * Handles transaction-specific database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import type {
    Transaction,
    TransactionWithDetails,
    TransactionType,
    TransactionStatus,
} from '../models/transaction.model';
import type { CreateTransactionDetailDTO } from '../models/transaction-detail.model';

export interface DateRangeFilter {
    startDate: string;
    endDate: string;
}

export interface TransactionFilters {
    type?: TransactionType;
    status?: TransactionStatus;
    category?: string;
    dateRange?: DateRangeFilter;
}

export class TransactionRepository extends BaseRepository<Transaction> {
    constructor(supabase: SupabaseClient) {
        super(supabase, 'Transactions');
    }

    /**
     * Find all transactions for a specific business with filters
     */
    async findByBusinessId(
        businessId: number,
        filters?: TransactionFilters,
        limit?: number
    ): Promise<{ data: Transaction[] | null; error: any }> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select('*')
                .eq('business_id', businessId)
                .is('deleted_at', null);

            // Apply filters
            if (filters?.type) {
                query = query.eq('type', filters.type);
            }
            if (filters?.status) {
                query = query.eq('status', filters.status);
            }
            if (filters?.category) {
                query = query.eq('category', filters.category);
            }
            if (filters?.dateRange) {
                query = query
                    .gte('transaction_date', filters.dateRange.startDate)
                    .lte('transaction_date', filters.dateRange.endDate);
            }

            query = query.order('transaction_date', { ascending: false });

            if (limit) {
                query = query.limit(limit);
            }

            const { data, error } = await query;
            return { data: data as Transaction[], error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Get transaction with its details
     */
    async findWithDetails(transactionId: number): Promise<{ data: TransactionWithDetails | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*, TransactionDetails(*)')
                .eq('id', transactionId)
                .is('deleted_at', null)
                .single();

            if (error) {
                return { data: null, error };
            }

            // Transform to match interface
            const result: TransactionWithDetails = {
                ...data,
                details: data.TransactionDetails || [],
            };

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Create transaction with details (atomic operation)
     */
    async createWithDetails(
        transaction: Partial<Transaction>,
        details: CreateTransactionDetailDTO[]
    ): Promise<{ data: TransactionWithDetails | null; error: any }> {
        try {
            // Start transaction by creating the main transaction
            const { data: newTransaction, error: transactionError } = await this.create(transaction);

            if (transactionError || !newTransaction) {
                return { data: null, error: transactionError };
            }

            // Create transaction details
            const detailsWithTransactionId = details.map(detail => ({
                ...detail,
                transaction_id: newTransaction.id,
            }));

            const { data: newDetails, error: detailsError } = await this.supabase
                .from('TransactionDetails')
                .insert(detailsWithTransactionId)
                .select();

            if (detailsError) {
                // Rollback: delete the transaction if details creation fails
                await this.delete(newTransaction.id);
                return { data: null, error: detailsError };
            }

            const result: TransactionWithDetails = {
                ...newTransaction,
                TransactionDetails: newDetails || [],
            };

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Get total income and expenses for a business
     */
    async getTotalsByType(
        businessId: number,
        dateRange?: DateRangeFilter
    ): Promise<{ data: { income: number; expense: number } | null; error: any }> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select('type, amount')
                .eq('business_id', businessId)
                .eq('status', 'complete')
                .is('deleted_at', null);

            if (dateRange) {
                query = query
                    .gte('transaction_date', dateRange.startDate)
                    .lte('transaction_date', dateRange.endDate);
            }

            const { data, error } = await query;

            if (error) {
                return { data: null, error };
            }

            const totals = data?.reduce(
                (acc, item) => {
                    if (item.type === 'Income') {
                        acc.income += Number(item.amount);
                    } else if (item.type === 'Expense') {
                        acc.expense += Number(item.amount);
                    }
                    return acc;
                },
                { income: 0, expense: 0 }
            );

            return { data: totals || { income: 0, expense: 0 }, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Update transaction status
     */
    async updateStatus(
        transactionId: number,
        status: TransactionStatus
    ): Promise<{ data: Transaction | null; error: any }> {
        return this.update(transactionId, { status } as Partial<Transaction>);
    }

    /**
     * Get recent transactions
     */
    async getRecent(businessId: number, limit: number = 10): Promise<{ data: Transaction[] | null; error: any }> {
        return this.findByBusinessId(businessId, undefined, limit);
    }
}
