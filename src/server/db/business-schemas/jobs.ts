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
