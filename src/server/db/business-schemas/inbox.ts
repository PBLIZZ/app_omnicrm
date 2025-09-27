/**
 * Inbox Schemas
 *
 * Type definitions and validation schemas for inbox functionality.
 * Supports quick capture, voice capture, bulk processing, and AI categorization.
 */

import { z } from "zod";

// ============================================================================
// CORE INBOX SCHEMAS
// ============================================================================

/**
 * Base Inbox Item Schema (without transform)
 */
const BaseInboxItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  rawText: z.string().min(1),
  status: z.enum(["unprocessed", "processed", "archived"]),
  createdTaskId: z.string().uuid().nullable(),
  processedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

/**
 * Inbox Item Schema (with transform)
 */
export const InboxItemSchema = BaseInboxItemSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isProcessed: data.status === "processed",
  wordCount: data.rawText.split(/\s+/).length,
  preview: data.rawText.slice(0, 100) + (data.rawText.length > 100 ? "..." : ""),
}));

export type InboxItem = z.infer<typeof InboxItemSchema>;

/**
 * Create Inbox Item Schema
 */
export const CreateInboxItemSchema = BaseInboxItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
}).partial({
  status: true,
  createdTaskId: true,
});

export type CreateInboxItem = z.infer<typeof CreateInboxItemSchema>;

/**
 * Update Inbox Item Schema
 */
export const UpdateInboxItemSchema = BaseInboxItemSchema.partial().required({ id: true });
export type UpdateInboxItem = z.infer<typeof UpdateInboxItemSchema>;

// ============================================================================
// QUERY & REQUEST SCHEMAS
// ============================================================================

/**
 * Get Inbox Query Schema
 */
export const GetInboxQuerySchema = z.object({
  status: z.array(z.enum(["unprocessed", "processed", "archived"])).optional(),
  search: z.string().optional(),
  createdAfter: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  createdBefore: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  hasAiSuggestions: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  stats: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export type GetInboxQuery = z.infer<typeof GetInboxQuerySchema>;

/**
 * Voice Inbox Capture Schema
 */
export const VoiceInboxCaptureDTOSchema = z.object({
  audioData: z.string(), // Base64 encoded audio
  transcription: z.string().optional(),
  duration: z.number().positive().optional(),
});

export type VoiceInboxCaptureDTO = z.infer<typeof VoiceInboxCaptureDTOSchema>;

/**
 * Bulk Process Inbox Schema
 */
export const BulkProcessInboxDTOSchema = z.object({
  itemIds: z.array(z.string().uuid()),
  action: z.enum(["archive", "delete", "process"]),
});

export type BulkProcessInboxDTO = z.infer<typeof BulkProcessInboxDTOSchema>;

/**
 * Process Inbox Item Schema
 */
export const ProcessInboxItemSchema = z
  .object({
    itemId: z.string().uuid(),
    action: z.enum(["create_task", "archive", "delete"]),
    taskData: z
      .object({
        name: z.string().min(1),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        projectId: z.string().uuid().optional(),
      })
      .optional(),
  })
  .refine((data) => data.action !== "create_task" || data.taskData !== undefined, {
    message: "taskData is required when action is create_task",
  });

export type ProcessInboxItem = z.infer<typeof ProcessInboxItemSchema>;

// Alias for DTO pattern
export type ProcessInboxItemDTO = ProcessInboxItem;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Inbox List Response Schema
 */
export const InboxListResponseSchema = z.object({
  items: z.array(InboxItemSchema),
  total: z.number(),
});

export type InboxListResponse = z.infer<typeof InboxListResponseSchema>;

/**
 * Inbox Stats Response Schema
 */
export const InboxStatsResponseSchema = z.object({
  stats: z.object({
    unprocessed: z.number(),
    processed: z.number(),
    archived: z.number(),
    total: z.number(),
    recentActivity: z.number(), // items added in last 24h
  }),
});

export type InboxStatsResponse = z.infer<typeof InboxStatsResponseSchema>;

/**
 * Inbox Item Response Schema
 */
export const InboxItemResponseSchema = z.object({
  item: InboxItemSchema,
});

export type InboxItemResponse = z.infer<typeof InboxItemResponseSchema>;

/**
 * Inbox Process Result Response Schema
 */
export const InboxProcessResultResponseSchema = z.object({
  result: z.object({
    success: z.boolean(),
    message: z.string(),
    createdTaskId: z.string().uuid().optional(),
    processedItemId: z.string().uuid(),
  }),
});

export type InboxProcessResultResponse = z.infer<typeof InboxProcessResultResponseSchema>;

/**
 * Inbox Post Request Schema (Discriminated Union)
 */
export const InboxPostRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("quick_capture"),
    data: CreateInboxItemSchema,
  }),
  z.object({
    type: z.literal("voice_capture"),
    data: VoiceInboxCaptureDTOSchema,
  }),
  z.object({
    type: z.literal("bulk_process"),
    data: BulkProcessInboxDTOSchema,
  }),
]);

export type InboxPostRequest = z.infer<typeof InboxPostRequestSchema>;

/**
 * Inbox Update Request Schema (Discriminated Union)
 */
export const InboxUpdateRequestSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update_status"),
    data: UpdateInboxItemSchema,
  }),
  z.object({
    action: z.literal("mark_processed"),
    data: z
      .object({
        createdTaskId: z.string().uuid().optional(),
      })
      .optional(),
  }),
]);

export type InboxUpdateRequest = z.infer<typeof InboxUpdateRequestSchema>;

/**
 * Success Response Schema
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
});

export type SuccessResponse = z.infer<typeof SuccessResponseSchema>;

// ============================================================================
// AI PROCESSING TYPES
// ============================================================================

/**
 * Inbox Processing Context Schema
 */
export const InboxProcessingContextSchema = z.object({
  userContext: z
    .object({
      currentEnergy: z.number().min(0).max(5),
      availableTime: z.number().min(0),
      preferences: z.object({
        preferredZone: z.string().optional(),
        workingHours: z
          .object({
            start: z.string(),
            end: z.string(),
          })
          .optional(),
      }),
    })
    .optional(),
  zones: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      description: z.string().nullable(),
      color: z.string().nullable(),
      icon: z.string().nullable(),
      category: z.string().nullable(),
      isActive: z.boolean(),
      sortOrder: z.number().nullable(),
      createdAt: z.coerce.date(),
      updatedAt: z.coerce.date(),
    }),
  ),
});

export type InboxProcessingContext = z.infer<typeof InboxProcessingContextSchema>;

/**
 * Inbox Processing Result Schema
 */
export const InboxProcessingResultDTOSchema = z.object({
  suggestedZone: z.string(),
  suggestedPriority: z.enum(["low", "medium", "high", "urgent"]),
  suggestedProject: z.string().nullable(),
  extractedTasks: z.array(
    z.object({
      name: z.string(),
      description: z.string().nullable(),
      estimatedMinutes: z.number().nullable(),
      dueDate: z.coerce.date().nullable(),
    }),
  ),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export type InboxProcessingResultDTO = z.infer<typeof InboxProcessingResultDTOSchema>;
