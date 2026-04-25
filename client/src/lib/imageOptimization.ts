/**
 * Image Optimization Utilities for Supabase Storage
 * Uses Supabase's built-in image transformation API
 * Never serve raw uploads - always transform for optimal performance
 */

interface ImageTransformOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'origin' | 'webp' | 'jpg' | 'png';
  resize?: 'cover' | 'contain' | 'fill';
}

/**
 * Generate optimized image URL with Supabase transformations
 * @param originalUrl - Original image URL from Supabase
 * @param options - Transformation options
 * @returns Optimized image URL with query parameters
 */
export const getOptimizedImageUrl = (
  originalUrl: string,
  options: ImageTransformOptions = {}
): string => {
  if (!originalUrl) return '';

  // Default optimization settings
  const defaults: ImageTransformOptions = {
    quality: 70,
    format: 'webp',
    resize: 'cover',
  };

  const config = { ...defaults, ...options };

  // Build query parameters
  const params = new URLSearchParams();

  if (config.width) params.append('width', config.width.toString());
  if (config.height) params.append('height', config.height.toString());
  if (config.quality) params.append('quality', config.quality.toString());
  if (config.format) params.append('format', config.format);
  if (config.resize) params.append('resize', config.resize);

  // Append parameters to URL
  const separator = originalUrl.includes('?') ? '&' : '?';
  return `${originalUrl}${separator}${params.toString()}`;
};

/**
 * Get thumbnail image URL (small, highly compressed)
 * Used for listing feed cards
 */
export const getThumbnailUrl = (imageUrl: string): string => {
  return getOptimizedImageUrl(imageUrl, {
    width: 400,
    height: 300,
    quality: 70,
    format: 'webp',
    resize: 'cover',
  });
};

/**
 * Get medium image URL (for detail pages)
 */
export const getMediumImageUrl = (imageUrl: string): string => {
  return getOptimizedImageUrl(imageUrl, {
    width: 800,
    height: 600,
    quality: 80,
    format: 'webp',
    resize: 'cover',
  });
};

/**
 * Get large image URL (for hero sections)
 */
export const getLargeImageUrl = (imageUrl: string): string => {
  return getOptimizedImageUrl(imageUrl, {
    width: 1200,
    height: 800,
    quality: 85,
    format: 'webp',
    resize: 'cover',
  });
};

/**
 * Get OpenGraph image URL (for social sharing)
 * Optimized for 1200x630 aspect ratio
 */
export const getOGImageUrl = (imageUrl: string): string => {
  return getOptimizedImageUrl(imageUrl, {
    width: 1200,
    height: 630,
    quality: 80,
    format: 'webp',
    resize: 'cover',
  });
};

/**
 * Get mobile image URL (for mobile devices)
 */
export const getMobileImageUrl = (imageUrl: string): string => {
  return getOptimizedImageUrl(imageUrl, {
    width: 320,
    height: 240,
    quality: 65,
    format: 'webp',
    resize: 'cover',
  });
};

/**
 * Get responsive image srcset for picture element
 */
export const getResponsiveImageSrcset = (imageUrl: string): string => {
  const mobile = getMobileImageUrl(imageUrl);
  const tablet = getThumbnailUrl(imageUrl);
  const desktop = getLargeImageUrl(imageUrl);

  return `
    ${mobile} 320w,
    ${tablet} 768w,
    ${desktop} 1200w
  `.trim();
};

/**
 * Get image with fallback for missing images
 */
export const getImageWithFallback = (
  imageUrl: string | undefined | null,
  fallbackUrl: string = '/images/placeholder.jpg'
): string => {
  return imageUrl ? getThumbnailUrl(imageUrl) : fallbackUrl;
};

/**
 * Validate if URL is from Supabase storage
 */
export const isSupabaseStorageUrl = (url: string): boolean => {
  return url?.includes('supabase') || url?.includes('storage');
};

/**
 * Extract bucket and path from Supabase URL
 */
export const parseSupabaseUrl = (
  url: string
): { bucket: string; path: string } | null => {
  try {
    const urlObj = new URL(url);
    const parts = urlObj.pathname.split('/');
    
    // Format: /storage/v1/object/public/{bucket}/{path}
    if (parts.length >= 6) {
      return {
        bucket: parts[5],
        path: parts.slice(6).join('/'),
      };
    }
    return null;
  } catch {
    return null;
  }
};

/**
 * Build Supabase storage URL from bucket and path
 */
export const buildSupabaseUrl = (
  bucket: string,
  path: string,
  projectUrl: string = 'https://your-project.supabase.co'
): string => {
  return `${projectUrl}/storage/v1/object/public/${bucket}/${path}`;
};

/**
 * Get image dimensions for aspect ratio preservation
 */
export const getImageDimensions = (
  aspectRatio: 'square' | '4:3' | '16:9' | '1:1' = '4:3',
  maxWidth: number = 400
): { width: number; height: number } => {
  const ratios: Record<string, number> = {
    square: 1,
    '1:1': 1,
    '4:3': 4 / 3,
    '16:9': 16 / 9,
  };

  const ratio = ratios[aspectRatio] || 4 / 3;
  return {
    width: maxWidth,
    height: Math.round(maxWidth / ratio),
  };
};

/**
 * Preload image for better performance
 */
export const preloadImage = (imageUrl: string): void => {
  if (typeof window === 'undefined') return;

  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'image';
  link.href = imageUrl;
  document.head.appendChild(link);
};

/**
 * Lazy load image with intersection observer
 */
export const lazyLoadImage = (
  element: HTMLImageElement,
  imageUrl: string,
  callback?: () => void
): IntersectionObserver | null => {
  if (typeof window === 'undefined') return null;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const img = entry.target as HTMLImageElement;
        img.src = imageUrl;
        img.classList.add('loaded');
        observer.unobserve(img);
        callback?.();
      }
    });
  });

  observer.observe(element);
  return observer;
};

/**
 * Generate srcset for responsive images
 */
export const generateSrcset = (
  baseUrl: string,
  sizes: number[] = [320, 640, 1024, 1280]
): string => {
  return sizes
    .map((size) => {
      const url = getOptimizedImageUrl(baseUrl, {
        width: size,
        quality: 75,
        format: 'webp',
      });
      return `${url} ${size}w`;
    })
    .join(', ');
};
