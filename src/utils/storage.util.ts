/**
 * Storage Utility
 * Helper functions for Supabase Storage operations
 */

import { SupabaseClient } from "@supabase/supabase-js";

const USER_BUCKET_NAME = "user-image";
const PRODUCT_BUCKET_NAME = "product-image";
const DEFAULT_AVATAR_URL =
  "https://puxrvmtzptuukbisgbnn.supabase.co/storage/v1/object/public/user-image/default.jpg";
const DEFAULT_PRODUCT_IMAGE_URL =
  "https://puxrvmtzptuukbisgbnn.supabase.co/storage/v1/object/public/product-image/product.png";

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
    const timestamp = Date.now();
    const extension = file.mimetype.split("/")[1];
    const fileName = `user_${userId}_${timestamp}.${extension}`;
    const filePath = fileName;

    const { data, error } = await supabase.storage
      .from(USER_BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Detail Supabase Upload Failure:", error); // <-- Logging Detail Error
      return { url: null, error };
    }

    const { data: publicUrlData } = supabase.storage
      .from(USER_BUCKET_NAME)
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (error) {
    console.error("General Storage Exception:", error);
    return { url: null, error };
  }
}

/**
 * Hapus avatar user dari Supabase Storage
 * @param supabase - Supabase client instance
 * @param imageUrl - Full public URL of the image
 * @returns Success status
 */
export async function deleteAvatar(
  supabase: SupabaseClient,
  imageUrl: string
): Promise<{ success: boolean; error: any }> {
  try {
    if (imageUrl === DEFAULT_AVATAR_URL) {
      return { success: true, error: null };
    }

    const bucketPath = `/storage/v1/object/public/${USER_BUCKET_NAME}/`;
    if (!imageUrl.includes(bucketPath)) {
      // Jika URL tidak valid atau bukan dari bucket ini, abaikan penghapusan
      return { success: true, error: null };
    }

    // Ekstrak file path dari URL
    const fileName = imageUrl.substring(
      imageUrl.indexOf(bucketPath) + bucketPath.length
    );

    const { error } = await supabase.storage
      .from(USER_BUCKET_NAME)
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
 * Upload gambar produk ke Supabase Storage
 * @param supabase - Supabase client instance
 * @param productId - ID Produk (number)
 * @param file - File buffer dari multer
 * @returns Public URL of uploaded file
 */
export async function uploadProductImage(
  supabase: SupabaseClient,
  productId: number,
  file: Express.Multer.File
): Promise<{ url: string | null; error: any }> {
  try {
    const timestamp = Date.now();
    const extension = file.mimetype.split("/")[1];
    // Format nama file: product_[ID_PRODUK]_[TIMESTAMP].[EKSTENSI]
    const fileName = `product_${productId}_${timestamp}.${extension}`;
    const filePath = fileName;

    const { data, error } = await supabase.storage
      .from(PRODUCT_BUCKET_NAME)
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      console.error("Product image upload error:", error);
      return { url: null, error };
    }

    const { data: publicUrlData } = supabase.storage
      .from(PRODUCT_BUCKET_NAME)
      .getPublicUrl(filePath);

    return { url: publicUrlData.publicUrl, error: null };
  } catch (error) {
    return { url: null, error };
  }
}

/**
 * Hapus gambar produk dari Supabase Storage
 * @param supabase - Supabase client instance
 * @param imageUrl - Full public URL of the image
 * @returns Success status
 */
export async function deleteProductImage(
  supabase: SupabaseClient,
  imageUrl: string
): Promise<{ success: boolean; error: any }> {
  try {
    if (imageUrl === DEFAULT_PRODUCT_IMAGE_URL) {
      return { success: true, error: null };
    }

    const bucketPath = `/storage/v1/object/public/${PRODUCT_BUCKET_NAME}/`;
    if (!imageUrl.includes(bucketPath)) {
      // Jika URL tidak valid atau bukan dari bucket ini, abaikan penghapusan
      return { success: true, error: null };
    }

    // Ekstrak file path dari URL
    const fileName = imageUrl.substring(
      imageUrl.indexOf(bucketPath) + bucketPath.length
    );

    const { error } = await supabase.storage
      .from(PRODUCT_BUCKET_NAME)
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

/**
 * Get default product image URL
 */
export function getDefaultProductImageUrl(): string {
  return DEFAULT_PRODUCT_IMAGE_URL;
}
