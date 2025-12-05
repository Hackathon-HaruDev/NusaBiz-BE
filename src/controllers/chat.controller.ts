/**
 * Chat Controller
 * Handle AI chat operations
 */

import { Request, Response } from 'express';
import { initializeApp } from '../api/supabase/client';
import { successResponse, ErrorCodes } from '../utils/response.util';
import { isNonEmptyString } from '../utils/validation.util';
import { AppError } from '../middlewares/error.middleware';

const { repos, services } = initializeApp();

/**
 * Send chat message to AI
 * POST /api/v1/chat/message
 */
export async function sendMessage(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const { message, chatId } = req.body;

    // Validate message
    if (!message || !isNonEmptyString(message)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Message is required');
    }

    // Get user from database
    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    // Process message with AI service
    const { data: interaction, error } = await services.ai.processAIChatMessage(
        user.id, 
        message, 
        chatId
    );

    if (error || !interaction) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to process chat message');
    }

    res.status(200).json(successResponse(interaction));
}

/**
 * Get chat history
 * GET /api/v1/chat/history
 */
export async function getChatHistory(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const { limit } = req.query;

    // Get user from database
    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    const messageLimit = limit ? parseInt(limit as string) : 50;

    // Get chat history
    const { data: chatHistory, error } = await services.ai.getChatHistory(user.id, messageLimit);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to fetch chat history');
    }

    res.status(200).json(successResponse(chatHistory));
}

/**
 * Clear chat history
 * DELETE /api/v1/chat/history
 */
export async function clearChatHistory(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    // Get user from database
    const { data: user } = await repos.users.findByEmail(req.user.email);
    if (!user) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
    }

    const userIdString = user.id;

    // Get user's chat
    const { data: chat } = await repos.chats.findLatestChat(userIdString); 
    
    if (!chat) {
        res.status(200).json(successResponse(null, 'No active chat history to clear'));
        return;
    }
    
    const { error: messageError } = await repos.messages.softDeleteByChatId(chat.id);

    if (messageError) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to clear chat messages');
    }

    // Delete all messages
    // Note: This would require a method in message repository to delete by chat_id
    // For now, we'll soft delete the chat
    const { error } = await repos.chats.softDelete(chat.id);

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to clear chat history');
    }

    res.status(200).json(successResponse(null, 'Chat history cleared successfully'));
}


/**
 * Clear chat history by chat ID
 * DELETE /api/v1/chat/:chatid
 */
export async function clearChatbyId(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const chatId = parseInt(req.params.chatId);

    if (isNaN(chatId)) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid chat ID format');
    }

    const { data: chat, error: chatError } = await repos.chats.findByIdAndUserId(chatId, req.user.id);
    
    if (chatError || !chat) {
        throw new AppError(404, ErrorCodes.NOT_FOUND, 'Chat not found or access denied');
    }

    const { error: messageError } = await repos.messages.softDeleteByChatId(chatId);
    
    if (messageError) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to clear chat messages');
    }

    const { error: chatDeleteError } = await repos.chats.softDelete(chatId);

    if (chatDeleteError) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to soft delete chat record');
    }

    res.status(200).json(successResponse(null, `Chat ${chatId} history cleared successfully`));
}