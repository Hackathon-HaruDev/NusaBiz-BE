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

    const { data: authUser, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser.user) {
        throw new AppError(401, ErrorCodes.AUTHENTICATION_REQUIRED, 'Failed to get user data');
    }

    const { data: dbUser, error: dbError } = await repos.users.findByEmail(
        authUser.user.email || ''
    );

    res.status(200).json(
        successResponse({
            id: authUser.user.id,
            email: authUser.user.email,
            full_name: authUser.user.user_metadata.full_name || dbUser?.full_name,
            whatsapp_number:
                authUser.user.user_metadata.whatsapp_number || dbUser?.whatsapp_number,
            image: dbUser?.image,
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
    const avatarFile = req.file;

    let newAvatarUrl: string | null = null;
    let oldAvatarUrl: string | null = null;

    try {
        const { data: currentUser, error: getUserError } = await repos.users.findByEmail(req.user.email);

        if (getUserError || !currentUser) {
            throw new AppError(404, ErrorCodes.NOT_FOUND, 'User not found');
        }

        oldAvatarUrl = currentUser.image;

        if (avatarFile) {
            const { uploadAvatar, deleteAvatar } = await import('../utils/storage.util');

            const { url, error: uploadError } = await uploadAvatar(supabase, req.user.id, avatarFile);

            if (uploadError || !url) {
                console.error('Supabase Upload Error:', uploadError); 
                throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to upload avatar');
            }

            newAvatarUrl = url;

            if (oldAvatarUrl) {
                await deleteAvatar(supabase, oldAvatarUrl);
            }
        }

        const updateData: any = {
            data: {
                full_name: full_name ? sanitizeString(full_name) : undefined,
                whatsapp_number: whatsapp_number ? sanitizeString(whatsapp_number) : undefined,
            },
        };

        const { data, error } = await supabase.auth.updateUser(updateData);

        if (error) {
            if (newAvatarUrl) {
                const { deleteAvatar } = await import('../utils/storage.util');
                await deleteAvatar(supabase, newAvatarUrl);
            }
            throw new AppError(400, ErrorCodes.VALIDATION_ERROR, error.message);
        }

        if (!data.user) {
            throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to update profile');
        }

        if (newAvatarUrl) {
            const { error: dbError } = await supabase
                .from('Users')
                .update({
                    image: newAvatarUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('email', req.user.email)
                .is('deleted_at', null);

            if (dbError) {
                const { deleteAvatar } = await import('../utils/storage.util');
                await deleteAvatar(supabase, newAvatarUrl);
                throw new AppError(500, ErrorCodes.SERVER_ERROR, 'Failed to update avatar in database');
            }
        }

        const { data: updatedUser } = await repos.users.findByEmail(req.user.email);

        res.status(200).json(
            successResponse(
                {
                    id: data.user.id,
                    email: data.user.email,
                    full_name: data.user.user_metadata.full_name || updatedUser?.full_name,
                    whatsapp_number: data.user.user_metadata.whatsapp_number || updatedUser?.whatsapp_number,
                    image: updatedUser?.image,
                    updated_at: data.user.updated_at,
                },
                'Profile updated successfully'
            )
        );
    } catch (error) {
        if (newAvatarUrl && error instanceof AppError) {
            const { deleteAvatar } = await import('../utils/storage.util');
            await deleteAvatar(supabase, newAvatarUrl);
        }
        throw error;
    }
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

    if (!isValidPassword(newPassword)) {
        throw new AppError(
            400,
            ErrorCodes.VALIDATION_ERROR,
            'New password must be at least 8 characters with letters and numbers'
        );
    }

    const { error: authError } = await supabase.auth.signInWithPassword({
        email: req.user.email,
        password: currentPassword,
    });

    if (authError) {
        const errorMessage = authError.message;

        if (errorMessage.includes('Invalid login credentials')) {
            throw new AppError(
                403,
                ErrorCodes.UNAUTHORIZED,
                'Current password is incorrect.'
            );
        }

        throw new AppError(
            401,
            ErrorCodes.AUTHENTICATION_REQUIRED,
            `Authentication failed: ${authError.message}`
        );
    }

    const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (updateError) {
        const errorMessage = updateError.message;

        if (errorMessage.includes('Invalid Grant') || errorMessage.includes('token')) {
            throw new AppError(
                403,
                ErrorCodes.UNAUTHORIZED,
                'Session is too old. Please re-authenticate (login again) to change your password.'
            );
        }

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

    await supabase.auth.signOut();

    res.status(200).json(successResponse(null, 'Account deletion initiated'));
}
