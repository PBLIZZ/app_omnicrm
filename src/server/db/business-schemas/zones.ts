/**
 * Zones Schemas
 *
 * For base types, import from @/server/db/schema:
 * - Zone (select type)
 * - CreateZone (insert type)
 * - UpdateZone (partial insert type)
 *
 * This file contains ONLY UI-enhanced versions and API-specific schemas.
 */

import { z } from "zod";
import { createSelectSchema } from "drizzle-zod";
import { zones, type Zone } from "@/server/db/schema";

// Re-export base types from schema for convenience
export type { Zone, CreateZone, UpdateZone } from "@/server/db/schema";

// Create base schema from drizzle table for UI enhancements
const selectZoneSchema = createSelectSchema(zones);

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
})) satisfies z.ZodType<Zone & {
  icon: string | null;
  displayName: string;
  hasIcon: boolean;
  hasColor: boolean;
}>;

export type ZoneWithUI = z.infer<typeof ZoneWithUISchema>;

/**
 * Zone with Statistics Schema (with transform)
 * Extends base Zone with statistics and additional computed fields
 */
export const ZoneWithStatsSchema = selectZoneSchema.extend({
  stats: z.object({
    activeProjects: z.number().int().min(0),
    completedProjects: z.number().int().min(0),
    activeTasks: z.number().int().min(0),
    completedTasks: z.number().int().min(0),
    totalItems: z.number().int().min(0),
    lastActivity: z.coerce.date().nullable(),
  }),
}).transform((data) => ({
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
// QUERY SCHEMAS
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
// RESPONSE SCHEMAS
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

// All schemas and types are already exported above
