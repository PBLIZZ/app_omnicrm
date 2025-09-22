/**
 * OmniMomentum DTOs and Validation Schemas
 *
 * Complete task and project management system for wellness practitioners
 * including projects (pathways), tasks (hierarchical), and goals.
 */

import { z } from "zod";

// ENUMs that match database constraints
export const ProjectStatusSchema = z.enum(["active", "on_hold", "completed", "archived"]);
export const TaskStatusSchema = z.enum(["todo", "in_progress", "done", "canceled"]);
export const TaskPrioritySchema = z.enum(["low", "medium", "high", "urgent"]);
export const GoalTypeSchema = z.enum([
  "practitioner_business",
  "practitioner_personal",
  "client_wellness",
]);
export const GoalStatusSchema = z.enum(["on_track", "at_risk", "achieved", "abandoned"]);

// Project DTOs (Pathways)
export const ProjectDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  zoneId: z.number().nullable(),
  name: z.string().min(1, "Project name is required"),
  status: ProjectStatusSchema,
  dueDate: z.date().nullable(),
  details: z.record(z.unknown()).default({}), // JSONB metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateProjectDTOSchema = z.object({
  name: z.string().min(1, "Project name is required").max(200, "Project name too long"),
  zoneId: z.number().optional(),
  status: ProjectStatusSchema.optional(),
  dueDate: z.date().optional(),
  details: z
    .object({
      description: z.string().optional(),
      icon: z.string().optional(),
      color: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export const UpdateProjectDTOSchema = CreateProjectDTOSchema.partial();

// Task DTOs (Hierarchical structure)
export const TaskDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  projectId: z.string().uuid().nullable(),
  parentTaskId: z.string().uuid().nullable(),
  name: z.string().min(1, "Task name is required"),
  status: TaskStatusSchema,
  priority: TaskPrioritySchema,
  dueDate: z.date().nullable(),
  details: z.record(z.unknown()).default({}), // JSONB metadata
  completedAt: z.date().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateTaskDTOSchema = z.object({
  name: z.string().min(1, "Task name is required").max(300, "Task name too long"),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  status: TaskStatusSchema.optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.date().optional(),
  details: z
    .object({
      description: z.string().optional(),
      steps: z.array(z.string()).optional(),
      blockers: z.array(z.string()).optional(),
      estimatedMinutes: z.number().optional(),
      notes: z.string().optional(),
    })
    .optional(),
  taggedContactIds: z.array(z.string().uuid()).optional(),
});

export const UpdateTaskDTOSchema = CreateTaskDTOSchema.partial().extend({
  completedAt: z.date().nullable().optional(),
});

// Task with relationships - for full task display
export const TaskWithRelationsDTOSchema = TaskDTOSchema.extend({
  project: ProjectDTOSchema.nullable(),
  parentTask: TaskDTOSchema.nullable(),
  subtasks: z.array(TaskDTOSchema),
  taggedContacts: z.array(
    z.object({
      id: z.string().uuid(),
      displayName: z.string(),
      primaryEmail: z.string().optional(),
    }),
  ),
  zone: z
    .object({
      id: z.number(),
      name: z.string(),
      color: z.string().nullable(),
      iconName: z.string().nullable(),
    })
    .nullable(),
});

// Goal DTOs
export const GoalDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  goalType: GoalTypeSchema,
  name: z.string().min(1, "Goal name is required"),
  status: GoalStatusSchema,
  targetDate: z.date().nullable(),
  details: z.record(z.unknown()).default({}), // JSONB metadata
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const CreateGoalDTOSchema = z.object({
  contactId: z.string().uuid().optional(),
  goalType: GoalTypeSchema,
  name: z.string().min(1, "Goal name is required").max(200, "Goal name too long"),
  status: GoalStatusSchema.optional(),
  targetDate: z.date().optional(),
  details: z
    .object({
      description: z.string().optional(),
      metrics: z
        .array(
          z.object({
            name: z.string(),
            target: z.number(),
            current: z.number().optional(),
            unit: z.string(),
          }),
        )
        .optional(),
      milestones: z
        .array(
          z.object({
            name: z.string(),
            targetDate: z.date(),
            completed: z.boolean().default(false),
          }),
        )
        .optional(),
    })
    .optional(),
});

export const UpdateGoalDTOSchema = CreateGoalDTOSchema.partial();

// Daily Pulse Log DTOs
export const DailyPulseLogDTOSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  logDate: z.date(),
  details: z.record(z.unknown()).default({}), // JSONB metadata
  createdAt: z.date(),
});

