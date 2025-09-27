/**
 * Business Schema Layer
 *
 * Single source of truth for all entity types and validation.
 * Auto-derived from database types with UI-specific extensions.
 *
 * Generated from: database.types.ts
 * Usage: Import types and schemas from here, not from database.types directly
 */

import { z } from "zod";
import type { Database } from "../database.types";

// ============================================================================
// HELPER UTILITIES
// ============================================================================

/**
 * Helper to normalize tag arrays from various formats
 */
function normalizeTagArray(value: unknown): string[] | null {
  if (value === null || value === undefined) return null;
  if (Array.isArray(value)) {
    return value
      .map((tag) => {
        if (typeof tag === "string") return tag;
        if (typeof tag === "object" && tag !== null) {
          const tagObj = tag as Record<string, unknown>;
          return String(tagObj["tag"] || tagObj["name"] || "");
        }
        return String(tag || "");
      })
      .filter(Boolean);
  }
  return null;
}

/**
 * Get initials from display name
 */
function getInitials(displayName: string): string {
  return displayName
    .split(" ")
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// ============================================================================
// CORE ENTITY SCHEMAS
// ============================================================================

/**
 * Contact Schema
 * Enhanced with UI-specific computed fields and validation
 */
const BaseContactSchema = z.object({
  // Database fields
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string().min(1),
  primaryEmail: z.string().email().nullable(),
  primaryPhone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  source: z.string().nullable(),
  lifecycleStage: z.string().nullable(),
  tags: z.preprocess((value) => normalizeTagArray(value), z.array(z.string()).nullable()),
  confidenceScore: z
    .preprocess(
      (val) => {
        if (typeof val === "string") {
          const num = Number(val);
          return isNaN(num) ? val : num;
        }
        return val;
      },
      z
        .number()
        .min(0)
        .max(1)
        .transform((n) => n.toString()),
    )
    .nullable(),
  address: z.record(z.string(), z.unknown()).nullable(),
  clientStatus: z.string().nullable(),
  referralSource: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  healthContext: z.record(z.string(), z.unknown()).nullable(),
  preferences: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ContactSchema = BaseContactSchema.transform((data) => ({
  ...data,
  // UI computed fields
  initials: getInitials(data.displayName),
  hasValidEmail: !!data.primaryEmail?.includes("@"),
  hasValidPhone: !!data.primaryPhone?.replace(/\D/g, "").length,
  tagCount: data.tags?.length || 0,
}));

export type Contact = z.infer<typeof ContactSchema>;

/**
 * Contact creation schema (omits generated fields)
 */
export const CreateContactSchema = BaseContactSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateContact = z.infer<typeof CreateContactSchema>;

/**
 * Contact update schema (all fields optional except id)
 */
export const UpdateContactSchema = BaseContactSchema.partial().required({ id: true });
export type UpdateContact = z.infer<typeof UpdateContactSchema>;

/**
 * Note Schema
 */
const BaseNoteSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  title: z.string().nullable(),
  content: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const NoteSchema = BaseNoteSchema.transform((data) => ({
  ...data,
  // UI computed fields
  wordCount: data.content.split(/\s+/).length,
  isAiGenerated: data.content.startsWith("[AI Generated]"),
  preview: data.content.slice(0, 100) + (data.content.length > 100 ? "..." : ""),
}));

export type Note = z.infer<typeof NoteSchema>;

export const CreateNoteSchema = BaseNoteSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateNote = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = BaseNoteSchema.partial().required({ id: true });
export type UpdateNote = z.infer<typeof UpdateNoteSchema>;

/**
 * Interaction Schema
 */
const BaseInteractionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  type: z.string(),
  subject: z.string().nullable(),
  bodyText: z.string().nullable(),
  bodyRaw: z.record(z.string(), z.unknown()).nullable(),
  occurredAt: z.coerce.date(),
  source: z.string().nullable(),
  sourceId: z.string().nullable(),
  sourceMeta: z.record(z.string(), z.unknown()).nullable(),
  batchId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

export const InteractionSchema = BaseInteractionSchema.transform((data) => ({
  ...data,
  // UI computed fields
  hasContent: !!(data.bodyText || data.subject),
  contentPreview:
    data.bodyText?.slice(0, 150) + (data.bodyText && data.bodyText.length > 150 ? "..." : "") ||
    data.subject ||
    "No content",
  isEmail: data.type === "email",
  isCall: data.type === "call",
  isMeeting: data.type === "meeting",
}));

export type Interaction = z.infer<typeof InteractionSchema>;

export const CreateInteractionSchema = BaseInteractionSchema.omit({
  id: true,
  createdAt: true,
});

export type CreateInteraction = z.infer<typeof CreateInteractionSchema>;

/**
 * Calendar Event Schema
 */
const BaseCalendarEventSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  googleEventId: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  attendees: z.record(z.string(), z.unknown()).nullable(),
  location: z.string().nullable(),
  status: z.string().nullable(),
  timeZone: z.string().nullable(),
  isAllDay: z.boolean().nullable(),
  visibility: z.string().nullable(),
  eventType: z.string().nullable(),
  businessCategory: z.string().nullable(),
  keywords: z.record(z.string(), z.unknown()).nullable(),
  googleUpdated: z.coerce.date().nullable(),
  lastSynced: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CalendarEventSchema = BaseCalendarEventSchema.transform((data) => ({
  ...data,
  // UI computed fields
  duration: Math.round((data.endTime.getTime() - data.startTime.getTime()) / (1000 * 60)), // minutes
  isUpcoming: data.startTime > new Date(),
  isPast: data.endTime < new Date(),
  isToday: data.startTime.toDateString() === new Date().toDateString(),
  attendeeCount: Array.isArray(data.attendees) ? data.attendees.length : 0,
}));

export type CalendarEvent = z.infer<typeof CalendarEventSchema>;

/**
 * Task Schema (OmniMomentum)
 */
const BaseTaskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  name: z.string().min(1),
  status: z.enum(["todo", "in_progress", "done", "canceled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.coerce.date().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const TaskSchema = BaseTaskSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isCompleted: data.status === "done",
  isOverdue: !!(data.dueDate && data.dueDate < new Date() && data.status !== "done"),
  isDueToday: !!(data.dueDate && data.dueDate.toDateString() === new Date().toDateString()),
  isHighPriority: ["high", "urgent"].includes(data.priority),
  hasSubtasks: false, // Would be computed via join query
}));

export type Task = z.infer<typeof TaskSchema>;

export const CreateTaskSchema = BaseTaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
});

