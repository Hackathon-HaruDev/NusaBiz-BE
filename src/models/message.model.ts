/**
 * Message Model
 * Represents a message in a chat session
 */

export type MessageSender = 'User' | 'Bot';

export interface Message {
    id: number;
    sender: MessageSender;
    content: string | null;
    chat_id: number;
    created_at: string;
    deleted_at: string | null;
}

/**
 * DTO for creating a new message
 */
export interface CreateMessageDTO {
    sender: MessageSender;
    content: string;
    chat_id: number;
}
