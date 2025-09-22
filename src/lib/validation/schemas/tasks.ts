// ============================================================================
// OMNI-MOMENTUM TASKS DTO SCHEMAS - Aligned with database schema
// ============================================================================

import { z } from "zod";

// Enum schemas for type safety - aligned with Drizzle pgEnum definitions
export const TaskStatusEnum = z.enum(["todo", "in_progress", "done", "canceled"]);
export const TaskPriorityEnum = z.enum(["low", "medium", "high", "urgent"]);
export const ProjectStatusEnum = z.enum(["active", "on_hold", "completed", "archived"]);
export const InboxItemStatusEnum = z.enum(["unprocessed", "processed", "archived"]);
export const GoalTypeEnum = z.enum(["practitioner_business", "practitioner_personal", "client_wellness"]);
export const GoalStatusEnum = z.enum(["on_track", "at_risk", "achieved", "abandoned"]);

// ============================================================================
// TASKS SCHEMAS
// ============================================================================

// Full task schema (mirrors tasks table structure exactly)
export const TaskSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(), // For subtasks
  name: z.string(),
  status: TaskStatusEnum,
  priority: TaskPriorityEnum,
  dueDate: z.string().datetime().nullable(), // timestamp with timezone
  details: z.record(z.unknown()).nullable(), // JSONB object field
  completedAt: z.string().datetime().nullable(), // timestamp with timezone
  createdAt: z.string().datetime(), // timestamp with timezone
  updatedAt: z.string().datetime(), // timestamp with timezone
});

// Schema for creating new tasks
export const CreateTaskSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Task name is required").max(500, "Task name too long"),
  status: TaskStatusEnum.default("todo"),
  priority: TaskPriorityEnum.default("medium"),
  dueDate: z.string().datetime().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
});

// Schema for updating existing tasks
export const UpdateTaskSchema = z.object({
  projectId: z.string().uuid().nullable().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  name: z.string().min(1, "Task name is required").max(500, "Task name too long").optional(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
  completedAt: z.string().datetime().nullable().optional(),
});

// Schema for task queries/filters
export const TaskQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  status: TaskStatusEnum.optional(),
  priority: TaskPriorityEnum.optional(),
  search: z.string().optional(), // Search in name and details
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// PROJECTS SCHEMAS
// ============================================================================

// Full project schema (mirrors projects table structure exactly)
export const ProjectSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  zoneId: z.number().int().nullable(),
  name: z.string(),
  status: ProjectStatusEnum,
  dueDate: z.string().datetime().nullable(), // timestamp with timezone
  details: z.record(z.unknown()).nullable(), // JSONB object field
  createdAt: z.string().datetime(), // timestamp with timezone
  updatedAt: z.string().datetime(), // timestamp with timezone
});

// Schema for creating new projects
export const CreateProjectSchema = z.object({
  zoneId: z.number().int().nullable().optional(),
  name: z.string().min(1, "Project name is required").max(500, "Project name too long"),
  status: ProjectStatusEnum.default("active"),
  dueDate: z.string().datetime().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
});

// Schema for updating existing projects
export const UpdateProjectSchema = z.object({
  zoneId: z.number().int().nullable().optional(),
  name: z.string().min(1, "Project name is required").max(500, "Project name too long").optional(),
  status: ProjectStatusEnum.optional(),
  dueDate: z.string().datetime().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
});

// ============================================================================
// INBOX ITEMS SCHEMAS
// ============================================================================

// Full inbox item schema (mirrors inbox_items table structure exactly)
export const InboxItemSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  rawText: z.string(),
  status: InboxItemStatusEnum,
  createdTaskId: z.string().uuid().nullable(),
  processedAt: z.string().datetime().nullable(), // timestamp with timezone
  createdAt: z.string().datetime(), // timestamp with timezone
  updatedAt: z.string().datetime(), // timestamp with timezone
});

// Schema for creating new inbox items
export const CreateInboxItemSchema = z.object({
  rawText: z.string().min(1, "Raw text is required").max(5000, "Raw text too long"),
});

// Schema for updating existing inbox items
export const UpdateInboxItemSchema = z.object({
  status: InboxItemStatusEnum.optional(),
  createdTaskId: z.string().uuid().nullable().optional(),
  processedAt: z.string().datetime().nullable().optional(),
});

// ============================================================================
// GOALS SCHEMAS
// ============================================================================

// Full goal schema (mirrors goals table structure exactly)
export const GoalSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(), // Null for practitioner goals
  goalType: GoalTypeEnum,
  name: z.string(),
  status: GoalStatusEnum,
  targetDate: z.string().datetime().nullable(), // timestamp with timezone
  details: z.record(z.unknown()).nullable(), // JSONB object field
  createdAt: z.string().datetime(), // timestamp with timezone
  updatedAt: z.string().datetime(), // timestamp with timezone
});

