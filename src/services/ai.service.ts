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
        userId: string,
        message: string,
        existingChatId?: number
    ): Promise<{ data: ChatInteraction | null; error: any }> {
        try {
            let chat: Chat;
            let isNewChat = false;
            let finalMessage = message;

            if (existingChatId) {
                // Skenario 1: Melanjutkan sesi chat yang sudah ada
                const { data: foundChat } = await this.repos.chats.findByIdAndUserId(existingChatId, userId);
                if (!foundChat) throw new Error('Chat not found or access denied.');
                chat = foundChat;

            } else {
                // Skenario 2: Membuat chat baru (dipicu oleh 'New Chat')
                const { data: newChat, error: chatError } = await this.repos.chats.createNewChat(userId);
                if (chatError || !newChat) throw new Error('Failed to create new chat.');
                chat = newChat;
                isNewChat = true;

                // ⭐️ LOGIKA KONTEKS HANYA UNTUK CHAT BARU ⭐️
                const businessContext = await this.generateBusinessContext(userId);
                finalMessage = `${businessContext}\n\n[PESAN PENGGUNA]\n${message}`;
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

            // Step 3: Generate AI response using Kolosal AI
            const aiResponse = await this.callKolosalAI(message);

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
     * Call Kolosal AI API for chat completion
     * @param userMessage The message from the user
     * @returns AI-generated response or error message
     */
    private async callKolosalAI(userMessage: string): Promise<string> {
        try {
            const response = await fetch('https://api.kolosal.ai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.VITE_KOLOSAL_API}`
                },
                body: JSON.stringify({
                    max_tokens: 1000,
                    messages: [
                        {
                            content: userMessage,
                            role: 'user'
                        }
                    ],
                    model: 'meta-llama/llama-4-maverick-17b-128e-instruct'
                })
            });

            if (!response.ok) {
                console.error(`Kolosal AI API error: ${response.status} ${response.statusText}`);
                throw new Error(`Kolosal AI API error: ${response.status}`);
            }

            const data = await response.json();

            // Extract AI response from choices array
            if (data.choices && data.choices.length > 0) {
                return data.choices[0].message.content;
            }

            throw new Error('No response from AI');

        } catch (error) {
            console.error('Kolosal AI Error:', error);
            return 'Maaf, AI sedang mengalami gangguan teknis.';
        }
    }

    /**
     * Get chat history for a user
     */
    async getChatHistory(
        userId: string,
        messageLimit?: number
    ): Promise<{ data: { chat: Chat; messages: Message[] } | null; error: any }> {
        try {
            const { data: chat, error: chatError } = await this.repos.chats.findLatestChat(userId);

            if (chatError || !chat) {
                // Jika tidak ada chat, kembalikan data kosong, bukan error
                return { 
                    data: { chat: undefined as unknown as Chat, messages: [] }, 
                    error: null 
                };
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

    private async generateBusinessContext(userId: string): Promise<string> {
        try {
            const contextParts: string[] = [];

            // 1. Ambil Data Bisnis Utama
            const { data: businesses } = await this.repos.businesses.findAll({ user_id: userId });
            if (businesses?.length) {
                contextParts.push("Data Bisnis Anda:");
                businesses.forEach(b => {
                    contextParts.push(`- Nama: ${b.business_name}, Kategori: ${b.category}, Saldo: ${b.current_balance}`);
                });

                // Asumsi: Kita hanya menggunakan bisnis pertama untuk detail lainnya
                const primaryBusinessId = businesses[0].id; 
                
                // 2. Ambil Produk
                const { data: products } = await this.repos.products.findAll({ business_id: primaryBusinessId }, { limit: 5 });
                if (products?.length) {
                    contextParts.push("\nProduk Terakhir/Populer (Max 5):");
                    products.forEach(p => {
                        contextParts.push(`- ${p.name}, Stok: ${p.current_stock}, Harga Jual: ${p.selling_price}`);
                    });
                }

                // 3. Ambil Ringkasan Transaksi (Total Income/Expense)
                const { data: totals } = await this.repos.transactions.getTotalsByType(primaryBusinessId);
                if (totals) {
                    contextParts.push("\nRingkasan Keuangan (Semua Waktu):");
                    contextParts.push(`- Total Pendapatan: ${totals.income}, Total Pengeluaran: ${totals.expense}, Keuntungan Bersih: ${totals.income - totals.expense}`);
                }
            } else {
                contextParts.push("Tidak ditemukan data bisnis yang terdaftar.");
            }

            return `[KONTEKS DATA BISNIS PENGGUNA]\n${contextParts.join('\n')}\n[/KONTEKS DATA BISNIS PENGGUNA]`;
        } catch (error) {
            console.error("Failed to generate AI context:", error);
            return "[KONTEKS DATA BISNIS PENGGUNA] Gagal memuat data bisnis. [KONTEKS DATA BISNIS PENGGUNA]";
        }
    }
}
