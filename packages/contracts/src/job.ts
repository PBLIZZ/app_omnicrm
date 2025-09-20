import { z } from "zod";

/**
 * Job DTO Schema
 *
 * Stable UI-focused contract for background job data.
 */
export const JobDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  kind: z.enum([
    "normalize",
    "embed",
    "insight",
    "sync_gmail",
    "sync_calendar",
    "sync_drive",
    "google_gmail_sync" // Legacy support
  ]),
  payload: z.unknown(), // JSON blob with job-specific data
  status: z.enum([
    "queued",
    "processing",
    "completed",
    "failed",
    "retrying"
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
 * Job Queue Status DTO Schema
 *
 * Current state of the job queue
 */
export const JobQueueStatusDTOSchema = z.object({
  statusCounts: z.object({
    queued: z.number().int().min(0),
    processing: z.number().int().min(0),
    completed: z.number().int().min(0),
    failed: z.number().int().min(0),
    retrying: z.number().int().min(0),
  }),
  kindCounts: z.object({
    normalize: z.number().int().min(0),
    embed: z.number().int().min(0),
    insight: z.number().int().min(0),
    sync_gmail: z.number().int().min(0),
    sync_calendar: z.number().int().min(0),
    google_gmail_sync: z.number().int().min(0),
  }),
  totalJobs: z.number().int().min(0),
  pendingJobs: z.number().int().min(0),
  failedJobs: z.number().int().min(0),
});

export type JobQueueStatusDTO = z.infer<typeof JobQueueStatusDTOSchema>;

/**
 * Job Status Response DTO Schema
 *
 * Individual job status with extended metadata
 */
export const JobStatusResponseDTOSchema = z.object({
  id: z.string().uuid(),
  kind: z.string(),
  status: z.enum(["queued", "processing", "completed", "failed", "retrying"]),
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  batchId: z.string().uuid().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  attempts: z.number().int().min(0).optional(),
  hasError: z.boolean().optional(),
  ageMinutes: z.number().min(0).optional(),
  // Legacy Gmail sync fields
  totalEmails: z.number().int().min(0).optional(),
  processedEmails: z.number().int().min(0).optional(),
  newEmails: z.number().int().min(0).optional(),
  chunkSize: z.number().int().min(0).optional(),
  chunksTotal: z.number().int().min(0).optional(),
  chunksProcessed: z.number().int().min(0).optional(),
});

export type JobStatusResponseDTO = z.infer<typeof JobStatusResponseDTOSchema>;

/**
 * Data Freshness DTO Schema
 *
 * Indicators of data processing state
 */
export const DataFreshnessDTOSchema = z.object({
  totalRawEvents: z.number().int().min(0),
  totalInteractions: z.number().int().min(0),
  totalContacts: z.number().int().min(0),
  processingRate: z.number().min(0).max(100),
  needsProcessing: z.boolean(),
  pendingNormalization: z.number().int().min(0),
  pendingEmbedding: z.number().int().min(0),
  pendingInsights: z.number().int().min(0),
  lastProcessedAt: z.string().nullable(),
});

export type DataFreshnessDTO = z.infer<typeof DataFreshnessDTOSchema>;

/**
 * Processing Health DTO Schema
 *
 * Overall health metrics for job processing system
 */
export const ProcessingHealthDTOSchema = z.object({
  score: z.number().min(0).max(100),
  status: z.enum(["excellent", "good", "warning", "critical"]),
  issues: z.array(z.string()),
});

export type ProcessingHealthDTO = z.infer<typeof ProcessingHealthDTOSchema>;

/**
 * Comprehensive Job Status DTO Schema
 *
 * Complete job status response for the /api/jobs/status endpoint
 */
export const ComprehensiveJobStatusDTOSchema = z.object({
  queue: JobQueueStatusDTOSchema,
  pendingJobs: z.array(z.object({
    id: z.string().uuid(),
    kind: z.string(),
    status: z.string(),
    attempts: z.number().int().min(0),
    batchId: z.string().uuid().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
    hasError: z.boolean(),
    ageMinutes: z.number().min(0),
  })),
  dataFreshness: DataFreshnessDTOSchema.nullable(),
  estimatedCompletion: z.object({
    totalJobs: z.number().int().min(0),
    estimatedSeconds: z.number().min(0),
    estimatedMinutes: z.number().min(0),
    estimatedCompletionAt: z.string(),
  }).nullable(),
  stuckJobs: z.array(z.object({
    id: z.string().uuid(),
    kind: z.string(),
    ageMinutes: z.number().min(0),
  })),
  health: ProcessingHealthDTOSchema,
  // Legacy compatibility fields
  jobs: z.array(JobStatusResponseDTOSchema),
  currentBatch: z.string().uuid().nullable(),
  totalEmails: z.number().int().min(0).optional(),
  processedEmails: z.number().int().min(0).optional(),
  timestamp: z.string(),
});

export type ComprehensiveJobStatusDTO = z.infer<typeof ComprehensiveJobStatusDTOSchema>;

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