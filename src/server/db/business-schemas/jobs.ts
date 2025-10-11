/**
 * Job Processing & Background Tasks Schemas
 *
 * All schemas related to job processing, queuing, and background task management.
 */

import { z } from "zod";

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

// ============================================================================
// JOB RUNNER SCHEMAS (Production endpoint: /api/jobs/runner)
// ============================================================================

/**
 * Simple Job Process Request Schema
 * Used for endpoints that trigger job processing with optional limits
 */
export const SimpleJobProcessSchema = z.object({
  maxJobs: z.number().optional(),
});

/**
 * Job Processing Result Schema
 * Standard response for job processing operations
 */
export const JobProcessingResultSchema = z.object({
  message: z.string(),
  runner: z.string().optional(),
  processed: z.number(),
  succeeded: z.number(),
  failed: z.number(),
  errors: z.array(z.string()).optional(),
});

/**
 * Job Status Data Schema
 * Individual job status information returned in API responses
 */
export const JobStatusDataSchema = z.object({
  id: z.string(),
  kind: z.string(),
  status: z.enum(["queued", "processing", "done", "error"]),
  createdAt: z.string(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CronJobInput = z.infer<typeof CronJobInputSchema>;
export type CronJobResult = z.infer<typeof CronJobResultSchema>;
export type SimpleJobProcess = z.infer<typeof SimpleJobProcessSchema>;
export type JobProcessingResult = z.infer<typeof JobProcessingResultSchema>;
export type JobStatusData = z.infer<typeof JobStatusDataSchema>;

