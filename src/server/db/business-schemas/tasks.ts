/**
 * Task Schema for OmniMomentum
 *
 * Properly derived from database schema with business logic transforms
 */

import { z } from "zod";
import { tasks } from "@/server/db/schema";

// Derive base types from Drizzle schema
type DbTask = typeof tasks.$inferSelect;

/**
 * Base Task Schema (derived from database schema)
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
}) satisfies z.ZodType<DbTask>;

/**
 * Task Schema (with transform)
 */
export const TaskSchema = BaseTaskSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isCompleted: data.status === "done",
  isOverdue: data.dueDate ? data.dueDate < new Date() && data.status !== "done" : false,
  isDueToday: data.dueDate ? data.dueDate.toDateString() === new Date().toDateString() : false,
  isHighPriority: ["high", "urgent"].includes(data.priority),
  hasSubtasks: false, // Would be computed via join query
}));

export type Task = z.infer<typeof TaskSchema>;

/**
 * Task creation schema (omits generated fields)
 */
export const CreateTaskSchema = BaseTaskSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
}).extend({
  taggedContactIds: z.array(z.string().uuid()).optional(),
});

export type CreateTask = z.infer<typeof CreateTaskSchema>;

/**
 * Task update schema (all fields optional except id)
 */
export const UpdateTaskSchema = BaseTaskSchema.partial()
  .required({ id: true })
  .extend({
    taggedContactIds: z.array(z.string().uuid()).optional(),
  });
export type UpdateTask = z.infer<typeof UpdateTaskSchema>;

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
