/**
 * Transaction Detail Model
 * Represents individual line items in a transaction
 */

export interface TransactionDetail {
    id: number;
    transaction_id: number;
    product_id: number;
    quantity: number;
    unit_price_at_transaction: number;
}

/**
 * DTO for creating a new transaction detail
 */
export interface CreateTransactionDetailDTO {
    transaction_id: number;
    product_id: number;
    quantity: number;
    unit_price_at_transaction: number;
}
