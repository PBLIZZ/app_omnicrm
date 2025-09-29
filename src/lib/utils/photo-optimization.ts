import { logger } from "@/lib/observability/unified-logger";

// Dynamic import for sharp to avoid client-side bundling issues
async function getSharp() {
  if (typeof window !== "undefined") {
    throw new Error("Photo optimization is only available on the server side");
  }

  try {
    const sharpModule = await import("sharp");
    return sharpModule.default;
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    logger.warn("Sharp not available", { operation: "sharp_import" }, errorInstance);
    throw new Error("Photo optimization library not available");
  }
}

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
 * Optimizes an image file for client photos with aggressive compression
 * Iteratively reduces quality to meet target file size (~10KB)
 */
export async function optimizePhoto(
  fileBuffer: ArrayBuffer,
  options: Partial<typeof PHOTO_CONFIG> = {},
): Promise<Buffer> {
  const config = { ...PHOTO_CONFIG, ...options };

  // Get sharp dynamically to avoid client-side bundling
  const sharp = await getSharp();

  try {
    let quality = config.quality;
    let optimized: Buffer;
    let attempts = 0;
    const maxAttempts = 5;

    // Start with initial optimization
    optimized = await sharp(fileBuffer)
      .resize(config.maxWidth, config.maxHeight, {
        fit: "cover", // Better for avatars - fills the square
        withoutEnlargement: true,
      })
      .webp({
        quality,
        effort: 6, // Maximum effort for best compression
        smartSubsample: true, // Better compression
      })
      .toBuffer();

    // Iteratively reduce quality if file is too large
    while (optimized.length > config.targetFileSize && attempts < maxAttempts && quality > 20) {
      quality = Math.max(20, quality - 15) as 60; // Reduce quality by 15 each iteration, min 20

      optimized = await sharp(fileBuffer)
        .resize(config.maxWidth, config.maxHeight, {
          fit: "cover",
          withoutEnlargement: true,
        })
        .webp({
          quality,
          effort: 6,
          smartSubsample: true,
        })
        .toBuffer();

      attempts++;
    }

    // If still too large, try smaller dimensions
    if (optimized.length > config.targetFileSize) {
      const smallerWidth = Math.max(200, config.maxWidth - 50);
      const smallerHeight = Math.max(200, config.maxHeight - 50);

      optimized = await sharp(fileBuffer)
        .resize(smallerWidth, smallerHeight, {
          fit: "cover",
          withoutEnlargement: true,
        })
        .webp({
          quality: 30, // Very low quality for final attempt
          effort: 6,
          smartSubsample: true,
        })
        .toBuffer();
    }

    logger.info("Photo optimized successfully", {
      operation: "photo_optimization",
      additionalData: {
        originalSizeKB: (fileBuffer.byteLength / 1024).toFixed(1),
        optimizedSizeKB: (optimized.length / 1024).toFixed(1),
        quality
      }
    });

    return optimized;
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    logger.error("Photo optimization failed", { operation: "photo_optimization" }, errorInstance);
    throw new Error("Failed to optimize photo");
  }
}

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
