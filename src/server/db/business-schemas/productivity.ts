/**
 * Task, Project, Zone Schemas for OmniMomentum
 *
 * For base types, import from @/server/db/schema:
 * - Task, Project, InboxItem, Zone (select type)
 * - CreateTask, CreateProject, CreateInboxItem, CreateZone (insert type)
 * - UpdateTask, UpdateProject, UpdateInboxItem, UpdateZone (partial insert type)
 *
 * This file contains ONLY UI-enhanced versions and API-specific schemas.
 */

import { z } from "zod";

// Note: Drizzle imports removed - UI enrichment moved to service-layer mappers
// Per architecture blueprint: business schemas are pure validation only

const taskStatusValues = ["todo", "in_progress", "done", "canceled"] as const;
const taskPriorityValues = ["low", "medium", "high", "urgent"] as const;
const projectStatusValues = ["active", "on_hold", "completed", "archived"] as const;

const detailsSchema = z.record(z.string(), z.unknown());
const nullableDetailsSchema = z
  .union([detailsSchema, z.null(), z.undefined()])
  .transform((value) => (value == null ? {} : value));

const inputDateSchema = z.union([z.string(), z.number(), z.date(), z.null(), z.undefined()]);

function coerceNullableDate(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return date;
}

const dateInputTransform = inputDateSchema.transform(coerceNullableDate);

// ============================================================================
// BASE TASK & PROJECT SCHEMAS
// ============================================================================

export const TaskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  name: z.string(),
  status: z.enum(taskStatusValues),
  priority: z.enum(taskPriorityValues),
  dueDate: z.date().nullable(),
  details: nullableDetailsSchema,
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type TaskSchemaOutput = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = z.object({
  name: z.string().min(1),
  projectId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  status: z.enum(taskStatusValues).optional(),
  priority: z.enum(taskPriorityValues).optional(),
  dueDate: dateInputTransform.optional(),
  details: detailsSchema.optional(),
});

export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
  completedAt: dateInputTransform.optional(),
});

export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

export const ProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string(),
  status: z.enum(projectStatusValues),
  dueDate: z.date().nullable(),
  details: nullableDetailsSchema,
  zoneId: z.number().int().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type ProjectSchemaOutput = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = z.object({
  name: z.string().min(1),
  status: z.enum(projectStatusValues).optional(),
  dueDate: dateInputTransform.optional(),
  details: detailsSchema.optional(),
  zoneId: z.number().int().optional(),
});

export const UpdateProjectSchema = CreateProjectSchema.partial();

export type CreateProjectInput = z.infer<typeof CreateProjectSchema>;
export type UpdateProjectInput = z.infer<typeof UpdateProjectSchema>;

// ============================================================================
// TASKS SCHEMAS
// ============================================================================

/**
 * Task Schema (Pure Validation)
 * Note: UI enrichment moved to service layer mapper (mapToTaskWithUI)
 * Per architecture blueprint: No transforms in business schemas
 */

/**
 * Task filters for search/filtering
 */
export const TaskFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  taggedContactId: z.string().uuid().optional(),
  dueAfter: z.coerce.date().optional(),
  dueBefore: z.coerce.date().optional(),
  hasSubtasks: z.boolean().optional(),
});

export type TaskFilters = z.infer<typeof TaskFiltersSchema>;

// ============================================================================
// PROJECTS SCHEMAS
// ============================================================================

/**
 * Project Schema (Pure Validation)
 * Note: UI enrichment moved to service layer mapper (mapToProjectWithUI)
 * Per architecture blueprint: No transforms in business schemas
 */

/**
 * Project filters for search/filtering
 */
export const ProjectFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.string()).optional(),
  zoneId: z.coerce.number().optional(),
  dueAfter: z.string().optional(),
  dueBefore: z.string().optional(),
});

export type ProjectFilters = z.infer<typeof ProjectFiltersSchema>;

// ============================================================================
// INBOX SCHEMAS
// ============================================================================

/**
 * Inbox Item Schema (Pure Validation)
 * Note: UI enrichment moved to service layer mapper (mapToInboxItemWithUI)
 * Per architecture blueprint: No transforms in business schemas
 */

// ============================================================================
// INBOX QUERY & REQUEST SCHEMAS
// ============================================================================

/**
 * Get Inbox Query Schema
 * Note: Date/boolean transforms moved to handler layer per architecture blueprint
 */