// Schema for creating new goals
export const CreateGoalSchema = z.object({
  contactId: z.string().uuid().nullable().optional(), // Optional for practitioner goals
  goalType: GoalTypeEnum,
  name: z.string().min(1, "Goal name is required").max(500, "Goal name too long"),
  status: GoalStatusEnum.default("on_track"),
  targetDate: z.string().datetime().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
});

// Schema for updating existing goals
export const UpdateGoalSchema = z.object({
  contactId: z.string().uuid().nullable().optional(),
  goalType: GoalTypeEnum.optional(),
  name: z.string().min(1, "Goal name is required").max(500, "Goal name too long").optional(),
  status: GoalStatusEnum.optional(),
  targetDate: z.string().datetime().nullable().optional(),
  details: z.record(z.unknown()).nullable().optional(),
});

// ============================================================================
// ZONES SCHEMAS
// ============================================================================

// Full zone schema (mirrors zones table structure exactly)
export const ZoneSchema = z.object({
  id: z.number().int(), // serial primary key
  name: z.string(),
  color: z.string().nullable(),
  iconName: z.string().nullable(),
});

// Schema for creating new zones
export const CreateZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required").max(100, "Zone name too long"),
  color: z.string().nullable().optional(),
  iconName: z.string().nullable().optional(),
});

// Schema for updating existing zones
export const UpdateZoneSchema = z.object({
  name: z.string().min(1, "Zone name is required").max(100, "Zone name too long").optional(),
  color: z.string().nullable().optional(),
  iconName: z.string().nullable().optional(),
});

// ============================================================================
// DAILY PULSE LOGS SCHEMAS
// ============================================================================

// Full daily pulse log schema (mirrors daily_pulse_logs table structure exactly)
export const DailyPulseLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"), // Date string YYYY-MM-DD
  details: z.record(z.unknown()).nullable(), // JSONB object field
  createdAt: z.string().datetime(), // timestamp with timezone
});

// Schema for creating new daily pulse logs
export const CreateDailyPulseLogSchema = z.object({
  logDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  details: z.record(z.unknown()).nullable().optional(),
});

// Schema for updating existing daily pulse logs
export const UpdateDailyPulseLogSchema = z.object({
  details: z.record(z.unknown()).nullable().optional(),
});

// ============================================================================
// TASK CONTACT TAGS SCHEMAS
// ============================================================================

// Full task contact tag schema (mirrors task_contact_tags table structure)
export const TaskContactTagSchema = z.object({
  taskId: z.string().uuid(),
  contactId: z.string().uuid(),
});

// Schema for creating new task contact tags
export const CreateTaskContactTagSchema = z.object({
  taskId: z.string().uuid(),
  contactId: z.string().uuid(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Task = z.infer<typeof TaskSchema>;
export type CreateTask = z.infer<typeof CreateTaskSchema>;
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;
export type TaskQuery = z.infer<typeof TaskQuerySchema>;

export type Project = z.infer<typeof ProjectSchema>;
export type CreateProject = z.infer<typeof CreateProjectSchema>;
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

export type InboxItem = z.infer<typeof InboxItemSchema>;
export type CreateInboxItem = z.infer<typeof CreateInboxItemSchema>;
export type UpdateInboxItem = z.infer<typeof UpdateInboxItemSchema>;

export type Goal = z.infer<typeof GoalSchema>;
export type CreateGoal = z.infer<typeof CreateGoalSchema>;
export type UpdateGoal = z.infer<typeof UpdateGoalSchema>;

export type Zone = z.infer<typeof ZoneSchema>;
export type CreateZone = z.infer<typeof CreateZoneSchema>;
export type UpdateZone = z.infer<typeof UpdateZoneSchema>;

export type DailyPulseLog = z.infer<typeof DailyPulseLogSchema>;
export type CreateDailyPulseLog = z.infer<typeof CreateDailyPulseLogSchema>;
export type UpdateDailyPulseLog = z.infer<typeof UpdateDailyPulseLogSchema>;

export type TaskContactTag = z.infer<typeof TaskContactTagSchema>;
export type CreateTaskContactTag = z.infer<typeof CreateTaskContactTagSchema>;

// Type aliases for enum values
export type TaskStatus = z.infer<typeof TaskStatusEnum>;
export type TaskPriority = z.infer<typeof TaskPriorityEnum>;
export type ProjectStatus = z.infer<typeof ProjectStatusEnum>;
export type InboxItemStatus = z.infer<typeof InboxItemStatusEnum>;
export type GoalType = z.infer<typeof GoalTypeEnum>;
export type GoalStatus = z.infer<typeof GoalStatusEnum>;