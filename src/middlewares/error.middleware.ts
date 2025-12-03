/**
 * Error Handling Middleware
 * Global error handler for Express
 */

import { Request, Response, NextFunction } from 'express';
import { errorResponse, ErrorCodes } from '../utils/response.util';

/**
 * Custom error class with status code
 */
export class AppError extends Error {
    constructor(
        public statusCode: number,
        public code: string,
        message: string,
        public details?: any
    ) {
        super(message);
        this.name = 'AppError';
    }
}

/**
 * Global error handling middleware
 * Should be registered last in middleware chain
 */
export function errorHandler(
    err: Error | AppError,
    req: Request,
    res: Response,
    next: NextFunction
): void {
    // Log error for debugging
    console.error('Error:', err);

    // Handle known AppError
    if (err instanceof AppError) {
        res.status(err.statusCode).json(
            errorResponse(err.code, err.message, err.details)
        );
        return;
    }

    // Handle Supabase errors
    if (err.message?.includes('JWT') || err.message?.includes('token')) {
        res.status(401).json(
            errorResponse(
                ErrorCodes.AUTHENTICATION_REQUIRED,
                'Invalid or expired authentication token'
            )
        );
        return;
    }

    // Handle validation errors
    if (err.message?.includes('validation') || err.message?.includes('invalid')) {
        res.status(400).json(
            errorResponse(ErrorCodes.VALIDATION_ERROR, err.message)
        );
        return;
    }

    // Default to 500 Internal Server Error
    res.status(500).json(
        errorResponse(
            ErrorCodes.SERVER_ERROR,
            'An unexpected error occurred',
            process.env.NODE_ENV === 'development' ? err.message : undefined
        )
    );
}

/**
 * Async handler wrapper to catch errors in async route handlers
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
