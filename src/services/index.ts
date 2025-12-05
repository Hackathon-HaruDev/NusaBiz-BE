/**
 * Services Barrel Export
 * Centralized export for all services with service factory
 */

export { BaseService } from './base.service';
export type { Repositories } from './base.service';

export { TransactionService } from './transaction.service';
export type {
    ProductSaleItem,
    StockPurchaseItem,
    RecordSaleData,
    RecordPurchaseData,
} from './transaction.service';

export { ProductService } from './product.service';

export { BusinessService } from './business.service';
export type { BalanceSummary } from './business.service';

export { AIService } from './ai.service';
export type { ChatInteraction } from './ai.service';

// Re-export Repositories type from base
import type { Repositories } from './base.service';
import { TransactionService } from './transaction.service';
import { ProductService } from './product.service';
import { BusinessService } from './business.service';
import { AIService } from './ai.service';
import { User } from '../models';
import { UserService } from './user.service';

/**
 * Service factory
 * Creates all services with dependency-injected repositories
 */
export function createServices(repos: Repositories) {
    return {
        user: new UserService(repos),
        transaction: new TransactionService(repos),
        product: new ProductService(repos),
        business: new BusinessService(repos),
        ai: new AIService(repos),
    };
}

/**
 * Services interface
 */
export interface Services {
    user: UserService;
    transaction: TransactionService;
    product: ProductService;
    business: BusinessService;
    ai: AIService;
}
