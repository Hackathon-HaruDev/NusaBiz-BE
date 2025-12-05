/// <reference path="./types/express.d.ts" />

/**
 * Server Entry Point
 * Initialize and start Express server
 */

import dotenv from 'dotenv';
import { createApp } from './app';

// Load environment variables
dotenv.config();

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Create Express app
const app = createApp();

// Start server
app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 NusaBiz API Server Started');
    console.log('=================================');
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Port: ${PORT}`);
    console.log(`Server URL: http://localhost:${PORT}`);
    console.log(`Health Check: http://localhost:${PORT}/api/v1/health`);
    console.log('=================================');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
