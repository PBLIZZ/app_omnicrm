/**
 * Project Schema for OmniMomentum
 *
 * For base types, import from @/server/db/schema:
 * - Project (select type)
 * - CreateProject (insert type)
 * - UpdateProject (partial insert type)
 *
 * This file contains ONLY UI-enhanced versions and API-specific schemas.
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { projects, type Project } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type { Project, CreateProject, UpdateProject } from "@/server/db/schema";

// Create base schema from drizzle table for UI enhancements
const selectProjectSchema = createSelectSchema(projects);

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
}) satisfies z.ZodType<Project & {
  dueDate: Date | null;
  isActive: boolean;
  isCompleted: boolean;
  isOverdue: boolean;
  taskCount: number;
}>;

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
