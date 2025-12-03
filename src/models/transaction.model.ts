/**
 * Transaction Model
 * Represents financial transactions for a business
 */

import type { Product } from './product.model';

export type TransactionType = 'Income' | 'Expense';
export type TransactionStatus = 'pending' | 'complete' | 'cancel';

export interface Transaction {
    id: number;
    business_id: number;
    transaction_date: string;
    type: TransactionType;
    category: string | null;
    amount: number;
    description: string | null;
    status: TransactionStatus;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

/**
 * Transaction Detail with Product information (joined)
 * Represents the result of joining TransactionDetails with Products table
 * Field name 'Products' matches Supabase join response
 */
export interface TransactionDetailJoined {
    id: number;
    transaction_id: number;
    product_id: number;
    quantity: number;
    unit_price_at_transaction: number;
    // Product information from join (Supabase returns 'Products' not 'product')
    Products?: Pick<Product, 'id' | 'name'>;
}

/**
 * Transaction with details joined
 * Field name 'TransactionDetails' matches Supabase join response
 */
export interface TransactionWithDetails extends Transaction {
    TransactionDetails: TransactionDetailJoined[];
}

/**
 * DTO for creating a new transaction
 */
export interface CreateTransactionDTO {
    business_id: number;
    transaction_date?: string;
    type: TransactionType;
    category?: string;
    amount: number;
    description?: string;
    status?: TransactionStatus;
}

/**
 * DTO for updating an existing transaction
 */
export interface UpdateTransactionDTO {
    transaction_date?: string;
    type?: TransactionType;
    category?: string;
    amount?: number;
    description?: string;
    status?: TransactionStatus;
}