export type CreateTask = z.infer<typeof CreateTaskSchema>;

export const UpdateTaskSchema = BaseTaskSchema.partial().required({ id: true });
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

/**
 * Project Schema (OmniMomentum)
 */
const BaseProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  zoneId: z.number().nullable(),
  name: z.string().min(1),
  status: z.enum(["active", "on_hold", "completed", "archived"]),
  dueDate: z.coerce.date().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const ProjectSchema = BaseProjectSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isActive: data.status === "active",
  isCompleted: data.status === "completed",
  isOverdue: !!(data.dueDate && data.dueDate < new Date() && data.status !== "completed"),
  taskCount: 0, // Would be computed via join query
}));

export type Project = z.infer<typeof ProjectSchema>;

export const CreateProjectSchema = BaseProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;

/**
 * AI Insight Schema
 */
const BaseAiInsightSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  subjectType: z.string(),
  subjectId: z.string().uuid().nullable(),
  kind: z.string(),
  content: z.record(z.string(), z.unknown()),
  model: z.string().nullable(),
  fingerprint: z.string().nullable(),
  createdAt: z.coerce.date(),
});

export const AiInsightSchema = BaseAiInsightSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isRecent: Date.now() - data.createdAt.getTime() < 24 * 60 * 60 * 1000, // within 24 hours
  contentPreview:
    typeof data.content === "object" && data.content !== null
      ? JSON.stringify(data.content).slice(0, 100) + "..."
      : "No content",
}));

export type AiInsight = z.infer<typeof AiInsightSchema>;

/**
 * Inbox Item Schema
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

export const InboxItemSchema = BaseInboxItemSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isProcessed: data.status === "processed",
  wordCount: data.rawText.split(/\s+/).length,
  preview: data.rawText.slice(0, 100) + (data.rawText.length > 100 ? "..." : ""),
}));

export type InboxItem = z.infer<typeof InboxItemSchema>;

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

export const UpdateInboxItemSchema = BaseInboxItemSchema.partial().required({ id: true });
export type UpdateInboxItem = z.infer<typeof UpdateInboxItemSchema>;

// ============================================================================
// UTILITY SCHEMAS FOR API VALIDATION
// ============================================================================

/**
 * Pagination schema for list endpoints
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export type Pagination = z.infer<typeof PaginationSchema>;

/**
 * Contact filters for search/filtering
 */
export const ContactFiltersSchema = z.object({
  search: z.string().optional(),
  stage: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  hasEmail: z.boolean().optional(),
  hasPhone: z.boolean().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type ContactFilters = z.infer<typeof ContactFiltersSchema>;

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

/**
 * Project filters for search/filtering
 */
export const ProjectFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(z.string()).optional(),
  zoneId: z.coerce.number().optional(),
  dueAfter: z.coerce.date().optional(),
  dueBefore: z.coerce.date().optional(),
});

