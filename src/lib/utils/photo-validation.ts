/**
 * Client-side photo validation utilities
 * Separated from server-side optimization to avoid bundling issues
 */

/**
 * Photo optimization configuration
 * Optimized for very small file sizes (<10KB final WebP)
 */
export const PHOTO_CONFIG = {
  maxWidth: 300, // Much smaller for avatar usage
  maxHeight: 300, // Square format for consistency
  quality: 60, // Lower quality for smaller files
  format: "webp" as const,
  maxFileSize: 512 * 1024, // 512KB input limit (much more reasonable)
  targetFileSize: 10 * 1024, // Target 10KB final output
} as const;

/**
 * Validates if a file is a supported image type
 */
export function isValidImageType(mimeType: string): boolean {
  const supportedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];

  return supportedTypes.includes(mimeType.toLowerCase());
}

/**
 * Validates file size
 */
export function isValidFileSize(fileSize: number, maxSize = PHOTO_CONFIG.maxFileSize): boolean {
  return fileSize > 0 && fileSize <= maxSize;
}

/**
 * Gets optimized file extension based on input type
 */
export function getOptimizedExtension(originalMimeType: string): string {
  void originalMimeType;
  // Always return .webp since we convert all images to WebP
  return "webp";
}

/**
 * Estimates the file size reduction after optimization
 */
export function estimateOptimizedSize(originalSize: number): number {
  // With aggressive optimization, expect ~95% reduction
  // Target final size is ~10KB regardless of input (within reason)
  if (originalSize > 100 * 1024) {
    // >100KB
    return Math.min(PHOTO_CONFIG.targetFileSize, originalSize * 0.05);
  }
  // For smaller files, be less aggressive
  return Math.min(PHOTO_CONFIG.targetFileSize, originalSize * 0.3);
}

/**
 * Client-side photo validation helper
 */
export function validatePhotoFile(file: File): { valid: boolean; error?: string } {
  if (!isValidImageType(file.type)) {
    return {
      valid: false,
      error: "Please select a valid image file (JPEG, PNG, WebP, or GIF)",
    };
  }

  if (!isValidFileSize(file.size)) {
    return {
      valid: false,
      error: `File size must be less than ${Math.round(PHOTO_CONFIG.maxFileSize / 1024)}KB (${(PHOTO_CONFIG.maxFileSize / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  return { valid: true };
}