export const CreateDailyPulseLogDTOSchema = z.object({
  logDate: z.date().optional(), // Defaults to today
  details: z.object({
    energy: z.number().min(1).max(5),
    sleep: z.number().min(3).max(10), // Hours of sleep
    nap: z.number().min(0).max(120).optional(), // Minutes of nap
    mood: z.string().optional(),
    notes: z.string().optional(),
    customMetrics: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
  }),
});

export const UpdateDailyPulseLogDTOSchema = z.object({
  details: CreateDailyPulseLogDTOSchema.shape.details.partial(),
});

// Filter schemas
export const ProjectFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(ProjectStatusSchema).optional(),
  zoneId: z.number().optional(),
  dueAfter: z.date().optional(),
  dueBefore: z.date().optional(),
});

export const TaskFiltersSchema = z.object({
  search: z.string().optional(),
  status: z.array(TaskStatusSchema).optional(),
  priority: z.array(TaskPrioritySchema).optional(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  taggedContactId: z.string().uuid().optional(),
  dueAfter: z.date().optional(),
  dueBefore: z.date().optional(),
  hasSubtasks: z.boolean().optional(),
});

export const GoalFiltersSchema = z.object({
  search: z.string().optional(),
  goalType: z.array(GoalTypeSchema).optional(),
  status: z.array(GoalStatusSchema).optional(),
  contactId: z.string().uuid().optional(),
  targetAfter: z.date().optional(),
  targetBefore: z.date().optional(),
});

// Quick action DTOs - for common UI operations
export const QuickTaskCreateDTOSchema = z.object({
  name: z.string().min(1, "Task name is required"),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.date().optional(),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
});

export const BulkTaskUpdateDTOSchema = z.object({
  taskIds: z.array(z.string().uuid()).min(1, "Select at least one task"),
  updates: z.object({
    status: TaskStatusSchema.optional(),
    priority: TaskPrioritySchema.optional(),
    projectId: z.string().uuid().optional(),
    dueDate: z.date().optional(),
  }),
});

// Type exports
export type ProjectDTO = z.infer<typeof ProjectDTOSchema>;
export type CreateProjectDTO = z.infer<typeof CreateProjectDTOSchema>;
export type UpdateProjectDTO = z.infer<typeof UpdateProjectDTOSchema>;

export type TaskDTO = z.infer<typeof TaskDTOSchema>;
export type CreateTaskDTO = z.infer<typeof CreateTaskDTOSchema>;
export type UpdateTaskDTO = z.infer<typeof UpdateTaskDTOSchema>;
export type TaskWithRelationsDTO = z.infer<typeof TaskWithRelationsDTOSchema>;

export type GoalDTO = z.infer<typeof GoalDTOSchema>;
export type CreateGoalDTO = z.infer<typeof CreateGoalDTOSchema>;
export type UpdateGoalDTO = z.infer<typeof UpdateGoalDTOSchema>;

export type DailyPulseLogDTO = z.infer<typeof DailyPulseLogDTOSchema>;
export type CreateDailyPulseLogDTO = z.infer<typeof CreateDailyPulseLogDTOSchema>;
export type UpdateDailyPulseLogDTO = z.infer<typeof UpdateDailyPulseLogDTOSchema>;

export type ProjectFilters = z.infer<typeof ProjectFiltersSchema>;
export type TaskFilters = z.infer<typeof TaskFiltersSchema>;
export type GoalFilters = z.infer<typeof GoalFiltersSchema>;

export type QuickTaskCreateDTO = z.infer<typeof QuickTaskCreateDTOSchema>;
export type BulkTaskUpdateDTO = z.infer<typeof BulkTaskUpdateDTOSchema>;

// Status and Priority type exports
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
export type TaskPriority = z.infer<typeof TaskPrioritySchema>;
export type GoalType = z.infer<typeof GoalTypeSchema>;
export type GoalStatus = z.infer<typeof GoalStatusSchema>;
