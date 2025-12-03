/**
 * User Routes
 * /api/v1/users/*
 */

import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../middlewares/error.middleware';
import * as userController from '../controllers/user.controller';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// GET /api/v1/users/me
router.get('/me', asyncHandler(userController.getCurrentUser));

// PUT /api/v1/users/me
router.put('/me', asyncHandler(userController.updateProfile));

// PUT /api/v1/users/me/password
router.put('/me/password', asyncHandler(userController.changePassword));

// DELETE /api/v1/users/me
router.delete('/me', asyncHandler(userController.deleteAccount));

export default router;
