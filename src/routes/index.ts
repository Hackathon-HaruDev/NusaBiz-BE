/**
 * Main Router
 * Combines all API routes
 */

import { Router, Request, Response } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import businessRoutes from './business.routes';
import chatRoutes from './chat.routes';
import { successResponse } from '../utils/response.util';

const router = Router();

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
    res.status(200).json(
        successResponse({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'NusaBiz API',
            version: '1.0.0',
        })
    );
});

// Mount feature routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/businesses', businessRoutes);
router.use('/chat', chatRoutes);

// 404 will be handled by Express default behavior or global error handler
// If specific 404 handling needed, add middleware in app.ts instead

export default router;
