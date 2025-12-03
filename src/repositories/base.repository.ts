/**
 * Base Repository
 * Generic CRUD operations for all Supabase tables
 */

import { SupabaseClient } from '@supabase/supabase-js';

export interface QueryFilters {
    [key: string]: any;
}

export interface QueryOptions {
    select?: string;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
    offset?: number;
}

export class BaseRepository<T> {
    protected supabase: SupabaseClient;
    protected tableName: string;

    constructor(supabase: SupabaseClient, tableName: string) {
        this.supabase = supabase;
        this.tableName = tableName;
    }

    /**
     * Find all records with optional filters
     */
    async findAll(
        filters?: QueryFilters,
        options?: QueryOptions
    ): Promise<{ data: T[] | null; error: any }> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select(options?.select || '*')
                .is('deleted_at', null);

            // Apply filters
            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        query = query.eq(key, value);
                    }
                });
            }

            // Apply ordering
            if (options?.orderBy) {
                query = query.order(options.orderBy.column, {
                    ascending: options.orderBy.ascending ?? true,
                });
            }

            // Apply pagination
            if (options?.limit) {
                query = query.limit(options.limit);
            }
            if (options?.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
            }

            const { data, error } = await query;
            return { data: data as T[], error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Find a single record by ID
     */
    async findById(id: number): Promise<{ data: T | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select('*')
                .eq('id', id)
                .is('deleted_at', null)
                .single();

            return { data: data as T, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Find one record matching filters
     */
    async findOne(filters: QueryFilters): Promise<{ data: T | null; error: any }> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select('*')
                .is('deleted_at', null);

            Object.entries(filters).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    query = query.eq(key, value);
                }
            });

            const { data, error } = await query.single();
            return { data: data as T, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Create a new record
     */
    async create(data: Partial<T>): Promise<{ data: T | null; error: any }> {
        try {
            const { data: result, error } = await this.supabase
                .from(this.tableName)
                .insert(data)
                .select()
                .single();

            return { data: result as T, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Update an existing record
     */
    async update(id: number, data: Partial<T>): Promise<{ data: T | null; error: any }> {
        try {
            const updateData = {
                ...data,
                updated_at: new Date().toISOString(),
            };

            const { data: result, error } = await this.supabase
                .from(this.tableName)
                .update(updateData)
                .eq('id', id)
                .is('deleted_at', null)
                .select()
                .single();

            return { data: result as T, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Hard delete a record
     */
    async delete(id: number): Promise<{ error: any }> {
        try {
            const { error } = await this.supabase
                .from(this.tableName)
                .delete()
                .eq('id', id);

            return { error };
        } catch (error) {
            return { error };
        }
    }

    /**
     * Soft delete a record (set deleted_at timestamp)
     */
    async softDelete(id: number): Promise<{ data: T | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .update({ deleted_at: new Date().toISOString() })
                .eq('id', id)
                .is('deleted_at', null)
                .select()
                .single();

            return { data: data as T, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Restore a soft-deleted record
     */
    async restore(id: number): Promise<{ data: T | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .update({
                    deleted_at: null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', id)
                .select()
                .single();

            return { data: data as T, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Count records matching filters
     */
    async count(filters?: QueryFilters): Promise<{ count: number | null; error: any }> {
        try {
            let query = this.supabase
                .from(this.tableName)
                .select('*', { count: 'exact', head: true })
                .is('deleted_at', null);

            if (filters) {
                Object.entries(filters).forEach(([key, value]) => {
                    if (value !== undefined && value !== null) {
                        query = query.eq(key, value);
                    }
                });
            }

            const { count, error } = await query;
            return { count, error };
        } catch (error) {
            return { count: null, error };
        }
    }
}
