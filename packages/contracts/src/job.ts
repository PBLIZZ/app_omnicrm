import { z } from "zod";

/**
 * Job DTO Schema
 *
 * Stable UI-focused contract for background job data.
 */
export const JobDTOSchema = z.object({
  id: z.string().uuid(),
  kind: z.enum([
    "normalize",
    "embed",
    "insight",
    "sync_gmail",
    "sync_calendar",
    "sync_drive"
  ]),
  payload: z.unknown(), // JSON blob with job-specific data
  status: z.enum([
    "queued",
    "running",
    "completed",
    "failed",
    "cancelled"
  ]).default("queued"),
  attempts: z.number().int().min(0).default(0),
  batchId: z.string().uuid().nullable(),
  lastError: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type JobDTO = z.infer<typeof JobDTOSchema>;

/**
 * Create Job DTO Schema
 */
export const CreateJobDTOSchema = z.object({
  kind: z.enum([
    "normalize",
    "embed",
    "insight",
    "sync_gmail",
    "sync_calendar",
    "sync_drive"
  ]),
  payload: z.unknown(),
  batchId: z.string().uuid().optional(),
});

export type CreateJobDTO = z.infer<typeof CreateJobDTOSchema>;

/**
 * Job Status DTO Schema
 *
 * Real-time job status information for UI
 */
export const JobStatusDTOSchema = z.object({
  totalJobs: z.number().int().min(0),
  queuedJobs: z.number().int().min(0),
  runningJobs: z.number().int().min(0),
  completedJobs: z.number().int().min(0),
  failedJobs: z.number().int().min(0),
  lastProcessedAt: z.coerce.date().nullable(),
  processingRate: z.number().min(0), // jobs per minute
});

export type JobStatusDTO = z.infer<typeof JobStatusDTOSchema>;

/**
 * Batch Job DTO Schema
 *
 * Information about job batches
 */
export const BatchJobDTOSchema = z.object({
  batchId: z.string().uuid(),
  totalJobs: z.number().int().min(0),
  completedJobs: z.number().int().min(0),
  failedJobs: z.number().int().min(0),
  status: z.enum(["running", "completed", "failed", "partial"]),
  createdAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
});

export type BatchJobDTO = z.infer<typeof BatchJobDTOSchema>;