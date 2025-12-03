/**
 * Transaction Service
 * Orchestrates complex transaction operations with stock and balance management
 */

import { BaseService } from './base.service';
import type {
    Transaction,
    TransactionWithDetails,
    TransactionType,
} from '../models/transaction.model';
import type { CreateTransactionDetailDTO } from '../models/transaction-detail.model';

export interface ProductSaleItem {
    productId: number;
    quantity: number;
    sellingPrice: number;
}

export interface StockPurchaseItem {
    productId: number;
    quantity: number;
    purchasePrice: number;
}

export interface RecordSaleData {
    businessId: number;
    products: ProductSaleItem[];
    description?: string;
}

export interface RecordPurchaseData {
    businessId: number;
    products: StockPurchaseItem[];
    description?: string;
}

export class TransactionService extends BaseService {
    /**
     * Record a product sale
     * - Validates stock availability
     * - Creates transaction with details (atomic)
     * - Updates product stock (decrement)
     * - Updates business balance (increment)
     * - Manual rollback on failure
     */
    async recordProductSale(data: RecordSaleData): Promise<{
        data: TransactionWithDetails | null;
        error: any;
    }> {
        const { businessId, products, description } = data;

        try {
            // Step 1: Validate stock availability for all products
            for (const item of products) {
                const { data: product, error } = await this.repos.products.findById(item.productId);

                if (error || !product) {
                    return {
                        data: null,
                        error: new Error(`Product ${item.productId} not found`),
                    };
                }

                if (product.current_stock < item.quantity) {
                    return {
                        data: null,
                        error: new Error(
                            `Insufficient stock for ${product.name}. Available: ${product.current_stock}, Required: ${item.quantity}`
                        ),
                    };
                }
            }

            // Step 2: Calculate total amount
            const totalAmount = products.reduce(
                (sum, item) => sum + item.quantity * item.sellingPrice,
                0
            );

            // Step 3: Create transaction with details (atomic within transaction table)
            const transactionDTO: Partial<Transaction> = {
                business_id: businessId,
                type: 'Income' as TransactionType,
                category: 'Sales',
                amount: totalAmount,
                description: description || 'Product sale',
                status: 'complete',
            };

            const transactionDetailsDTO: CreateTransactionDetailDTO[] = products.map((item) => ({
                transaction_id: 0, // Will be set by repository
                product_id: item.productId,
                quantity: item.quantity,
                unit_price_at_transaction: item.sellingPrice,
            }));

            const { data: transaction, error: transactionError } =
                await this.repos.transactions.createWithDetails(transactionDTO, transactionDetailsDTO);

            if (transactionError || !transaction) {
                return { data: null, error: transactionError };
            }

            // Step 4: Update product stocks (with rollback on failure)
            try {
                for (const item of products) {
                    // Get current product to calculate new stock
                    const { data: product, error: fetchError } = await this.repos.products.findById(item.productId);
                    if (fetchError || !product) {
                        await this.repos.transactions.delete(transaction.id);
                        return { data: null, error: new Error(`Product ${item.productId} not found during stock update`) };
                    }

                    // Calculate new stock (decrement for sale)
                    const newStock = product.current_stock - item.quantity;
                    const { error: stockError } = await this.repos.products.updateStock(item.productId, newStock);

                    if (stockError) {
                        // ROLLBACK: Delete transaction if stock update fails
                        await this.repos.transactions.delete(transaction.id);
                        return {
                            data: null,
                            error: new Error(`Failed to update stock for product ${item.productId}: ${stockError.message}`),
                        };
                    }
                }
            } catch (stockUpdateError) {
                // ROLLBACK: Delete transaction
                await this.repos.transactions.delete(transaction.id);
                return {
                    data: null,
                    error: new Error(`Stock update failed: ${stockUpdateError}`),
                };
            }

            // Step 5: Update business balance (with rollback on failure)
            try {
                // Get current business to calculate new balance
                const { data: business, error: fetchError } = await this.repos.businesses.findById(businessId);
                if (fetchError || !business) {
                    // ROLLBACK: Restore stock and delete transaction
                    for (const item of products) {
                        const { data: product } = await this.repos.products.findById(item.productId);
                        if (product) {
                            await this.repos.products.updateStock(item.productId, product.current_stock + item.quantity);
                        }
                    }
                    await this.repos.transactions.delete(transaction.id);
                    return { data: null, error: new Error('Business not found during balance update') };
                }

                // Calculate new balance (increment for sale)
                const newBalance = business.current_balance + totalAmount;
                const { error: balanceError } = await this.repos.businesses.updateBalance(businessId, newBalance);

                if (balanceError) {
                    // ROLLBACK: Restore stock and delete transaction
                    for (const item of products) {
                        const { data: product } = await this.repos.products.findById(item.productId);
                        if (product) {
                            await this.repos.products.updateStock(item.productId, product.current_stock + item.quantity);
                        }
                    }
                    await this.repos.transactions.delete(transaction.id);
                    return {
                        data: null,
                        error: new Error(`Failed to update balance: ${balanceError.message}`),
                    };
                }
            } catch (balanceUpdateError) {
                // ROLLBACK: Restore stock and delete transaction
                for (const item of products) {
                    const { data: product } = await this.repos.products.findById(item.productId);
                    if (product) {
                        await this.repos.products.updateStock(item.productId, product.current_stock + item.quantity);
                    }
                }
                await this.repos.transactions.delete(transaction.id);
                return {
                    data: null,
                    error: new Error(`Balance update failed: ${balanceUpdateError}`),
                };
            }

            // Success: Return transaction with details
            return { data: transaction, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Record a stock purchase
     * - Creates transaction with details (atomic)
     * - Updates product stock (increment)
     * - Updates business balance (decrement)
     * - Manual rollback on failure
     */
    async recordStockPurchase(data: RecordPurchaseData): Promise<{
        data: TransactionWithDetails | null;
        error: any;
    }> {
        const { businessId, products, description } = data;

        try {
            // Step 1: Validate products exist
            for (const item of products) {
                const { data: product, error } = await this.repos.products.findById(item.productId);

                if (error || !product) {
                    return {
                        data: null,
                        error: new Error(`Product ${item.productId} not found`),
                    };
                }
            }

            // Step 2: Calculate total amount
            const totalAmount = products.reduce(
                (sum, item) => sum + item.quantity * item.purchasePrice,
                0
            );

            // Step 3: Create transaction with details (atomic within transaction table)
            const transactionDTO: Partial<Transaction> = {
                business_id: businessId,
                type: 'Expense' as TransactionType,
                category: 'Stock Purchase',
                amount: totalAmount,
                description: description || 'Stock purchase',
                status: 'complete',
            };

            const transactionDetailsDTO: CreateTransactionDetailDTO[] = products.map((item) => ({
                transaction_id: 0, // Will be set by repository
                product_id: item.productId,
                quantity: item.quantity,
                unit_price_at_transaction: item.purchasePrice,
            }));

            const { data: transaction, error: transactionError } =
                await this.repos.transactions.createWithDetails(transactionDTO, transactionDetailsDTO);

            if (transactionError || !transaction) {
                return { data: null, error: transactionError };
            }

            // Step 4: Update product stocks (with rollback on failure)
            try {
                for (const item of products) {
                    // Get current product to calculate new stock
                    const { data: product, error: fetchError } = await this.repos.products.findById(item.productId);
                    if (fetchError || !product) {
                        await this.repos.transactions.delete(transaction.id);
                        return { data: null, error: new Error(`Product ${item.productId} not found during stock update`) };
                    }

                    // Calculate new stock (increment for purchase)
                    const newStock = product.current_stock + item.quantity;
                    const { error: stockError } = await this.repos.products.updateStock(item.productId, newStock);

                    if (stockError) {
                        // ROLLBACK: Delete transaction if stock update fails
                        await this.repos.transactions.delete(transaction.id);
                        return {
                            data: null,
                            error: new Error(`Failed to update stock for product ${item.productId}: ${stockError.message}`),
                        };
                    }
                }
            } catch (stockUpdateError) {
                // ROLLBACK: Delete transaction
                await this.repos.transactions.delete(transaction.id);
                return {
                    data: null,
                    error: new Error(`Stock update failed: ${stockUpdateError}`),
                };
            }

            // Step 5: Update business balance (with rollback on failure)
            try {
                // Get current business to calculate new balance
                const { data: business, error: fetchError } = await this.repos.businesses.findById(businessId);
                if (fetchError || !business) {
                    // ROLLBACK: Restore stock and delete transaction
                    for (const item of products) {
                        const { data: product } = await this.repos.products.findById(item.productId);
                        if (product) {
                            await this.repos.products.updateStock(item.productId, product.current_stock - item.quantity);
                        }
                    }
                    await this.repos.transactions.delete(transaction.id);
                    return { data: null, error: new Error('Business not found during balance update') };
                }

                // Calculate new balance (decrement for purchase)
                const newBalance = business.current_balance - totalAmount;
                const { error: balanceError } = await this.repos.businesses.updateBalance(businessId, newBalance);

                if (balanceError) {
                    // ROLLBACK: Restore stock and delete transaction
                    for (const item of products) {
                        const { data: product } = await this.repos.products.findById(item.productId);
                        if (product) {
                            await this.repos.products.updateStock(item.productId, product.current_stock - item.quantity);
                        }
                    }
                    await this.repos.transactions.delete(transaction.id);
                    return {
                        data: null,
                        error: new Error(`Failed to update balance: ${balanceError.message}`),
                    };
                }
            } catch (balanceUpdateError) {
                // ROLLBACK: Restore stock and delete transaction
                for (const item of products) {
                    const { data: product } = await this.repos.products.findById(item.productId);
                    if (product) {
                        await this.repos.products.updateStock(item.productId, product.current_stock - item.quantity);
                    }
                }
                await this.repos.transactions.delete(transaction.id);
                return {
                    data: null,
                    error: new Error(`Balance update failed: ${balanceUpdateError}`),
                };
            }

            // Success: Return transaction with details
            return { data: transaction, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }
}
