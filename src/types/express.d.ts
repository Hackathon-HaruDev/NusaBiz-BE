/**
 * Extended Express Types
 * Custom type definitions for Express Request
 */

import { Request } from 'express';

/**
 * Authenticated user information
 */
export interface AuthUser {
    id: string;
    email: string;
}

/**
 * Extended Express Request with authenticated user
 */
export interface AuthRequest extends Request {
    user?: AuthUser;
}

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
