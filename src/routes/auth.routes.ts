/**
 * Authentication Routes
 * /api/v1/auth/*
 */

import { Router } from 'express';
import { asyncHandler } from '../middlewares/error.middleware';
import * as authController from '../controllers/auth.controller';

const router = Router();

// POST /api/v1/auth/register
router.post('/register', asyncHandler(authController.register));

// POST /api/v1/auth/login
router.post('/login', asyncHandler(authController.login));

// POST /api/v1/auth/logout
router.post('/logout', asyncHandler(authController.logout));

// POST /api/v1/auth/refresh
router.post('/refresh', asyncHandler(authController.refreshToken));

router.post('/forgot-password', asyncHandler(authController.forgotPassword));

router.put('/reset-password', asyncHandler(authController.resetPassword));

export default router;
