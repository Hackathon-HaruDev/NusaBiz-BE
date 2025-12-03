/**
 * AI Service
 * Handles AI chat interactions (simulated for MVP)
 */

import { BaseService } from './base.service';
import type { Chat } from '../models/chat.model';
import type { Message } from '../models/message.model';

export interface ChatInteraction {
    chat: Chat;
    userMessage: Message;
    botResponse: Message;
}

export class AIService extends BaseService {
    /**
     * Process AI chat message
     * - Gets or creates chat for user
     * - Saves user message
     * - Generates AI response (simulated for MVP)
     * - Saves bot response
     * Returns complete interaction
     */
    async processAIChatMessage(
        userId: number,
        message: string
    ): Promise<{ data: ChatInteraction | null; error: any }> {
        try {
            // Step 1: Get or create chat for user
            const { data: chat, error: chatError } = await this.repos.chats.getOrCreateForUser(userId);

            if (chatError || !chat) {
                return {
                    data: null,
                    error: chatError || new Error('Failed to create chat'),
                };
            }

            // Step 2: Save user message
            const { data: userMessage, error: userMessageError } =
                await this.repos.messages.createUserMessage(chat.id, message);

            if (userMessageError || !userMessage) {
                return {
                    data: null,
                    error: userMessageError || new Error('Failed to save user message'),
                };
            }

            // Step 3: Generate AI response (simulated for MVP)
            const aiResponse = await this.generateAIResponse(message);

            // Step 4: Save bot response
            const { data: botMessage, error: botMessageError } =
                await this.repos.messages.createBotMessage(chat.id, aiResponse);

            if (botMessageError || !botMessage) {
                return {
                    data: null,
                    error: botMessageError || new Error('Failed to save bot message'),
                };
            }

            // Step 5: Return complete interaction
            const interaction: ChatInteraction = {
                chat,
                userMessage,
                botResponse: botMessage,
            };

            return { data: interaction, error: null };
        } catch (error) {
            return { data: null, error };
        }
    }

    /**
     * Generate AI response (SIMULATED for MVP)
     * TODO: Replace with real AI API (OpenAI, Gemini, etc.)
     */
    private async generateAIResponse(userMessage: string): Promise<string> {
        const messageLower = userMessage.toLowerCase();

        // Simple rule-based responses for MVP
        if (messageLower.includes('balance') || messageLower.includes('saldo')) {
            return 'Untuk melihat saldo terkini, silakan cek Dashboard Anda. Saya dapat membantu Anda menganalisis transaksi dan memberikan insights.';
        }

        if (messageLower.includes('sales') || messageLower.includes('penjualan')) {
            return 'Saya dapat membantu Anda menganalisis data penjualan. Periode mana yang ingin Anda tinjau?';
        }

        if (messageLower.includes('stock') || messageLower.includes('stok')) {
            return 'Saya dapat membantu monitoring stok produk Anda. Apakah ada produk tertentu yang ingin Anda cek?';
        }

        if (messageLower.includes('help') || messageLower.includes('bantuan')) {
            return 'Saya adalah AI Assistant untuk NusaBiz Saya bisa membantu Anda dengan:\n- Analisis penjualan dan keuangan\n- Monitoring stok produk\n- Rekomendasi bisnis\n- Menjawab pertanyaan tentang transaksi\n\nApa yang bisa saya bantu hari ini?';
        }

        // Default response
        return 'Terima kasih atas pesan Anda. Saya adalah AI Assistant NusaBiz yang siap membantu Anda mengelola bisnis. Bisa tolong jelaskan lebih detail apa yang Anda butuhkan?';
    }

    /**
     * Get chat history for a user
     */
    async getChatHistory(
        userId: number,
        messageLimit?: number
    ): Promise<{ data: { chat: Chat; messages: Message[] } | null; error: any }> {
        try {
            const { data: chat, error: chatError } = await this.repos.chats.getOrCreateForUser(userId);

            if (chatError || !chat) {
                return { data: null, error: chatError };
            }

            const { data: messages, error: messagesError } = await this.repos.messages.findByChatId(
                chat.id,
                messageLimit
            );

            if (messagesError) {
                return { data: null, error: messagesError };
            }

            return {
                data: {
                    chat,
                    messages: messages || [],
                },
                error: null,
            };
        } catch (error) {
            return { data: null, error };
        }
    }
}
