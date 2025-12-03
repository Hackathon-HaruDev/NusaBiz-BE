/**
 * Business Model
 * Represents a business entity in the system
 */

import type { Product } from './product.model';
import type { Transaction } from './transaction.model';

export interface Business {
    id: number;
    user_id: number;
    business_name: string;
    category: string | null;
    location: string | null;
    current_balance: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

/**
 * Business with Products joined
 * Matches Supabase join response
 */
export interface BusinessWithProducts extends Business {
    Products: Product[];
}

/**
 * Business with Transactions joined
 * Matches Supabase join response
 */
export interface BusinessWithTransactions extends Business {
    Transactions: Transaction[];
}

/**
 * DTO for creating a new business
 */
export interface CreateBusinessDTO {
    user_id: number;
    business_name: string;
    category?: string;
    location?: string;
    current_balance?: number;
}

/**
 * DTO for updating an existing business
 */
export interface UpdateBusinessDTO {
    business_name?: string;
    category?: string;
    location?: string;
    current_balance?: number;
}