export type ProjectFilters = z.infer<typeof ProjectFiltersSchema>;

// Placeholder schemas for missing types
export const ProcessInboxItemSchema = z.object({
  itemId: z.string().uuid(),
  action: z.enum(["create_task", "archive", "delete"]),
  taskData: z
    .object({
      name: z.string().min(1),
      priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      projectId: z.string().uuid().optional(),
    })
    .optional(),
});

export type ProcessInboxItem = z.infer<typeof ProcessInboxItemSchema>;

export const VoiceInboxCaptureDTOSchema = z.object({
  audioData: z.string(), // Base64 encoded audio
  transcription: z.string().optional(),
  duration: z.number().positive().optional(),
});

export type VoiceInboxCaptureDTO = z.infer<typeof VoiceInboxCaptureDTOSchema>;

export const BulkProcessInboxDTOSchema = z.object({
  itemIds: z.array(z.string().uuid()),
  action: z.enum(["archive", "delete", "process"]),
});

export type BulkProcessInboxDTO = z.infer<typeof BulkProcessInboxDTOSchema>;

export const GmailIngestionResultDTOSchema = z.object({
  success: z.boolean(),
  processed: z.number(),
  errors: z.array(z.string()),
  duration: z.number(),
});

export type GmailIngestionResultDTO = z.infer<typeof GmailIngestionResultDTOSchema>;

// ============================================================================
// USER SYNC PREFERENCES SCHEMAS
// ============================================================================

/**
 * User Sync Preferences Update Schema
 */
export const UserSyncPrefsUpdateSchema = z.object({
  gmailQuery: z.string().optional(),
  gmailLabelIncludes: z.array(z.string()).optional(),
  gmailLabelExcludes: z.array(z.string()).optional(),
  gmailTimeRangeDays: z.number().int().min(1).max(365).optional(),
  calendarIds: z.array(z.string()).optional(),
  calendarIncludeOrganizerSelf: z.boolean().optional(),
  calendarIncludePrivate: z.boolean().optional(),
  calendarTimeWindowDays: z.number().int().min(1).max(730).optional(),
  calendarFutureDays: z.number().int().min(1).max(730).optional(),
  driveIngestionMode: z.enum(["none", "picker", "folders"]).optional(),
  driveFolderIds: z.array(z.string()).optional(),
  driveMaxSizeMB: z.number().int().min(1).max(100).optional(),
  initialSyncCompleted: z.boolean().optional(),
  initialSyncDate: z.string().optional(),
});

export type UserSyncPrefsUpdate = z.infer<typeof UserSyncPrefsUpdateSchema>;

// ============================================================================
// CALENDAR-SPECIFIC SCHEMAS
// ============================================================================

/**
 * Calendar OAuth Query Schema
 */
export const CalendarOAuthQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export type CalendarOAuthQuery = z.infer<typeof CalendarOAuthQuerySchema>;

/**
 * Calendar Sync Request Schema
 */
export const CalendarSyncRequestSchema = z.object({
  daysPast: z.number().int().min(1).max(730).optional().default(180),
  daysFuture: z.number().int().min(1).max(730).optional().default(365),
  maxResults: z.number().int().min(10).max(2500).optional().default(2500),
});

export type CalendarSyncRequest = z.infer<typeof CalendarSyncRequestSchema>;

/**
 * Calendar Sync Response Schema
 */
export const CalendarSyncResponseSchema = z.object({
  ok: z.boolean(),
  data: z
    .object({
      message: z.string(),
      stats: z.object({
        syncedEvents: z.number(),
        processedJobs: z.number().optional(),
        daysPast: z.number(),
        daysFuture: z.number(),
        maxResults: z.number(),
        batchId: z.string().optional(),
      }),
    })
    .optional(),
  error: z.string().optional(),
});

export type CalendarSyncResponse = z.infer<typeof CalendarSyncResponseSchema>;

/**
 * Calendar Sync Blocking Request Schema
 */
export const CalendarSyncBlockingRequestSchema = z.object({
  preferences: z
    .object({
      calendarIds: z.array(z.string()).optional(),
      calendarIncludeOrganizerSelf: z.boolean().optional(),
      calendarIncludePrivate: z.boolean().optional(),
      calendarTimeWindowDays: z.number().int().min(1).max(730).optional(),
      calendarFutureDays: z.number().int().min(1).max(730).optional(),
    })
    .optional(),
  daysPast: z.number().int().min(1).max(730).optional(),
  daysFuture: z.number().int().min(1).max(730).optional(),
  maxResults: z.number().int().min(10).max(2500).optional().default(2500),
});

export type CalendarSyncBlockingRequest = z.infer<typeof CalendarSyncBlockingRequestSchema>;

/**
 * Calendar Import Request Schema
 */
