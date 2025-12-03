/**
 * Base Service
 * Abstract base class for all services with repository injection
 */

import type { UserRepository } from '../repositories/user.repository';
import type { BusinessRepository } from '../repositories/business.repository';
import type { ProductRepository } from '../repositories/product.repository';
import type { TransactionRepository } from '../repositories/transaction.repository';
import type { ChatRepository } from '../repositories/chat.repository';
import type { MessageRepository } from '../repositories/message.repository';

/**
 * Repositories interface for dependency injection
 */
export interface Repositories {
    users: UserRepository;
    businesses: BusinessRepository;
    products: ProductRepository;
    transactions: TransactionRepository;
    chats: ChatRepository;
    messages: MessageRepository;
}

/**
 * Abstract base service class
 * All services extend this class to get access to repositories
 */
export abstract class BaseService {
    protected repos: Repositories;

    constructor(repositories: Repositories) {
        this.repos = repositories;
    }
}
