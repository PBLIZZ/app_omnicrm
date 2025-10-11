/**
 * Project Schema for OmniMomentum
 *
 * Extracted from business-schema.ts for better organization
 */

import { z } from "zod";

/**
 * Base Project Schema (without transform)
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

/**
 * Project Schema (with transform)
 */
export const ProjectSchema = BaseProjectSchema.transform((data) => ({
  ...data,
  // UI computed fields
  isActive: data.status === "active",
  isCompleted: data.status === "completed",
  isOverdue: data.dueDate ? data.dueDate < new Date() && data.status !== "completed" : false,
  taskCount: 0, // Would be computed via join query
}));

export type Project = z.infer<typeof ProjectSchema>;

/**
 * Project creation schema (omits generated fields)
 */
export const CreateProjectSchema = BaseProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateProject = z.infer<typeof CreateProjectSchema>;

/**
 * Project update schema (all fields optional except id)
 */
export const UpdateProjectSchema = BaseProjectSchema.partial().required({ id: true });
export type UpdateProject = z.infer<typeof UpdateProjectSchema>;

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
