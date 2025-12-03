/**
 * Chat Routes
 * /api/v1/chat/*
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import * as chatController from '../controllers/chat.controller';

const router = Router();

// All chat routes require authentication
router.use(authenticate);

// POST /api/v1/chat/message
router.post('/message', asyncHandler(chatController.sendMessage));

// GET /api/v1/chat/history
router.get('/history', asyncHandler(chatController.getChatHistory));

// DELETE /api/v1/chat/history
router.delete('/history', asyncHandler(chatController.clearChatHistory));

export default router;
