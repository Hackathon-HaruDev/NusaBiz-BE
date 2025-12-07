/**
 * Message Repository
 * Handles message-specific database operations
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { BaseRepository } from './base.repository';
import type { Message, MessageSender } from '../models/message.model';

export class MessageRepository extends BaseRepository<Message> {
    constructor(supabase: SupabaseClient) {
        super(supabase, 'Messages');
    }

    /**
     * Find all messages for a specific chat
     */
    async findByChatId(
        chatId: number,
        limit?: number,
        offset?: number
    ): Promise<{ data: Message[] | null; error: any }> {
        return this.findAll(
            { chat_id: chatId },
            {
                orderBy: { column: 'created_at', ascending: true },
                limit,
                offset,
            }
        );
    }

    /**
     * Create a bot message (helper method)
     */
    async createBotMessage(chatId: number, content: string): Promise<{ data: Message | null; error: any }> {
        return this.create({
            chat_id: chatId,
            sender: 'Bot' as MessageSender,
            content,
        } as Partial<Message>);
    }

    /**
     * Create a user message (helper method)
     */
    async createUserMessage(chatId: number, content: string): Promise<{ data: Message | null; error: any }> {
        return this.create({
            chat_id: chatId,
            sender: 'User' as MessageSender,
            content,
        } as Partial<Message>);
    }

    /**
     * Get recent messages
     */
    async getRecent(chatId: number, limit: number = 50): Promise<{ data: Message[] | null; error: any }> {
        return this.findByChatId(chatId, limit);
    }

    /**
     * Count messages in a chat
     */
    async countByChatId(chatId: number): Promise<{ count: number | null; error: any }> {
        return this.count({ chat_id: chatId });
    }

    /**
     * Soft deletes all messages associated with a specific chat ID.
     */
    async softDeleteByChatId(chatId: number): Promise<{ error: any }> {
        try {
            // Melakukan batch update pada kolom deleted_at
            const { error } = await this.supabase
                .from(this.tableName)
                .update({ deleted_at: new Date().toISOString() })
                .eq('chat_id', chatId) // Kunci yang digunakan adalah chat_id
                .is('deleted_at', null);

            return { error };
        } catch (error) {
            return { error };
        }
    }
}
