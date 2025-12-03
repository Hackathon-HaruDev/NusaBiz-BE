/**
 * User Repository
 * Handles user-specific database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import type { User } from '../models/user.model';

export class UserRepository extends BaseRepository<User> {
    constructor(supabase: SupabaseClient) {
        super(supabase, 'Users');
    }

    /**
     * Find user by email
     */
    async findByEmail(email: string): Promise<{ data: User | null; error: any }> {
        return this.findOne({ email });
    }

    /**
     * Find user with their businesses
     */
    async findWithBusinesses(userId: number): Promise<{ data: any | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*, Businesses(*)')
                .eq('id', userId)
                .is('deleted_at', null)
                .single();

            return { data, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Check if email already exists
     */
    async emailExists(email: string, excludeUserId?: number): Promise<{ exists: boolean; error: any }> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select('id')
                .eq('email', email)
                .is('deleted_at', null);

            if (excludeUserId) {
                query = query.neq('id', excludeUserId);
            }

            const { data, error } = await query;

            return { exists: (data?.length || 0) > 0, error };
        } catch (error) {
            return { exists: false, error };
        }
    }
}
