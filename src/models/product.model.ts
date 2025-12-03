/**
 * Product Model
 * Represents a product in a business inventory
 */

export type StockStatus = 'active' | 'inactive' | 'low' | 'out';

export interface Product {
    id: number;
    business_id: number;
    name: string;
    current_stock: number;
    purchase_price: number | null;
    selling_price: number | null;
    stock_status: StockStatus;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

/**
 * DTO for creating a new product
 */
export interface CreateProductDTO {
    business_id: number;
    name: string;
    current_stock?: number;
    purchase_price?: number;
    selling_price?: number;
    stock_status?: StockStatus;
}

/**
 * DTO for updating an existing product
 */
export interface UpdateProductDTO {
    name?: string;
    current_stock?: number;
    purchase_price?: number;
    selling_price?: number;
    stock_status?: StockStatus;
}