export const CalendarImportRequestSchema = z.object({
  calendarIds: z.array(z.string().min(1)).optional(),
  daysPast: z.number().int().min(0).max(365).optional(),
  daysFuture: z.number().int().min(0).max(365).optional(),
});

export type CalendarImportRequest = z.infer<typeof CalendarImportRequestSchema>;

/**
 * Google Status Response Schema
 */
export const GoogleStatusResponseSchema = z.object({
  services: z.object({
    gmail: z.object({
      isConnected: z.boolean(),
      lastSyncTime: z.string().nullable(),
      totalEvents: z.number(),
      recentErrorCount: z.number(),
    }),
    calendar: z.object({
      isConnected: z.boolean(),
      lastSyncTime: z.string().nullable(),
      totalEvents: z.number(),
      recentErrorCount: z.number(),
    }),
  }),
  overall: z.object({
    hasAnyConnection: z.boolean(),
    pendingJobs: z.number(),
    lastActivity: z.string().nullable(),
  }),
});

export type GoogleStatusResponse = z.infer<typeof GoogleStatusResponseSchema>;

// ============================================================================
// JOB PROCESSING SCHEMAS
// ============================================================================

/**
 * Job Status Query Schema
 */
export const JobStatusQuerySchema = z.object({
  includeHistory: z.coerce.boolean().optional().default(false),
  includeFreshness: z.coerce.boolean().optional().default(true),
  batchId: z.string().optional(),
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

/**
 * Manual Job Processing Request Schema
 */
export const ProcessManualSchema = z.object({
  jobTypes: z
    .array(z.enum(["normalize", "embed", "insight", "sync_gmail", "sync_calendar"]))
    .optional(),
  batchId: z.string().optional(),
  maxJobs: z.number().int().min(1).max(100).optional().default(25),
  includeRetrying: z.boolean().optional().default(true),
  skipStuckJobs: z.boolean().optional().default(false),
  realTimeUpdates: z.boolean().optional().default(true),
});

export type ProcessManualRequest = z.infer<typeof ProcessManualSchema>;

/**
 * Job Processing Result Schema
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
 * Calendar Events Job Creation Result Schema
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
 * Raw Events Job Creation Result Schema
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

/**
 * Sync Progress Query Schema
 */
export const SyncProgressQuerySchema = z.object({
  sessionId: z.string().uuid(),
});

export type SyncProgressQuery = z.infer<typeof SyncProgressQuerySchema>;

/**
 * Sync Progress Response Schema
 */
export const SyncProgressResponseSchema = z.object({
  sessionId: z.string().uuid(),
  service: z.string(),
  status: z.string(),
  progress: z.object({
    percentage: z.number(),
    currentStep: z.string(),
    totalItems: z.number(),
    importedItems: z.number(),
    processedItems: z.number(),
    failedItems: z.number(),
  }),
  timeEstimate: z
    .object({
      remainingSeconds: z.number(),
      eta: z.string().optional(),
    })
    .optional(),
  timestamps: z.object({
    startedAt: z.string(),
    completedAt: z.string().optional(),
    lastUpdate: z.string(),
  }),
  errorDetails: z.record(z.string(), z.unknown()).nullable(),
  preferences: z.record(z.string(), z.unknown()),
});

export type SyncProgressResponse = z.infer<typeof SyncProgressResponseSchema>;

/**
 * Sync Cancel Response Schema
 */
export const SyncCancelResponseSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string(),
  status: z.string(),
});

export type SyncCancelResponse = z.infer<typeof SyncCancelResponseSchema>;

// ============================================================================
// DATABASE TYPE COMPATIBILITY
// ============================================================================

/**
 * Type utilities for database operations
 */
export type DbContact = Database["public"]["Tables"]["contacts"]["Row"];
export type DbNote = Database["public"]["Tables"]["notes"]["Row"];
export type DbInteraction = Database["public"]["Tables"]["interactions"]["Row"];
export type DbCalendarEvent = Database["public"]["Tables"]["calendar_events"]["Row"];
export type DbTask = Database["public"]["Tables"]["tasks"]["Row"];
export type DbProject = Database["public"]["Tables"]["projects"]["Row"];

/**
 * Insert types for database operations
 */
export type InsertContact = Database["public"]["Tables"]["contacts"]["Insert"];
export type InsertNote = Database["public"]["Tables"]["notes"]["Insert"];
export type InsertInteraction = Database["public"]["Tables"]["interactions"]["Insert"];
export type InsertCalendarEvent = Database["public"]["Tables"]["calendar_events"]["Insert"];
export type InsertTask = Database["public"]["Tables"]["tasks"]["Insert"];
export type InsertProject = Database["public"]["Tables"]["projects"]["Insert"];
