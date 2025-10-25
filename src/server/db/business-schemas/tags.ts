/**
 * Tags API Business Schemas
 *
 * For base types, import from @/server/db/schema:
 * - Tag (select type)
 * - CreateTag (insert type)
 * - UpdateTag (partial insert type)
 *
 * Generated from Drizzle schema using drizzle-zod.
 *
 * This file contains ONLY API-specific schemas and business logic validations.
 */

import { z } from "zod";
import { PaginationQuerySchema } from "@/lib/validation/common";

// Re-export base types from schema for convenience
export type {
  Tag,
  CreateTag,
  UpdateTag,
  ContactTag,
  CreateContactTag,
  TaskTag,
  CreateTaskTag,
  NoteTag,
  CreateNoteTag,
  GoalTag,
  CreateGoalTag,
} from "@/server/db/schema";

// Create Zod schemas from Drizzle table for API validation
export const TagSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid().nullable(),
  name: z.string(),
  category: z.enum(["services_modalities", "client_demographics", "schedule_attendance", "health_wellness", "marketing_engagement", "emotional_mental"]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  isSystem: z.boolean(),
  usageCount: z.number().int().min(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// ============================================================================
// API REQUEST SCHEMAS
// ============================================================================

/**
 * POST /api/tags - Request body
 */
export const CreateTagBodySchema = z.object({
  name: z.string().min(1).max(100),
  category: z.enum(["services_modalities", "client_demographics", "schedule_attendance", "health_wellness", "marketing_engagement", "emotional_mental"]).default("services_modalities"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .default("#a78bfa"),
});

export type CreateTagBody = z.infer<typeof CreateTagBodySchema>;

/**
 * PATCH /api/tags/[id] - Request body
 */
export const UpdateTagBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    category: z.enum(["services_modalities", "client_demographics", "schedule_attendance", "health_wellness", "marketing_engagement", "emotional_mental"]).optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .optional(),
  })
  .partial();

export type UpdateTagBody = z.infer<typeof UpdateTagBodySchema>;

/**
 * GET /api/tags - Query parameters
 */
export const GetTagsQuerySchema = PaginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
  sort: z.enum(["name", "usageCount", "createdAt", "updatedAt"]).default("name"),
  search: z.string().optional(),
  category: z.enum(["services_modalities", "client_demographics", "schedule_attendance", "health_wellness", "marketing_engagement", "emotional_mental"]).optional(),
});

export type GetTagsQuery = z.infer<typeof GetTagsQuerySchema>;

// ============================================================================
// TAG APPLICATION SCHEMAS
// ============================================================================

/**
 * POST /api/tags/apply - Apply tags to entities
 */
export const ApplyTagsBodySchema = z.object({
  entityType: z.enum(["contact", "task", "note", "goal"]),
  entityId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).min(1).max(50),
});

export type ApplyTagsBody = z.infer<typeof ApplyTagsBodySchema>;

/**
 * DELETE /api/tags/remove - Remove tags from entities
 */
export const RemoveTagsBodySchema = z.object({
  entityType: z.enum(["contact", "task", "note", "goal"]),
  entityId: z.string().uuid(),
  tagIds: z.array(z.string().uuid()).min(1).max(50),
});

export type RemoveTagsBody = z.infer<typeof RemoveTagsBodySchema>;

// ============================================================================
// API RESPONSE SCHEMAS
// ============================================================================

/**
 * GET /api/tags - List response
 */
export const TagListResponseSchema = z.object({
  items: z.array(TagSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type TagListResponse = z.infer<typeof TagListResponseSchema>;

export const TagResponseSchema = z.object({
  item: TagSchema,
});

export const DeleteTagResponseSchema = z.object({
  deleted: z.number(),
});

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk Delete Body Schema
 */
export const BulkDeleteTagsBodySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

export type BulkDeleteTagsBody = z.infer<typeof BulkDeleteTagsBodySchema>;

export const BulkDeleteTagsResponseSchema = z.object({
  deleted: z.number(),
  errors: z.array(z.object({ id: z.string(), error: z.string() })),
});

export type BulkDeleteTagsResponse = z.infer<typeof BulkDeleteTagsResponseSchema>;

// ============================================================================
// TAG USAGE STATISTICS
// ============================================================================

export const TagUsageStatsSchema = z.object({
  tagId: z.string().uuid(),
  usageCount: z.number().int().min(0),
  entityType: z.string(),
});

export type TagUsageStats = z.infer<typeof TagUsageStatsSchema>;

export const TagUsageStatsResponseSchema = z.object({
  stats: z.array(TagUsageStatsSchema),
});

export type TagUsageStatsResponse = z.infer<typeof TagUsageStatsResponseSchema>;

// ============================================================================
// ENTITY WITH TAGS SCHEMAS
// ============================================================================

/**
 * Contact with tags
 */
export const ContactWithTagsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  displayName: z.string(),
  primaryEmail: z.string().nullable(),
  primaryPhone: z.string().nullable(),
  photoUrl: z.string().nullable(),
  source: z.string().nullable(),
  lifecycleStage: z.string().nullable(),
  clientStatus: z.string().nullable(),
  referralSource: z.string().nullable(),
  confidenceScore: z.string().nullable(),
  dateOfBirth: z.string().nullable(),
  emergencyContactName: z.string().nullable(),
  emergencyContactPhone: z.string().nullable(),
  address: z.unknown(),
  healthContext: z.unknown(),
  preferences: z.unknown(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  tags: z.array(TagSchema),
});

export type ContactWithTags = z.infer<typeof ContactWithTagsSchema>;

/**
 * Task with tags
 */
export const TaskWithTagsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  name: z.string(),
  status: z.enum(["todo", "in_progress", "done", "canceled"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  dueDate: z.string().nullable(),
  details: z.unknown(),
  completedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  tags: z.array(TagSchema),
});

export type TaskWithTags = z.infer<typeof TaskWithTagsSchema>;

/**
 * Note with tags
 */
export const NoteWithTagsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  contentRich: z.unknown(),
  contentPlain: z.string(),
  piiEntities: z.unknown(),
  sourceType: z.enum(["typed", "voice", "upload"]),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  tags: z.array(TagSchema),
});

export type NoteWithTags = z.infer<typeof NoteWithTagsSchema>;

/**
 * Goal with tags
 */
export const GoalWithTagsSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  name: z.string(),
  goalType: z.enum(["practitioner_business", "practitioner_personal", "client_wellness"]),
  status: z.enum(["on_track", "at_risk", "achieved", "abandoned"]),
  targetDate: z.string().nullable(),
  details: z.unknown(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  tags: z.array(TagSchema),
});

export type GoalWithTags = z.infer<typeof GoalWithTagsSchema>;

