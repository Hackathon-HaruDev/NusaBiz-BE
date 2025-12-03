/**
 * Chat Model
 * Represents a chat session for a user
 */

import type { Message } from './message.model';

export interface Chat {
    id: number;
    user_id: number;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
}

/**
 * Chat with messages joined
 */
export interface ChatWithMessages extends Chat {
    messages: Message[];
}
