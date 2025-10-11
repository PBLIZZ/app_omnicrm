/**
 * Inbox Schemas
 *
 * Type definitions and validation schemas for inbox functionality.
 * Supports quick capture, voice capture, bulk processing, and AI categorization.
 */

import { z } from "zod";
import { type InboxItem as DbInboxItem, type CreateInboxItem as DbCreateInboxItem } from "@/server/db/schema";

// ============================================================================
// CORE INBOX SCHEMAS
// ============================================================================

/**
 * Base Inbox Item Schema (derived from database schema)
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
}) satisfies z.ZodType<DbInboxItem>;

/**
 * Inbox Item Schema (with transform)
 */
export const InboxItemSchema = BaseInboxItemSchema.transform((data) => ({
  ...data,
  // UI computed fields derived from rawText
  isProcessed: data.status === "processed",
  wordCount: data.rawText.split(/\s+/).length,
  preview: data.rawText.slice(0, 100) + (data.rawText.length > 100 ? "..." : ""),
}));

export type InboxItem = z.infer<typeof InboxItemSchema>;

/**
 * Create Inbox Item Schema
 * Note: userId is optional for client-side usage (injected server-side from auth session)
 */
export const CreateInboxItemSchema = BaseInboxItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  processedAt: true,
}).partial({
  userId: true, // Optional - server provides from authenticated session
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

/**
 * Inbox Item Response Schema
 */
export const InboxItemResponseSchema = z.object({
  item: InboxItemSchema,
});

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

/**
 * Success Response Schema
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
});

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
      color: z.string().nullable(),
      iconName: z.string().nullable(),
      // UI computed fields from Zone transform
      icon: z.string().nullable(),
      displayName: z.string(),
      hasIcon: z.boolean(),
      hasColor: z.boolean(),
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

// Note: VoiceInboxCaptureDTOSchema and BulkProcessInboxDTOSchema are defined above to avoid duplicates
