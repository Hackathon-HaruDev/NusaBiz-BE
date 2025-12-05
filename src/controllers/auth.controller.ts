/**
 * Authentication Controller
 * Handle user authentication operations with Supabase Auth
 */

import { Request, Response } from 'express';
import { initializeApp, supabase } from '../api/supabase/client';
import { successResponse, errorResponse, ErrorCodes } from '../utils/response.util';
import { isValidEmail, isValidPassword, sanitizeString } from '../utils/validation.util';
import { AppError } from '../middlewares/error.middleware';
import { CreateUserDTO } from '../models';

const { repos, services } = initializeApp();

/**
 * Register a new user
 * POST /api/v1/auth/register
 */
export async function register(req: Request, res: Response): Promise<void> {

    try {

        const { email, password, full_name, whatsapp_number } = req.body;

        // Validate required fields
        if (!email || !password) {
            throw new AppError(
                400,
                ErrorCodes.VALIDATION_ERROR,
                'Email and password are required'
            );
        }

        // Validate email format
        if (!isValidEmail(email)) {
            throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Invalid email format');
        }

        // Validate password strength
        if (!isValidPassword(password)) {
            throw new AppError(
                400,
                ErrorCodes.VALIDATION_ERROR,
                'Password must be at least 8 characters with letters and numbers'
            );
        }

        // Create user with Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: sanitizeString(email),
            password,
            options: {
                data: {
                    full_name: full_name ? sanitizeString(full_name) : null,
                    whatsapp_number: whatsapp_number ? sanitizeString(whatsapp_number) : null,
                },
            },
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                throw new AppError(409, ErrorCodes.DUPLICATE_ENTRY, 'Email already registered');
            }
            throw new AppError(400, ErrorCodes.VALIDATION_ERROR, authError.message);
        }

        if (!authData.user) {
            throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to create user account');
        }

        const userDTO: CreateUserDTO = { email, full_name, whatsapp_number };
        const userId = authData.user.id;

        const { data: userData, error: userError } = await services.user.createUser(userId, userDTO);

        if (userError) {
            throw new AppError(500, ErrorCodes.SERVER_ERROR, `Failed to create user profile: ${userError.message || JSON.stringify(userError)}`);
        }

        if (!userData) {
            throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to create user profile: No data returned');
        }

        res.status(201).json(
            successResponse(
                {
                    user: userData,
                    token: authData.session?.access_token || null,
                },
                authData.session
                    ? 'Registration successful'
                    : 'Registration successful. Please check your email to verify your account.'
            )
        );
    } catch (error) {
        throw error;
    }
}

/**
 * Login user
 * POST /api/v1/auth/login
 */
export async function login(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Email and password are required'
        );
    }

    // Authenticate with Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
        email: sanitizeString(email),
        password,
    });

    if (error) {
        throw new AppError(
            401,
            ErrorCodes.AUTHENTICATION_REQUIRED,
            `Invalid credentials: ${error.message}`
        );
    }

    if (!data.user || !data.session) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Login failed');
    }

    // Return user data and token
    res.status(200).json(
        successResponse(
            {
                user: {
                    id: data.user.id,
                    email: data.user.email,
                    full_name: data.user.user_metadata.full_name,
                },
                token: data.session.access_token,
                expiresIn: data.session.expires_in,
            },
            'Login successful'
        )
    );
}

/**
 * Logout user
 * POST /api/v1/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AppError(
            401,
            ErrorCodes.AUTHENTICATION_REQUIRED,
            'Authorization token required'
        );
    }

    const token = authHeader.substring(7);

    // Sign out with Supabase (invalidate token)
    const { error } = await supabase.auth.signOut();

    if (error) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Logout failed');
    }

    res.status(200).json(successResponse(null, 'Logout successful'));
}

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
    const { refreshToken: refresh_token } = req.body;

    if (!refresh_token) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, 'Refresh token is required');
    }

    // Refresh session with Supabase
    const { data, error } = await supabase.auth.refreshSession({
        refresh_token,
    });

    if (error || !data.session) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Invalid refresh token');
    }

    res.status(200).json(
        successResponse({
            token: data.session.access_token,
            expiresIn: data.session.expires_in,
        })
    );
}
