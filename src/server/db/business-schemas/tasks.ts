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
import { createSelectSchema } from "drizzle-zod";
import {
  tasks,
  zones,
  projects,
  inboxItems,
  type Task,
  type Zone,
  type Project,
  type InboxItem,
} from "@/server/db/schema";

// Create base schema from drizzle table for UI enhancements
const selectTaskSchema = createSelectSchema(tasks);
const selectProjectSchema = createSelectSchema(projects);
const selectZoneSchema = createSelectSchema(zones);
const selectInboxItemSchema = createSelectSchema(inboxItems);

// ============================================================================
// TASKS SCHEMAS
// ============================================================================

/**
 * UI-Enhanced Task Schema
 * Extends base Task with computed fields for UI display
 */
export const TaskWithUISchema = selectTaskSchema.transform((data) => {
  const dueDate = data.dueDate ? new Date(data.dueDate) : null;
  return {
    ...data,
    // UI computed fields
    isCompleted: data.status === "done",
    isOverdue: dueDate ? dueDate < new Date() && data.status !== "done" : false,
    isDueToday: dueDate ? dueDate.toDateString() === new Date().toDateString() : false,
    isHighPriority: ["high", "urgent"].includes(data.priority),
    hasSubtasks: false, // Would be computed via join query
  };
}) satisfies z.ZodType<
  Task & {
    isCompleted: boolean;
    isOverdue: boolean;
    isDueToday: boolean;
    isHighPriority: boolean;
    hasSubtasks: boolean;
  }
>;

export type TaskWithUI = z.infer<typeof TaskWithUISchema>;

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
 * UI-Enhanced Project Schema
 * Extends base Project with computed fields for UI display
 */
export const ProjectWithUISchema = selectProjectSchema.transform((data) => {
  const dueDate = data.dueDate ? new Date(data.dueDate) : null;
  return {
    ...data,
    dueDate,
    // UI computed fields
    isActive: data.status === "active",
    isCompleted: data.status === "completed",
    isOverdue: dueDate ? dueDate < new Date() && data.status !== "completed" : false,
    taskCount: 0, // Would be computed via join query
  };
}) satisfies z.ZodType<
  Project & {
    dueDate: Date | null;
    isActive: boolean;
    isCompleted: boolean;
    isOverdue: boolean;
    taskCount: number;
  }
>;

export type ProjectWithUI = z.infer<typeof ProjectWithUISchema>;

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
 * UI-Enhanced Inbox Item Schema
 * Extends base InboxItem with computed fields for UI display
 */
export const InboxItemWithUISchema = selectInboxItemSchema.transform((data) => ({
  ...data,
  // UI computed fields derived from rawText
  isProcessed: data.status === "processed",
  wordCount: data.rawText.split(/\s+/).length,
  preview: data.rawText.slice(0, 100) + (data.rawText.length > 100 ? "..." : ""),
})) satisfies z.ZodType<
  InboxItem & {
    isProcessed: boolean;
    wordCount: number;
    preview: string;
  }
>;

export type InboxItemWithUI = z.infer<typeof InboxItemWithUISchema>;

// ============================================================================
// INBOX QUERY & REQUEST SCHEMAS
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

// ============================================================================
// ZONES SCHEMAS
// ============================================================================

/**
 * UI-Enhanced Zone Schema
 * Extends base Zone with computed fields for UI display
 */
export const ZoneWithUISchema = selectZoneSchema.transform((data) => ({
  ...data,
  // Rename iconName to icon for UI consistency
  icon: data.iconName,
  // UI computed fields
  displayName: data.name,
  hasIcon: !!data.iconName,
  hasColor: !!data.color,
})) satisfies z.ZodType<
  Zone & {
    icon: string | null;
    displayName: string;
    hasIcon: boolean;
    hasColor: boolean;
  }
>;

export type ZoneWithUI = z.infer<typeof ZoneWithUISchema>;

/**
 * Zone with Statistics Schema (with transform)
 * Extends base Zone with statistics and additional computed fields
 */
export const ZoneWithStatsSchema = selectZoneSchema
  .extend({
    stats: z.object({
      activeProjects: z.number().int().min(0),
      completedProjects: z.number().int().min(0),
      activeTasks: z.number().int().min(0),
      completedTasks: z.number().int().min(0),
      totalItems: z.number().int().min(0),
      lastActivity: z.coerce.date().nullable(),
    }),
  })
  .transform((data) => ({
    ...data,
    // Rename iconName to icon for UI consistency
    icon: data.iconName,
    // Base zone computed fields
    displayName: data.name,
    hasIcon: !!data.iconName,
    hasColor: !!data.color,
    // Additional UI computed fields for stats
    hasActiveWork: data.stats.activeProjects > 0 || data.stats.activeTasks > 0,
    hasCompletedWork: data.stats.completedProjects > 0 || data.stats.completedTasks > 0,
    hasRecentActivity: data.stats.lastActivity
      ? Date.now() - data.stats.lastActivity.getTime() < 7 * 24 * 60 * 60 * 1000
      : false, // within 7 days
    workloadLevel: (() => {
      const total = data.stats.activeProjects + data.stats.activeTasks;
      if (total === 0) return "none" as const;
      if (total <= 3) return "light" as const;
      if (total <= 8) return "moderate" as const;
      return "heavy" as const;
    })(),
  }));

export type ZoneWithStats = z.infer<typeof ZoneWithStatsSchema>;

// ============================================================================
// ZONES QUERY SCHEMAS
// ============================================================================

/**
 * Zones Query Schema
 */
export const ZonesQuerySchema = z.object({
  withStats: z
    .string()
    .optional()
    .transform((val) => val === "true"),
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
 */
export const ZonesListResponseSchema = z.object({
  items: z.array(ZoneWithUISchema),
  total: z.number().int().min(0),
});

export type ZonesListResponse = z.infer<typeof ZonesListResponseSchema>;

/**
 * Zones with Stats Response Schema
 */
export const ZonesWithStatsResponseSchema = z.object({
  items: z.array(ZoneWithStatsSchema),
  total: z.number().int().min(0),
});

export type ZonesWithStatsResponse = z.infer<typeof ZonesWithStatsResponseSchema>;

/**
 * Zone Details Response Schema
 */
export const ZoneDetailsResponseSchema = z.object({
  zone: ZoneWithStatsSchema,
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
