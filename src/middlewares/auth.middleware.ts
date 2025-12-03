/**
 * Authentication Middleware
 * JWT verification using Supabase Auth
 */

import { Request, Response, NextFunction } from 'express';
import { supabase } from '../api/supabase/client';
import { AppError } from './error.middleware';
import { ErrorCodes } from '../utils/response.util';

/**
 * Verify JWT token and attach user to request
 */
export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        // Extract token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            throw new AppError(
                401,
                ErrorCodes.AUTHENTICATION_REQUIRED,
                'Authorization header with Bearer token is required'
            );
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        // Verify token with Supabase
        const { data, error } = await supabase.auth.getUser(token);

        if (error || !data.user) {
            throw new AppError(
                401,
                ErrorCodes.AUTHENTICATION_REQUIRED,
                'Invalid or expired token'
            );
        }

        // Attach user information to request
        req.user = {
            id: data.user.id,
            email: data.user.email || '',
        };

        next();
    } catch (error) {
        next(error);
    }
}

/**
 * Optional authentication - doesn't fail if no token provided
 * Useful for public endpoints that can show different data when authenticated
 */
export async function optionalAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            // No token, continue without user
            next();
            return;
        }

        const token = authHeader.substring(7);
        const { data, error } = await supabase.auth.getUser(token);

        if (!error && data.user) {
            req.user = {
                id: data.user.id,
                email: data.user.email || '',
            };
        }

        next();
    } catch (error) {
        // Don't fail on error, just continue without user
        next();
    }
}
