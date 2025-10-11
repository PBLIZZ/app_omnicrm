/**
 * Storage Schemas
 *
 * Input/output validation for storage endpoints:
 * - File upload URL generation
 * - File access URL generation
 */

import { z } from "zod";

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
// BATCH FILE URL SCHEMAS
// ============================================================================

/**
 * Batch File URL Request Schema
 * Generates signed URLs for multiple files in one request
 */
export const BatchFileUrlRequestSchema = z.object({
  filePaths: z.array(z.string().min(1)).max(100), // Limit to 100 files per batch
  expiresIn: z.number().default(14400), // Default 4 hours (in seconds)
});

/**
 * Batch File URL Response Schema
 */
export const BatchFileUrlResponseSchema = z.object({
  urls: z.record(z.string(), z.string().nullable()), // Map of filePath -> signedUrl
  errors: z.record(z.string(), z.string()).optional(), // Map of filePath -> error message
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type FileUrlQuery = z.infer<typeof FileUrlQuerySchema>;
export type FileUrlResponse = z.infer<typeof FileUrlResponseSchema>;
export type BatchFileUrlRequest = z.infer<typeof BatchFileUrlRequestSchema>;
export type BatchFileUrlResponse = z.infer<typeof BatchFileUrlResponseSchema>;