export const GetInboxQuerySchema = z.object({
  status: z.array(z.enum(["unprocessed", "processed", "archived"])).optional(),
  search: z.string().optional(),
  createdAfter: z.string().optional(), // Handler validates and converts to Date
  createdBefore: z.string().optional(), // Handler validates and converts to Date
  hasAiSuggestions: z.string().optional(), // Handler converts "true" to boolean
  stats: z.string().optional(), // Handler converts "true" to boolean
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
 * Note: Max 50 items per request to prevent resource exhaustion
 */
export const BulkProcessInboxDTOSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1).max(50),
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
// INBOX RESPONSE SCHEMAS
// ============================================================================

/**
 * Inbox List Response Schema
 */
export const InboxListResponseSchema = z.object({
  items: z.array(z.unknown()), // Will be validated as InboxItem[] at runtime
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
  item: z.unknown(), // Will be validated as InboxItem at runtime
});

/**
 * Inbox Post Request Schema (Discriminated Union)
 */
export const InboxPostRequestSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("quick_capture"),
    data: z.object({
      rawText: z.string().min(1),
      status: z.enum(["unprocessed", "processed", "archived"]).optional(),
      createdTaskId: z.string().uuid().nullable().optional(),
    }),
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
    data: z.object({
      id: z.string().uuid(),
      status: z.enum(["unprocessed", "processed", "archived"]).optional(),
      rawText: z.string().optional(),
      createdTaskId: z.string().uuid().nullable().optional(),
      processedAt: z.coerce.date().nullable().optional(),
    }),
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
// INBOX AI PROCESSING TYPES
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

/**
 * Inbox Processing Response Schemas
 * Note: Returns raw InboxItem array - UI enrichment happens in service layer
 */
export const InboxBulkProcessResultSchema = z.object({
  processed: z.array(z.unknown()), // Will be InboxItem[] - service layer handles UI enrichment
  results: z.array(InboxProcessingResultDTOSchema).optional(),
});

export const InboxProcessResultResponseSchema = z.object({
  result: z.union([InboxProcessingResultDTOSchema, InboxBulkProcessResultSchema]),
});

// Note: VoiceInboxCaptureDTOSchema and BulkProcessInboxDTOSchema are defined above to avoid duplicates

// ============================================================================
// ZONES SCHEMAS
// ============================================================================

/**
 * Zone Schemas (Pure Validation)
 * Note: UI enrichment moved to service layer mappers (mapToZoneWithUI, mapToZoneWithStats)
 * Per architecture blueprint: No transforms in business schemas
 */

/**
 * Zone Stats Schema (for service layer response)
 */
export const ZoneStatsSchema = z.object({
  activeProjects: z.number().int().min(0),
  completedProjects: z.number().int().min(0),
  activeTasks: z.number().int().min(0),
  completedTasks: z.number().int().min(0),
  totalItems: z.number().int().min(0),
  lastActivity: z.coerce.date().nullable(),
});

export type ZoneStats = z.infer<typeof ZoneStatsSchema>;

// ============================================================================
// ZONES QUERY SCHEMAS
// ============================================================================

/**
 * Zones Query Schema
 * Note: String to boolean conversion moved to handler layer
 */
export const ZonesQuerySchema = z.object({
  withStats: z.string().optional(), // Handler converts "true" string to boolean
});

/**
 * Zone Filters Schema
 */
export const ZoneFiltersSchema = z.object({
  hasProjects: z.boolean().optional(),
  hasTasks: z.boolean().optional(),
  lastActivityAfter: z.coerce.date().optional(),
  lastActivityBefore: z.coerce.date().optional(),
});

// ============================================================================
// ZONES RESPONSE SCHEMAS
// ============================================================================

/**
 * Zones List Response Schema
 * Note: Returns raw Zone array - UI enrichment happens in service layer
 */
export const ZonesListResponseSchema = z.object({
  items: z.array(z.unknown()), // Will be Zone[] - service layer handles UI enrichment
  total: z.number().int().min(0),
});

export type ZonesListResponse = z.infer<typeof ZonesListResponseSchema>;

/**
 * Zones with Stats Response Schema
 * Note: Returns raw data - UI enrichment happens in service layer
 */
export const ZonesWithStatsResponseSchema = z.object({
  items: z.array(z.unknown()), // Will be { zone: Zone, stats: ZoneStats }[] - service layer handles UI enrichment
  total: z.number().int().min(0),
});

export type ZonesWithStatsResponse = z.infer<typeof ZonesWithStatsResponseSchema>;

/**
 * Zone Details Response Schema
 * Note: Returns raw data - UI enrichment happens in service layer
 */
export const ZoneDetailsResponseSchema = z.object({
  zone: z.unknown(), // Will be Zone with stats - service layer handles UI enrichment
  recentProjects: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        status: z.string(),
        updatedAt: z.coerce.date(),
      }),
    )
    .optional(),
  recentTasks: z
    .array(
      z.object({
        id: z.string().uuid(),
        name: z.string(),
        status: z.string(),
        priority: z.string(),
        updatedAt: z.coerce.date(),
      }),
    )
    .optional(),
});

// ============================================================================
// ZONES RE-EXPORTS
// ============================================================================

// Re-export base types from schema for convenience
export type {
  Task,
  CreateTask,
  UpdateTask,
  Project,
  CreateProject,
  UpdateProject,
  InboxItem,
  CreateInboxItem,
  UpdateInboxItem,
  Zone,
  CreateZone,
  UpdateZone,
} from "@/server/db/schema";
