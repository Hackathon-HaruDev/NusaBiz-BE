/**
 * Express Application Configuration
 * Sets up middleware, routes, and error handling
 */

import express, { Application } from 'express';
import cors from 'cors';
import routes from './routes/index';
import { errorHandler } from './middlewares/error.middleware';

/**
 * Create and configure Express application
 */
export function createApp(): Application {
    const app = express();

    // CORS configuration
    app.use(
        cors({
            origin: process.env.CORS_ORIGIN || '*',
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
        })
    );

    // Body parsing middleware
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    app.use((req, res, next) => {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] ${req.method} ${req.path}`);
        next();
    });

    // Mount API routes
    app.use('/api/v1', routes);

    // Root endpoint
    app.get('/', (req, res) => {
        res.json({
            success: true,
            message: 'NusaBiz API Server',
            version: '1.0.0',
            endpoints: {
                health: '/api/v1/health',
                auth: '/api/v1/auth',
                users: '/api/v1/users',
                businesses: '/api/v1/businesses',
                chat: '/api/v1/chat',
            },
        });
    });

    // Global error handler (must be last)
    app.use(errorHandler);

    return app;
}
