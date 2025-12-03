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

    const { message } = req.body;

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
    const { data: interaction, error } = await services.ai.processAIChatMessage(user.id, message);

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

    // Get user's chat
    const { data: chat } = await repos.chats.getOrCreateForUser(user.id);
    if (!chat) {
        res.status(200).json(successResponse(null, 'No chat history to clear'));
        return;
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
