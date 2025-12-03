export interface User {
  id: number;
  email: string;
  full_name: string;
  whatsapp_number?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface Business {
  id: number;
  user_id: number;
  business_name: string;
  category: string;
  location?: string;
  current_balance: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type StockStatus = 'active' | 'inactive' | 'low' | 'out';
export interface Product {
  id: number;
  business_id: number;
  name: string;
  current_stock: number;
  purchase_price: number;
  selling_price: number;
  stock_status: StockStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type TransactionType = 'Income' | 'Expense';
export type TransactionStatus = 'pending' | 'complete' | 'cancel';
export interface Transaction {
  id: number;
  business_id: number;
  transaction_date: string;
  type: TransactionType;
  category: string;
  amount: number;
  description?: string;
  status: TransactionStatus;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface TransactionDetail {
  id: number;
  transaction_id: number;
  product_id: number;
  quantity: number;
  unit_price_at_transaction: number;
}

export interface Chat {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export type MessageSender = 'User' | 'Bot';
export interface Message {
  id: number;
  sender: MessageSender;
  content: string;
  chat_id: number;
  created_at: string;
  deleted_at?: string;
}