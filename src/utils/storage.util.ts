/**
 * Storage Utility
 * Helper functions for Supabase Storage operations
 */

import { SupabaseClient } from '@supabase/supabase-js';

const BUCKET_NAME = 'user-image';
const DEFAULT_AVATAR_URL = 'https://puxrvmtzptuukbisgbnn.supabase.co/storage/v1/object/public/user-image/user.png';

/**
 * Upload avatar to Supabase Storage
 * @param supabase - Supabase client instance
 * @param userId - User ID
 * @param file - File buffer from multer
 * @returns Public URL of uploaded file
 */
export async function uploadAvatar(
    supabase: SupabaseClient,
    userId: string,
    file: Express.Multer.File
): Promise<{ url: string | null; error: any }> {
    try {
        // Generate unique filename
        const timestamp = Date.now();
        const extension = file.mimetype.split('/')[1];
        const fileName = `user_${userId}_${timestamp}.${extension}`;
        const filePath = fileName;

        // Upload file to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            return { url: null, error };
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return { url: publicUrlData.publicUrl, error: null };
    } catch (error) {
        return { url: null, error };
    }
}

/**
 * Delete avatar from Supabase Storage
 * @param supabase - Supabase client instance
 * @param imageUrl - Full public URL of the image
 * @returns Success status
 */
export async function deleteAvatar(
    supabase: SupabaseClient,
    imageUrl: string
): Promise<{ success: boolean; error: any }> {
    try {
        // Don't delete default avatar
        if (imageUrl === DEFAULT_AVATAR_URL) {
            return { success: true, error: null };
        }

        // Extract file path from URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/user-image/user_123_1234567890.jpg
        const urlParts = imageUrl.split('/');
        const fileName = urlParts[urlParts.length - 1];

        // Delete file from storage
        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([fileName]);

        if (error) {
            return { success: false, error };
        }

        return { success: true, error: null };
    } catch (error) {
        return { success: false, error };
    }
}

/**
 * Get default avatar URL
 */
export function getDefaultAvatarUrl(): string {
    return DEFAULT_AVATAR_URL;
}
