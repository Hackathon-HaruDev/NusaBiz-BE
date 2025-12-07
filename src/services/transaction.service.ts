/**
 * Transaction Service
 * Orchestrates complex transaction operations with stock and balance management
 */

import { BaseService } from "./base.service";
import type {
  Transaction,
  TransactionWithDetails,
  TransactionType,
  TransactionStatus,
} from "../models/transaction.model";
import type { CreateTransactionDetailDTO } from "../models/transaction-detail.model";

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
        const { data: product, error } = await this.repos.products.findById(
          item.productId
        );

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
        type: "Income" as TransactionType,
        category: "Sales",
        amount: totalAmount,
        description: description || "Product sale",
        status: "complete",
      };

      const transactionDetailsDTO: CreateTransactionDetailDTO[] = products.map(
        (item) => ({
          transaction_id: 0, // Will be set by repository
          product_id: item.productId,
          quantity: item.quantity,
          unit_price_at_transaction: item.sellingPrice,
        })
      );

      const { data: transaction, error: transactionError } =
        await this.repos.transactions.createWithDetails(
          transactionDTO,
          transactionDetailsDTO
        );

      if (transactionError || !transaction) {
        return { data: null, error: transactionError };
      }

      // Step 4: Update product stocks (with rollback on failure)
      try {
        for (const item of products) {
          // Get current product to calculate new stock
          const { data: product, error: fetchError } =
            await this.repos.products.findById(item.productId);
          if (fetchError || !product) {
            await this.repos.transactions.delete(transaction.id);
            return {
              data: null,
              error: new Error(
                `Product ${item.productId} not found during stock update`
              ),
            };
          }

          // Calculate new stock (decrement for sale)
          const newStock = product.current_stock - item.quantity;
          const { error: stockError } = await this.repos.products.updateStock(
            item.productId,
            newStock
          );

          if (stockError) {
            // ROLLBACK: Delete transaction if stock update fails
            await this.repos.transactions.delete(transaction.id);
            return {
              data: null,
              error: new Error(
                `Failed to update stock for product ${item.productId}: ${stockError.message}`
              ),
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
        const { data: business, error: fetchError } =
          await this.repos.businesses.findById(businessId);
        if (fetchError || !business) {
          // ROLLBACK: Restore stock and delete transaction
          for (const item of products) {
            const { data: product } = await this.repos.products.findById(
              item.productId
            );
            if (product) {
              await this.repos.products.updateStock(
                item.productId,
                product.current_stock + item.quantity
              );
            }
          }
          await this.repos.transactions.delete(transaction.id);
          return {
            data: null,
            error: new Error("Business not found during balance update"),
          };
        }

        // Calculate new balance (increment for sale)
        const newBalance = business.current_balance + totalAmount;
        const { error: balanceError } =
          await this.repos.businesses.updateBalance(businessId, newBalance);

        if (balanceError) {
          // ROLLBACK: Restore stock and delete transaction
          for (const item of products) {
            const { data: product } = await this.repos.products.findById(
              item.productId
            );
            if (product) {
              await this.repos.products.updateStock(
                item.productId,
                product.current_stock + item.quantity
              );
            }
          }
          await this.repos.transactions.delete(transaction.id);
          return {
            data: null,
            error: new Error(
              `Failed to update balance: ${balanceError.message}`
            ),
          };
        }
      } catch (balanceUpdateError) {
        // ROLLBACK: Restore stock and delete transaction
        for (const item of products) {
          const { data: product } = await this.repos.products.findById(
            item.productId
          );
          if (product) {
            await this.repos.products.updateStock(
              item.productId,
              product.current_stock + item.quantity
            );
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
        const { data: product, error } = await this.repos.products.findById(
          item.productId
        );

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
        type: "Expense" as TransactionType,
        category: "Stock Purchase",
        amount: totalAmount,
        description: description || "Stock purchase",
        status: "complete",
      };

      const transactionDetailsDTO: CreateTransactionDetailDTO[] = products.map(
        (item) => ({
          transaction_id: 0, // Will be set by repository
          product_id: item.productId,
          quantity: item.quantity,
          unit_price_at_transaction: item.purchasePrice,
        })
      );

      const { data: transaction, error: transactionError } =
        await this.repos.transactions.createWithDetails(
          transactionDTO,
          transactionDetailsDTO
        );

      if (transactionError || !transaction) {
        return { data: null, error: transactionError };
      }

      // Step 4: Update product stocks (with rollback on failure)
      try {
        for (const item of products) {
          // Get current product to calculate new stock
          const { data: product, error: fetchError } =
            await this.repos.products.findById(item.productId);
          if (fetchError || !product) {
            await this.repos.transactions.delete(transaction.id);
            return {
              data: null,
              error: new Error(
                `Product ${item.productId} not found during stock update`
              ),
            };
          }

          // Calculate new stock (increment for purchase)
          const newStock = product.current_stock + item.quantity;
          const { error: stockError } = await this.repos.products.updateStock(
            item.productId,
            newStock
          );

          if (stockError) {
            // ROLLBACK: Delete transaction if stock update fails
            await this.repos.transactions.delete(transaction.id);
            return {
              data: null,
              error: new Error(
                `Failed to update stock for product ${item.productId}: ${stockError.message}`
              ),
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
        const { data: business, error: fetchError } =
          await this.repos.businesses.findById(businessId);
        if (fetchError || !business) {
          // ROLLBACK: Restore stock and delete transaction
          for (const item of products) {
            const { data: product } = await this.repos.products.findById(
              item.productId
            );
            if (product) {
              await this.repos.products.updateStock(
                item.productId,
                product.current_stock - item.quantity
              );
            }
          }
          await this.repos.transactions.delete(transaction.id);
          return {
            data: null,
            error: new Error("Business not found during balance update"),
          };
        }

        // Calculate new balance (decrement for purchase)
        const newBalance = business.current_balance - totalAmount;
        const { error: balanceError } =
          await this.repos.businesses.updateBalance(businessId, newBalance);

        if (balanceError) {
          // ROLLBACK: Restore stock and delete transaction
          for (const item of products) {
            const { data: product } = await this.repos.products.findById(
              item.productId
            );
            if (product) {
              await this.repos.products.updateStock(
                item.productId,
                product.current_stock - item.quantity
              );
            }
          }
          await this.repos.transactions.delete(transaction.id);
          return {
            data: null,
            error: new Error(
              `Failed to update balance: ${balanceError.message}`
            ),
          };
        }
      } catch (balanceUpdateError) {
        // ROLLBACK: Restore stock and delete transaction
        for (const item of products) {
          const { data: product } = await this.repos.products.findById(
            item.productId
          );
          if (product) {
            await this.repos.products.updateStock(
              item.productId,
              product.current_stock - item.quantity
            );
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
   * Create general transaction (Income/Expense) without products
   * - Creates transaction
   * - Updates business balance
   * - Manual rollback on failure
   */
  async createGeneralTransaction(data: {
    businessId: number;
    type: TransactionType;
    category?: string;
    amount: number;
    description?: string;
    status?: TransactionStatus;
  }): Promise<{
    data: Transaction | null;
    error: any;
  }> {
    const { businessId, type, category, amount, description, status } = data;

    try {
      // Step 1: Create transaction
      const transactionDTO: Partial<Transaction> = {
        business_id: businessId,
        type: type,
        category: category || null,
        amount: amount,
        description: description || null,
        status: status || "complete", // Default to complete for balance update
      };

      const { data: transaction, error: transactionError } =
        await this.repos.transactions.create(transactionDTO);

      if (transactionError || !transaction) {
        return { data: null, error: transactionError };
      }

      // Only update balance if status is complete
      if (transaction.status === "complete") {
        // Step 2: Update business balance (with rollback on failure)
        try {
          // Get current business to calculate new balance
          const { data: business, error: fetchError } =
            await this.repos.businesses.findById(businessId);
          if (fetchError || !business) {
            // ROLLBACK: Delete transaction
            await this.repos.transactions.delete(transaction.id);
            return {
              data: null,
              error: new Error("Business not found during balance update"),
            };
          }

          // Calculate new balance
          let newBalance = business.current_balance;
          if (type === "Income") {
            newBalance += amount;
          } else {
            newBalance -= amount;
          }

          const { error: balanceError } =
            await this.repos.businesses.updateBalance(businessId, newBalance);

          if (balanceError) {
            // ROLLBACK: Delete transaction
            await this.repos.transactions.delete(transaction.id);
            return {
              data: null,
              error: new Error(
                `Failed to update balance: ${balanceError.message}`
              ),
            };
          }
        } catch (balanceUpdateError) {
          // ROLLBACK: Delete transaction
          await this.repos.transactions.delete(transaction.id);
          return {
            data: null,
            error: new Error(`Balance update failed: ${balanceUpdateError}`),
          };
        }
      }

      return { data: transaction, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  /**
   * Delete transaction
   * - Reverses business balance
   * - Reverses product stock (if applicable)
   * - Soft deletes transaction
   */
  async deleteTransaction(
    businessId: number,
    transactionId: number
  ): Promise<{
    success: boolean;
    error: any;
  }> {
    try {
      // Get transaction with details
      const { data: transaction, error: findError } =
        await this.repos.transactions.findWithDetails(transactionId);

      if (findError || !transaction) {
        return { success: false, error: new Error("Transaction not found") };
      }

      if (transaction.business_id !== businessId) {
        return {
          success: false,
          error: new Error("Transaction does not belong to this business"),
        };
      }

      // Only reverse effects if transaction was previously complete
      if (transaction.status === "complete") {
        // 1. Reverse Balance
        const { data: business, error: bizError } =
          await this.repos.businesses.findById(businessId);

        // Proceed even if business check fails? No, critical for balance.
        if (!bizError && business) {
          let newBalance = business.current_balance;

          // IF Income (e.g. Sales) -> Subtract amount (Reverse)
          // IF Expense (e.g. Purchase) -> Add amount (Reverse)
          if (transaction.type === "Income") {
            newBalance -= transaction.amount;
          } else {
            newBalance += transaction.amount;
          }

          await this.repos.businesses.updateBalance(businessId, newBalance);
        }

        // 2. Reverse Stock (if transaction has product details)
        // Check if TransactionDetails exists (TransactionWithDetails)
        const details = (transaction as any).TransactionDetails;
        if (details && Array.isArray(details) && details.length > 0) {
          for (const detail of details) {
            const { data: product } = await this.repos.products.findById(
              detail.product_id
            );
            if (product) {
              let newStock = product.current_stock;

              // IF Income (Sales) -> Stock was decreased -> Add it back
              // IF Expense (Purchase) -> Stock was increased -> Remove it
              if (transaction.type === "Income") {
                newStock += detail.quantity;
              } else {
                newStock -= detail.quantity;
              }

              await this.repos.products.updateStock(
                detail.product_id,
                newStock
              );
            }
          }
        }
      }

      // 3. Soft Delete Transaction
      const { error: deleteError } = await this.repos.transactions.softDelete(
        transactionId
      );

      if (deleteError) {
        return { success: false, error: deleteError };
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error };
    }
  }

  /**
   * Update general transaction
   * - Handles amount changes (adjusts balance)
   * - Updates details
   */
  async updateGeneralTransaction(
    businessId: number,
    transactionId: number,
    data: {
      amount?: number;
      category?: string;
      description?: string;
      status?: TransactionStatus;
      date?: string;
    }
  ): Promise<{ data: Transaction | null; error: any }> {
    try {
      // 1. Get existing transaction
      const { data: oldTransaction, error: findError } =
        await this.repos.transactions.findById(transactionId);

      if (findError || !oldTransaction) {
        return { data: null, error: new Error("Transaction not found") };
      }

      if (oldTransaction.business_id !== businessId) {
        return {
          data: null,
          error: new Error("Transaction does not belong to this business"),
        };
      }

      // 2. Prepare update payload
      const updates: any = {};
      if (data.category !== undefined) updates.category = data.category;
      if (data.description !== undefined)
        updates.description = data.description;
      if (data.status !== undefined) updates.status = data.status;
      if (data.date !== undefined) updates.transaction_date = data.date;
      if (data.amount !== undefined) updates.amount = data.amount;

      // 3. Handle Balance Update if amount changed
      if (
        data.amount !== undefined &&
        data.amount !== oldTransaction.amount &&
        oldTransaction.status === "complete"
      ) {
        const { data: business } = await this.repos.businesses.findById(
          businessId
        );
        if (business) {
          let currentBalance = business.current_balance;

          // Revert old amount
          if (oldTransaction.type === "Income") {
            currentBalance -= oldTransaction.amount;
          } else {
            currentBalance += oldTransaction.amount;
          }

          // Apply new amount
          if (oldTransaction.type === "Income") {
            currentBalance += data.amount;
          } else {
            currentBalance -= data.amount;
          }

          // Update balance
          await this.repos.businesses.updateBalance(businessId, currentBalance);
        }
      }

      // 4. Update Transaction
      const { data: updatedTx, error: updateError } =
        await this.repos.transactions.update(transactionId, updates);

      if (updateError) {
        return { data: null, error: updateError };
      }

      return { data: updatedTx, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}
