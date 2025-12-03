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
     * Get or create chat for a user
     */
    async getOrCreateForUser(userId: number): Promise<{ data: Chat | null; error: any }> {
        try {
            // Try to find existing active chat
            const { data: existingChat } = await this.findOne({ user_id: userId });

            if (existingChat) {
                return { data: existingChat, error: null };
            }

            // Create new chat if not found
            return this.create({ user_id: userId } as Partial<Chat>);
        } catch (error) {
            return { data: null, error };
        }
    }
}
