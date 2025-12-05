/**
 * Chat Repository
 * Handles chat-specific database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import type { Chat, ChatWithMessages } from '../models/chat.model';

export class ChatRepository extends BaseRepository<Chat> {
    constructor(supabase: SupabaseClient) {
        super(supabase, 'Chat');
    }

    /**
     * Find all chats for a specific user
     */
    async findByUserId(userId: number): Promise<{ data: Chat[] | null; error: any }> {
        return this.findAll({ user_id: userId }, { orderBy: { column: 'created_at', ascending: false } });
    }

    /**
     * Get chat with its messages
     */
    async findWithMessages(
        chatId: number,
        messageLimit?: number
    ): Promise<{ data: ChatWithMessages | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName)
                .select(`*, Messages(*)`)
                .eq('id', chatId)
                .is('deleted_at', null)
                .single();

            if (error) {
                return { data: null, error };
            }

            // Transform to match interface
            let messages = data.Messages || [];

            // Apply limit if specified
            if (messageLimit && messages.length > messageLimit) {
                messages = messages.slice(-messageLimit);
            }

            const result: ChatWithMessages = {
                ...data,
                messages,
            };

            return { data: result, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Finds a chat by its ID and ensures it belongs to the given user ID (security check).
     */
    async findByIdAndUserId(
        chatId: number,
        userId: string // Menggunakan UUID user dari req.user.id
    ): Promise<{ data: Chat | null; error: any }> {
        try {
            const { data, error } = await this.supabase
                .from(this.tableName) // Asumsi this.tableName adalah 'Chat'
                .select('*')
                .eq('id', chatId)
                .eq('user_id', userId) // ⬅️ Kunci Keamanan: Memastikan user_id cocok
                .maybeSingle(); // Gunakan maybeSingle karena kita hanya berharap 0 atau 1 hasil.

            return { data: data as Chat, error };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Get or create chat for a user
     */
    async createNewChat(userId: string): Promise<{ data: Chat | null; error: any }> {
        return this.create({ user_id: userId } as Partial<Chat>);
    }

    async findLatestChat(userId: string): Promise<{ data: Chat | null; error: any }> {
        const { data, error } = await this.findAll(
            { user_id: userId }, 
            {
                orderBy: { column: 'created_at', ascending: false },
                limit: 1 // Ambil hanya 1 record (yang paling atas = terbaru)
            }
        );

        if (error || !data || data.length === 0) {
            return { data: null, error };
        }
        
        // Kembalikan objek tunggal
        return { data: data[0], error: null };
    }
}
