/**
 * Business Service
 * Provides business analytics and summary data
 */

import { BaseService } from './base.service';
import type { Business } from '../models/business.model';
import type { DateRangeFilter } from '../repositories/transaction.repository';

export interface BalanceSummary {
    business: Business;
    totalIncome: number;
    totalExpense: number;
    currentBalance: number;
    netProfit: number;
    dateRange?: DateRangeFilter;
}

export class BusinessService extends BaseService {
    /**
     * Get comprehensive balance summary for dashboard
     * Includes:
     * - Business details
     * - Total income
     * - Total expense
     * - Current balance (from database)
     * - Net profit (income - expense)
     */
    async getBalanceSummary(
        businessId: number,
        dateRange?: DateRangeFilter
    ): Promise<{ data: BalanceSummary | null; error: any }> {
        try {
            // Step 1: Get business details
            const { data: business, error: businessError } = await this.repos.businesses.findById(
                businessId
            );

            if (businessError || !business) {
                return {
                    data: null,
                    error: businessError || new Error('Business not found'),
                };
            }

            // Step 2: Get income and expense totals
            const { data: totals, error: totalsError } = await this.repos.transactions.getTotalsByType(
                businessId,
                dateRange
            );

            if (totalsError || !totals) {
                return {
                    data: null,
                    error: totalsError || new Error('Failed to fetch totals'),
                };
            }

            // Step 3: Calculate net profit
            const netProfit = totals.income - totals.expense;

            // Step 4: Compile summary
            const summary: BalanceSummary = {
                business,
                totalIncome: totals.income,
                totalExpense: totals.expense,
                currentBalance: business.current_balance,
                netProfit,
                dateRange,
            };

            return { data: summary, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Get business overview with product and transaction counts
     */
    async getBusinessOverview(businessId: number): Promise<{
        data: {
            business: Business;
            productCount: number;
            transactionCount: number;
            lowStockCount: number;
        } | null;
        error: any;
    }> {
        try {
            // Get business
            const { data: business, error: businessError } = await this.repos.businesses.findById(
                businessId
            );

            if (businessError || !business) {
                return { data: null, error: businessError || new Error('Business not found') };
            }

            // Get counts
            const { count: productCount } = await this.repos.products.count({ business_id: businessId });
            const { count: transactionCount } = await this.repos.transactions.count({
                business_id: businessId,
            });
            const { data: lowStockProducts } = await this.repos.products.findLowStock(businessId, 10);

            return {
                data: {
                    business,
                    productCount: productCount || 0,
                    transactionCount: transactionCount || 0,
                    lowStockCount: lowStockProducts?.length || 0,
                },
                error: null,
            };
        } catch (error) {
            return { data: null, error };
        }
    }
}
