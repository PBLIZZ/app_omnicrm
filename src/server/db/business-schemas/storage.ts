/**
 * Storage Schemas
 *
 * Input/output validation for storage endpoints:
 * - File upload URL generation
 * - File access URL generation
 */

import { z } from "zod";

// ============================================================================
// UPLOAD URL SCHEMAS
// ============================================================================

/**
 * Upload URL Request Schema
 */
export const UploadUrlRequestSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  folderPath: z.string().optional(),
  bucket: z.string().default("contacts"),
});

/**
 * Upload URL Response Schema
 */
export const UploadUrlResponseSchema = z.object({
  signedUrl: z.string().nullable(),
  path: z.string(),
  error: z.string().optional(),
  details: z.string().optional(),
});

// ============================================================================
// FILE URL SCHEMAS
// ============================================================================

/**
 * File URL Query Schema
 */
export const FileUrlQuerySchema = z.object({
  filePath: z.string().min(1),
});

/**
 * File URL Response Schema
 */
export const FileUrlResponseSchema = z.object({
  signedUrl: z.string().nullable(),
  error: z.string().optional(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type UploadUrlRequest = z.infer<typeof UploadUrlRequestSchema>;
export type UploadUrlResponse = z.infer<typeof UploadUrlResponseSchema>;
export type FileUrlQuery = z.infer<typeof FileUrlQuerySchema>;
export type FileUrlResponse = z.infer<typeof FileUrlResponseSchema>;