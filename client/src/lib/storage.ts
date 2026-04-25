import imageCompression from 'browser-image-compression';
import { supabase } from './supabase';

interface CompressionOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
}

const DEFAULT_COMPRESSION_OPTIONS: CompressionOptions = {
  maxSizeMB: 2,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
};

/**
 * Compress image file to WebP format
 */
export const compressImage = async (
  file: File,
  options: Partial<CompressionOptions> = {}
): Promise<File> => {
  const finalOptions = { ...DEFAULT_COMPRESSION_OPTIONS, ...options };

  try {
    const compressed = await imageCompression(file, {
      maxSizeMB: finalOptions.maxSizeMB,
      maxWidthOrHeight: finalOptions.maxWidthOrHeight,
      useWebWorker: finalOptions.useWebWorker,
      fileType: 'image/webp',
    });

    return new File([compressed], `${Date.now()}.webp`, { type: 'image/webp' });
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error('Failed to compress image');
  }
};

/**
 * Upload image to Supabase Storage
 * Path: user_id/listing_id/{hero|gallery|damage}/filename.webp
 */
export const uploadImage = async (
  file: File,
  userId: string,
  listingId: string,
  zone: 'hero' | 'gallery' | 'damage',
  onProgress?: (progress: number) => void
): Promise<string> => {
  try {
    // Compress image first
    const compressed = await compressImage(file);

    // Generate path
    const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.webp`;
    const path = `${userId}/${listingId}/${zone}/${filename}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from('listings')
      .upload(path, compressed, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Get public URL
    const { data: publicUrl } = supabase.storage
      .from('listings')
      .getPublicUrl(data.path);

    if (onProgress) onProgress(100);

    return publicUrl.publicUrl;
  } catch (error) {
    console.error('Upload failed:', error);
    throw new Error('Failed to upload image');
  }
};

/**
 * Batch upload multiple images
 */
export const uploadImages = async (
  files: File[],
  userId: string,
  listingId: string,
  zone: 'hero' | 'gallery' | 'damage',
  onProgress?: (progress: number) => void
): Promise<string[]> => {
  const urls: string[] = [];
  const totalFiles = files.length;

  for (let i = 0; i < totalFiles; i++) {
    const file = files[i];
    const progress = Math.round(((i + 1) / totalFiles) * 100);

    try {
      const url = await uploadImage(file, userId, listingId, zone);
      urls.push(url);

      if (onProgress) {
        onProgress(progress);
      }
    } catch (error) {
      console.error(`Failed to upload file ${i + 1}:`, error);
      throw error;
    }
  }

  return urls;
};

/**
 * Delete image from Supabase Storage
 */
export const deleteImage = async (path: string): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from('listings')
      .remove([path]);

    if (error) throw error;
  } catch (error) {
    console.error('Delete failed:', error);
    throw new Error('Failed to delete image');
  }
};
