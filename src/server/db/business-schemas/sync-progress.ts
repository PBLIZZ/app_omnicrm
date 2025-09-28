/**
 * Sync Progress & Session Management Schemas
 *
 * All schemas related to sync session tracking, progress monitoring, and session management.
 */

import { z } from "zod";

// ============================================================================
// SYNC PROGRESS SCHEMAS
// ============================================================================

/**
 * Sync Progress Query Schema - for URL params in /api/sync-progress/[sessionId]
 */
export const SyncProgressQuerySchema = z.object({
  sessionId: z.string().uuid("Invalid session ID format"),
});

export type SyncProgressQuery = z.infer<typeof SyncProgressQuerySchema>;

/**
 * Sync Progress Response Schema - detailed progress information
 */
export const SyncProgressResponseSchema = z.object({
  sessionId: z.string().uuid(),
  service: z.string(),
  status: z.string(),
  progress: z.object({
    percentage: z.number(),
    currentStep: z.string(),
    totalItems: z.number(),
    importedItems: z.number(),
    processedItems: z.number(),
    failedItems: z.number(),
  }),
  timeEstimate: z.object({
    remainingSeconds: z.number(),
    eta: z.string().optional(),
  }).optional(),
  timestamps: z.object({
    startedAt: z.string(),
    completedAt: z.string().optional(),
    lastUpdate: z.string(),
  }),
  errorDetails: z.record(z.unknown()).nullable(),
  preferences: z.record(z.unknown()),
});

export type SyncProgressResponse = z.infer<typeof SyncProgressResponseSchema>;

/**
 * Sync Cancel Response Schema - for DELETE /api/sync-progress/[sessionId]
 */
export const SyncCancelResponseSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string(),
  status: z.string(),
});

export type SyncCancelResponse = z.infer<typeof SyncCancelResponseSchema>;

/**
 * Sync Session Error Response Schema - for error cases
 */
export const SyncSessionErrorSchema = z.object({
  error: z.string(),
  sessionId: z.string().uuid().optional(),
  details: z.string().optional(),
});

export type SyncSessionError = z.infer<typeof SyncSessionErrorSchema>;

// ============================================================================
// USER SYNC PREFERENCES SCHEMAS
// ============================================================================

/**
 * User Sync Preferences Update Schema
 */
export const UserSyncPrefsUpdateSchema = z.object({
  gmailQuery: z.string().optional(),
  gmailLabelIncludes: z.array(z.string()).optional(),
  gmailLabelExcludes: z.array(z.string()).optional(),
  gmailTimeRangeDays: z.number().int().min(1).max(365).optional(),
  calendarIds: z.array(z.string()).optional(),
  calendarIncludeOrganizerSelf: z.boolean().optional(),
  calendarIncludePrivate: z.boolean().optional(),
  calendarTimeWindowDays: z.number().int().min(1).max(730).optional(),
  calendarFutureDays: z.number().int().min(1).max(730).optional(),
  driveIngestionMode: z.enum(["none", "picker", "folders"]).optional(),
  driveFolderIds: z.array(z.string()).optional(),
  driveMaxSizeMB: z.number().int().min(1).max(100).optional(),
  initialSyncCompleted: z.boolean().optional(),
  initialSyncDate: z.string().optional(),
});

export type UserSyncPrefsUpdate = z.infer<typeof UserSyncPrefsUpdateSchema>;

// ============================================================================
// SYNC SESSION ENTITY SCHEMAS
// ============================================================================

/**
 * Sync Session from database
 */
export const SyncSessionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  service: z.string(),
  status: z.string(),
  progress: z.record(z.string(), z.unknown()),
  errorDetails: z.record(z.string(), z.unknown()).nullable(),
  preferences: z.record(z.string(), z.unknown()),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SyncSession = z.infer<typeof SyncSessionSchema>;

/**
 * New Sync Session for creation
 */
export const NewSyncSessionSchema = SyncSessionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NewSyncSession = z.infer<typeof NewSyncSessionSchema>;