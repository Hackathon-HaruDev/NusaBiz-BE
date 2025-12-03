/**
 * Supabase Client Configuration
 * Initialize and export Supabase client, repositories, and services
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserRepository } from '../../repositories/user.repository';
import { BusinessRepository } from '../../repositories/business.repository';
import { ProductRepository } from '../../repositories/product.repository';
import { TransactionRepository } from '../../repositories/transaction.repository';
import { ChatRepository } from '../../repositories/chat.repository';
import { MessageRepository } from '../../repositories/message.repository';
import { createServices } from '../../services/index';
import type { Repositories } from '../../services/index';
import type { Services } from '../../services/index';
import dotenv from 'dotenv';

dotenv.config();

// Environment variables - replace with your actual values or use .env
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn(
        'Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file'
    );
}

/**
 * Supabase client instance
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Initialize all repositories with the Supabase client
 */
export function createRepositories(): Repositories {
    return {
        users: new UserRepository(supabase),
        businesses: new BusinessRepository(supabase),
        products: new ProductRepository(supabase),
        transactions: new TransactionRepository(supabase),
        chats: new ChatRepository(supabase),
        messages: new MessageRepository(supabase),
    };
}

/**
 * Initialize all services with repositories
 * Complete application setup with both data access and business logic
 */
export function initializeApp(): { repos: Repositories; services: Services } {
    const repos = createRepositories();
    const services = createServices(repos);

    return { repos, services };
}
