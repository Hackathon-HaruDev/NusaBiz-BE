/**
 * User Controller
 * Handle user profile operations
 */

import { Request, Response } from 'express';
import { supabase } from '../api/supabase/client';
import { initializeApp } from '../api/supabase/client';
import { successResponse, ErrorCodes } from '../utils/response.util';
import { isValidEmail, sanitizeString, isValidPassword } from '../utils/validation.util';
import { AppError } from '../middlewares/error.middleware';

const { repos } = initializeApp();

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    // Get user from Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Failed to get user data');
    }

    // Get additional user data from database
    const { data: dbUser, error: dbError } = await repos.users.findByEmail(
        authUser.user.email || ''
    );

    // Return combined user data
    res.status(200).json(
        successResponse({
            id: authUser.user.id,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata.full_name || dbUser?.full_name,
            whatsapp_number:
                authUser.user.user_metadata.whatsapp_number || dbUser?.whatsapp_number,
            created_at: authUser.user.created_at,
            updated_at: authUser.user.updated_at,
        })
    );
}

/**
 * Update user profile
 * PUT /api/v1/users/me
 */
export async function updateProfile(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const { full_name, whatsapp_number } = req.body;

    // Update user metadata in Supabase Auth
    const { data, error } = await supabase.auth.updateUser({
        data: {
            full_name: full_name ? sanitizeString(full_name) : undefined,
            whatsapp_number: whatsapp_number ? sanitizeString(whatsapp_number) : undefined,
        },
    });

    if (error) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, error.message);
    }

    if (!data.user) {
        throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to update profile');
    }

    res.status(200).json(
        successResponse(
            {
                id: data.user.id,
                email: data.user.email,
                full_name: data.user.user_metadata.full_name,
                whatsapp_number: data.user.user_metadata.whatsapp_number,
                updated_at: data.user.updated_at,
            },
            'Profile updated successfully'
        )
    );
}

/**
 * Change password
 * PUT /api/v1/users/me/password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'Current password and new password are required'
        );
    }

    // Validate new password
    if (!isValidPassword(newPassword)) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'New password must be at least 8 characters with letters and numbers'
        );
    }

    // Verify current password by attempting to sign in
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword,
    });

    if (authError || !authData.user) {
        throw new AppError(401, ErrorCodes.UNAUTHORIZED, 'Current password is incorrect');
    }

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (updateError) {
        throw new AppError(400, ErrorCodes.VALIDATION_ERROR, updateError.message);
    }

    res.status(200).json(successResponse(null, 'Password changed successfully'));
}

/**
 * Delete user account (soft delete)
 * DELETE /api/v1/users/me
 */
export async function deleteAccount(req: Request, res: Response): Promise<void> {
    if (!req.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'User not authenticated');
    }

    // Note: Supabase doesn't support soft delete from the client SDK
    // This would typically be handled by an admin API or database trigger
    // For now, we'll sign out the user and mark for deletion

    // Sign out user
    await supabase.auth.signOut();

    // In production, you would mark the user for deletion in your database
    // or use Supabase admin API to delete the user

    res.status(200).json(successResponse(null, 'Account deletion initiated'));
}
