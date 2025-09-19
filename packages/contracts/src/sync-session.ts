import { z } from "zod";

/**
 * Sync Session DTO Schema
 *
 * Stable UI-focused contract for sync session data.
 * Tracks progress and status of data synchronization operations.
 */
export const SyncSessionDTOSchema = z.object({
  id: z.string().uuid(),
  service: z.enum(["gmail", "calendar", "drive"]),
  status: z.enum([
    "started",
    "importing",
    "processing",
    "completed",
    "failed",
    "cancelled"
  ]).default("started"),
  progressPercentage: z.number().int().min(0).max(100).default(0),
  currentStep: z.string().nullable(),
  totalItems: z.number().int().min(0).default(0),
  importedItems: z.number().int().min(0).default(0),
  processedItems: z.number().int().min(0).default(0),
  failedItems: z.number().int().min(0).default(0),
  startedAt: z.coerce.date(),
  completedAt: z.coerce.date().nullable(),
  errorDetails: z.unknown().default({}), // JSON blob
  preferences: z.unknown().default({}), // JSON blob with sync preferences
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type SyncSessionDTO = z.infer<typeof SyncSessionDTOSchema>;

/**
 * Sync Audit DTO Schema
 *
 * Audit trail for sync operations
 */
export const SyncAuditDTOSchema = z.object({
  id: z.string().uuid(),
  provider: z.enum(["gmail", "calendar", "drive"]),
  action: z.enum(["preview", "approve", "undo"]),
  payload: z.unknown().nullable(), // JSON blob
  createdAt: z.coerce.date(),
});

export type SyncAuditDTO = z.infer<typeof SyncAuditDTOSchema>;

/**
 * Create Sync Session DTO Schema
 */
export const CreateSyncSessionDTOSchema = z.object({
  service: z.enum(["gmail", "calendar", "drive"]),
  preferences: z.unknown().optional(),
});

export type CreateSyncSessionDTO = z.infer<typeof CreateSyncSessionDTOSchema>;

/**
 * Update Sync Session DTO Schema
 */
export const UpdateSyncSessionDTOSchema = z.object({
  status: z.enum([
    "started",
    "importing",
    "processing",
    "completed",
    "failed",
    "cancelled"
  ]).optional(),
  progressPercentage: z.number().int().min(0).max(100).optional(),
  currentStep: z.string().optional(),
  totalItems: z.number().int().min(0).optional(),
  importedItems: z.number().int().min(0).optional(),
  processedItems: z.number().int().min(0).optional(),
  failedItems: z.number().int().min(0).optional(),
  completedAt: z.coerce.date().optional(),
  errorDetails: z.unknown().optional(),
});

export type UpdateSyncSessionDTO = z.infer<typeof UpdateSyncSessionDTOSchema>;

/**
 * Sync Session Filters Schema
 */
export const SyncSessionFiltersSchema = z.object({
  service: z.enum(["gmail", "calendar", "drive"]).optional(),
  status: z.enum([
    "started",
    "importing",
    "processing",
    "completed",
    "failed",
    "cancelled"
  ]).optional(),
});

export type SyncSessionFilters = z.infer<typeof SyncSessionFiltersSchema>;

/**
 * Sync Progress DTO Schema
 *
 * Real-time sync progress information for UI
 */
export const SyncProgressDTOSchema = z.object({
  sessionId: z.string().uuid(),
  service: z.enum(["gmail", "calendar", "drive"]),
  status: z.enum([
    "started",
    "importing",
    "processing",
    "completed",
    "failed",
    "cancelled"
  ]),
  progressPercentage: z.number().int().min(0).max(100),
  currentStep: z.string().nullable(),
  itemsProgress: z.object({
    total: z.number().int().min(0),
    imported: z.number().int().min(0),
    processed: z.number().int().min(0),
    failed: z.number().int().min(0),
  }),
  timeEstimate: z.object({
    startedAt: z.coerce.date(),
    estimatedCompletion: z.coerce.date().nullable(),
    elapsedMs: z.number().int().min(0),
  }),
  hasErrors: z.boolean(),
  canCancel: z.boolean(),
});

export type SyncProgressDTO = z.infer<typeof SyncProgressDTOSchema>;