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

export type GooglePrefsQuery = z.infer<typeof GooglePrefsQuerySchema>;

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

export type GooglePrefsResponse = z.infer<typeof GooglePrefsResponseSchema>;

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

export type GooglePrefsUpdate = z.infer<typeof GooglePrefsUpdateSchema>;

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

export type GoogleStatusQuery = z.infer<typeof GoogleStatusQuerySchema>;

/**
 * Google Status Response Schema
 * Used by /api/google/status endpoint
 */
export const GoogleStatusResponseSchema = z.object({
  services: z.object({
    gmail: z.object({
      isConnected: z.boolean(),
      lastSyncTime: z.string().nullable(),
      totalEvents: z.number(),
      recentErrorCount: z.number(),
      tokenExpiry: z.string().nullable().optional(),
      hasRefreshToken: z.boolean().optional(),
      autoRefreshed: z.boolean().optional(),
    }),
    calendar: z.object({
      isConnected: z.boolean(),
      lastSyncTime: z.string().nullable(),
      totalEvents: z.number(),
      recentErrorCount: z.number(),
      tokenExpiry: z.string().nullable().optional(),
      hasRefreshToken: z.boolean().optional(),
      autoRefreshed: z.boolean().optional(),
    }),
  }),
  overall: z.object({
    hasAnyConnection: z.boolean(),
    pendingJobs: z.number(),
    lastActivity: z.string().nullable(),
    healthStatus: z.enum(['healthy', 'degraded', 'critical']).optional(),
  }),
  timestamp: z.string(),
});

export type GoogleStatusResponse = z.infer<typeof GoogleStatusResponseSchema>;