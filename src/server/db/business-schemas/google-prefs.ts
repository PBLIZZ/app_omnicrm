/**
 * Google Preferences API Business Schemas
 *
 * Schemas specific to Google sync preferences management
 */

import { z } from "zod";

// ============================================================================
// GOOGLE PREFERENCES SCHEMAS
// ============================================================================

/**
 * Google Preferences Query Schema (for GET requests)
 * Used by /api/google/prefs GET endpoint
 */
export const GooglePrefsQuerySchema = z.object({
  // Optional query parameters
  includeDefaults: z.coerce.boolean().optional().default(true),
});

/**
 * Google Preferences Response Schema
 * Used by /api/google/prefs GET endpoint
 */
export const GooglePrefsResponseSchema = z.object({
  // Gmail preferences
  gmailQuery: z.string().nullable(),
  gmailLabelIncludes: z.array(z.string()).nullable(),
  gmailLabelExcludes: z.array(z.string()).nullable(),
  gmailTimeRangeDays: z.number().int().min(1).max(365).nullable(),

  // Calendar preferences
  calendarIds: z.array(z.string()).nullable(),
  calendarIncludeOrganizerSelf: z.boolean().nullable(),
  calendarIncludePrivate: z.boolean().nullable(),
  calendarTimeWindowDays: z.number().int().min(1).max(730).nullable(),
  calendarFutureDays: z.number().int().min(1).max(730).nullable(),

  // Drive preferences
  driveIngestionMode: z.enum(['none', 'picker', 'folders']).nullable(),
  driveFolderIds: z.array(z.string()).nullable(),
  driveMaxSizeMB: z.number().int().min(1).max(100).nullable(),

  // Sync status
  initialSyncCompleted: z.boolean().nullable(),
  initialSyncDate: z.string().nullable(),

  // Metadata
  userId: z.string().uuid(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/**
 * Google Preferences Update Schema
 * Used by /api/google/prefs PUT endpoint
 */
export const GooglePrefsUpdateSchema = z.object({
  // Gmail preferences
  gmailQuery: z.string().optional(),
  gmailLabelIncludes: z.array(z.string()).optional(),
  gmailLabelExcludes: z.array(z.string()).optional(),
  gmailTimeRangeDays: z.number().int().min(1).max(365).optional(),

  // Calendar preferences
  calendarIds: z.array(z.string()).optional(),
  calendarIncludeOrganizerSelf: z.boolean().optional(),
  calendarIncludePrivate: z.boolean().optional(),
  calendarTimeWindowDays: z.number().int().min(1).max(730).optional(),
  calendarFutureDays: z.number().int().min(1).max(730).optional(),

  // Drive preferences
  driveIngestionMode: z.enum(['none', 'picker', 'folders']).optional(),
  driveFolderIds: z.array(z.string()).optional(),
  driveMaxSizeMB: z.number().int().min(1).max(100).optional(),

  // Sync status
  initialSyncCompleted: z.boolean().optional(),
  initialSyncDate: z.string().optional(),
});

// ============================================================================
// GOOGLE ERROR CLASSIFICATION
// ============================================================================

/**
 * Error categories for Google service operations
 */
export const GoogleErrorCodeEnum = z.enum([
  "AUTH_ERROR",      // Authentication/token errors
  "NETWORK_ERROR",   // Network connectivity issues
  "QUOTA_ERROR",     // API quota/rate limit errors
  "DATABASE_ERROR",  // Database operation errors
  "PERMISSION_ERROR", // Insufficient permissions
  "CONFIG_ERROR",    // Configuration/setup errors
  "UNKNOWN_ERROR",   // Unclassified errors
]);

export type GoogleErrorCode = z.infer<typeof GoogleErrorCodeEnum>;

/**
 * Structured error for Google operations
 */
export const GoogleServiceErrorSchema = z.object({
  code: GoogleErrorCodeEnum,
  message: z.string(),
  details: z.unknown().optional(),
  retryable: z.boolean().default(false),
  userActionRequired: z.boolean().default(false),
});

export type GoogleServiceError = z.infer<typeof GoogleServiceErrorSchema>;

// ============================================================================
// GOOGLE STATUS SCHEMAS
// ============================================================================

/**
 * Google Status Query Schema (for GET requests)
 * Used by /api/google/status endpoint
 */
export const GoogleStatusQuerySchema = z.object({
  // Optional query parameters
  includeJobDetails: z.coerce.boolean().optional().default(false),
  includeFreshness: z.coerce.boolean().optional().default(true),
});

/**
 * Google Status Response Schema - Updated to match service implementation
 * Used by /api/google/status endpoint
 */
export const GoogleStatusResponseSchema = z.object({
  // Service-specific status with auto-refresh info
  services: z.object({
    gmail: z.object({
      connected: z.boolean(),
      autoRefreshed: z.boolean(),
      integration: z.object({
        service: z.string(),
        expiryDate: z.string().nullable(),
        hasRefreshToken: z.boolean(),
      }).nullable(),
      lastSync: z.string().nullable(),
    }),
    calendar: z.object({
      connected: z.boolean(),
      autoRefreshed: z.boolean(),
      integration: z.object({
        service: z.string(),
        expiryDate: z.string().nullable(),
        hasRefreshToken: z.boolean(),
      }).nullable(),
      lastSync: z.string().nullable(),
    }),
  }),

  // Feature flags
  features: z.object({
    gmail: z.boolean(),
    calendar: z.boolean(),
  }),

  // Job processing metrics
  jobs: z.object({
    queued: z.number(),
    done: z.number(),
    error: z.number(),
  }),
  embedJobs: z.object({
    queued: z.number(),
    done: z.number(),
    error: z.number(),
  }),

  lastBatchId: z.string().nullable(),

  // Cache metadata
  _cached: z.boolean().optional(),
  _cacheTime: z.string().optional(),
});

