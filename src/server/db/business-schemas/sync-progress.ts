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