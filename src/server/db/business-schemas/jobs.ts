/**
 * Job Processing & Background Tasks Schemas
 *
 * All schemas related to job processing, queuing, and background task management.
 */

import { z } from "zod";

// ============================================================================
// JOB STATUS SCHEMAS
// ============================================================================

/**
 * Job Status Query Schema - for /api/jobs/status
 */
export const JobStatusQuerySchema = z.object({
  includeHistory: z.coerce.boolean().optional().default(false),
  includeFreshness: z.coerce.boolean().optional().default(true),
  batchId: z.string().optional(), // For tracking specific sync session jobs
});

export type JobStatusQuery = z.infer<typeof JobStatusQuerySchema>;

/**
 * Comprehensive Job Status Response Schema
 */
export const ComprehensiveJobStatusDTOSchema = z.object({
  queue: z.object({
    statusCounts: z.object({
      queued: z.number(),
      processing: z.number(),
      completed: z.number(),
      failed: z.number(),
      retrying: z.number(),
    }),
    kindCounts: z.object({
      normalize: z.number(),
      embed: z.number(),
      insight: z.number(),
      sync_gmail: z.number(),
      sync_calendar: z.number(),
      google_gmail_sync: z.number(),
    }),
    totalJobs: z.number(),
    pendingJobs: z.number(),
    failedJobs: z.number(),
  }),
  pendingJobs: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.string(),
      status: z.string(),
      createdAt: z.string(),
      attempts: z.number(),
    }),
  ),
  dataFreshness: z
    .object({
      lastSync: z.string(),
      staleness: z.number(),
      freshness: z.enum(["fresh", "stale", "very_stale"]),
    })
    .nullable(),
  estimatedCompletion: z
    .object({
      remainingJobs: z.number(),
      estimatedMinutes: z.number(),
      eta: z.string(),
    })
    .nullable(),
  stuckJobs: z.array(
    z.object({
      id: z.string().uuid(),
      kind: z.string(),
      stuckForMinutes: z.number(),
      lastHeartbeat: z.string(),
    }),
  ),
  health: z.object({
    score: z.number().min(0).max(100),
    status: z.enum(["healthy", "degraded", "critical"]),
    issues: z.array(z.string()),
  }),
  jobs: z
    .array(
      z.object({
        id: z.string().uuid(),
        kind: z.string(),
        status: z.string(),
        createdAt: z.string(),
        completedAt: z.string().optional(),
        attempts: z.number(),
        error: z.string().optional(),
      }),
    )
    .optional(),
  currentBatch: z
    .object({
      id: z.string().uuid(),
      progress: z.number(),
      total: z.number(),
    })
    .nullable(),
  timestamp: z.string(),
});

export type ComprehensiveJobStatusDTO = z.infer<typeof ComprehensiveJobStatusDTOSchema>;

// ============================================================================
// JOB PROCESSING SCHEMAS
// ============================================================================

/**
 * Manual Job Processing Request Schema - for /api/jobs/process-manual
 */
export const ProcessManualSchema = z.object({
  // Optional filters for selective processing
  jobTypes: z
    .array(
      z.enum(["normalize", "embed", "insight", "sync_gmail", "sync_calendar", "google_gmail_sync"]),
    )
    .optional(),
  batchId: z.string().optional(), // Process only jobs from specific batch
  maxJobs: z.number().int().min(1).max(100).optional().default(25), // Limit for safety

  // Processing options
  includeRetrying: z.boolean().optional().default(true), // Include jobs in retrying state
  skipStuckJobs: z.boolean().optional().default(false), // Skip jobs stuck in processing

  // Feedback options
  realTimeUpdates: z.boolean().optional().default(true), // Enable progress tracking
});

export type ProcessManualRequest = z.infer<typeof ProcessManualSchema>;

/**
 * Job Processing Result Schema - standard response for all job processing endpoints
 */
export const JobProcessingResultSchema = z.object({
  ok: z.boolean(),
  data: z
    .object({
      message: z.string(),
      processed: z.number(),
      succeeded: z.number(),
      failed: z.number(),
      errors: z.array(z.string()).optional(),
      runner: z.string().optional(),
    })
    .optional(),
  error: z.string().optional(),
  details: z.string().optional(),
  suggestions: z.array(z.string()).optional(),
  fallback: z.unknown().optional(),
});

export type JobProcessingResult = z.infer<typeof JobProcessingResultSchema>;

/**
 * Simple Job Processing Input Schema - for /api/jobs/process (no input needed)
 */
export const SimpleJobProcessSchema = z.object({
  // Empty schema for endpoints that don't need input
});

export type SimpleJobProcess = z.infer<typeof SimpleJobProcessSchema>;

/**
 * Calendar Events Job Creation Result Schema - for /api/jobs/process/calendar-events
 */
export const CalendarEventsJobResultSchema = z.object({
  ok: z.boolean(),
  data: z
    .object({
      message: z.string(),
      processed: z.number(),
      totalCalendarEvents: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});

export type CalendarEventsJobResult = z.infer<typeof CalendarEventsJobResultSchema>;

/**
 * Raw Events Job Creation Result Schema - for /api/jobs/process/raw-events
 */
export const RawEventsJobResultSchema = z.object({
  ok: z.boolean(),
  data: z
    .object({
      message: z.string(),
      processed: z.number(),
      totalRawEvents: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});

export type RawEventsJobResult = z.infer<typeof RawEventsJobResultSchema>;

/**
 * Normalize Job Processing Result Schema - for /api/jobs/process/normalize
 */
export const NormalizeJobResultSchema = z.object({
  ok: z.boolean(),
  data: z
    .object({
      message: z.string(),
      processed: z.number(),
      succeeded: z.number(),
      failed: z.number(),
    })
    .optional(),
  error: z.string().optional(),
  details: z.string().optional(),
});

export type NormalizeJobResult = z.infer<typeof NormalizeJobResultSchema>;

// ============================================================================
// CRON JOB SCHEMAS
// ============================================================================

/**
 * Cron Job Input Schema - for /api/cron/process-jobs
 * Note: This endpoint uses CRON_SECRET validation instead of user auth
 */
export const CronJobInputSchema = z.object({
  // Empty schema - authentication is handled via CRON_SECRET header
});

export type CronJobInput = z.infer<typeof CronJobInputSchema>;

/**
 * Cron Job Processing Result Schema
 */
export const CronJobResultSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  processed: z.number(),
  failed: z.number(),
  error: z.string().optional(),
});

export type CronJobResult = z.infer<typeof CronJobResultSchema>;
