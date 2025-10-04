/**
 * Task Schema for OmniMomentum
 *
 * For base types, import from @/server/db/schema:
 * - Task (select type)
 * - CreateTask (insert type)
 * - UpdateTask (partial insert type)
 *
 * This file contains ONLY UI-enhanced versions and API-specific schemas.
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { tasks, type Task } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type { Task, CreateTask, UpdateTask } from "@/server/db/schema";

// Create base schema from drizzle table for UI enhancements
const selectTaskSchema = createSelectSchema(tasks);

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
}) satisfies z.ZodType<Task & {
  isCompleted: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  isHighPriority: boolean;
  hasSubtasks: boolean;
}>;

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
