/**
 * Extended Express Types
 * Custom type definitions for Express Request
 */

/**
 * Authenticated user information
 */
export interface AuthUser {
    id: string;
    email: string;
}

/**
 * Extend Express Request interface globally
 */
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

