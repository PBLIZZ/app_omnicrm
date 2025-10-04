/**
 * Zones Schemas
 *
 * Type definitions and validation schemas for wellness zone categories.
 * Zones are shared categories that all users can access for organizing tasks and projects.
 */

import { z } from "zod";
import { type Zone as DbZone, type CreateZone as DbCreateZone } from "@/server/db/schema";

// ============================================================================
// CORE ZONE SCHEMAS
// ============================================================================

/**
 * Base Zone Schema (derived from database schema)
 */
const BaseZoneSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  color: z.string().nullable(),
  iconName: z.string().nullable(),
}) satisfies z.ZodType<DbZone>;

/**
 * Zone Schema (with transform)
 */
export const ZoneSchema = BaseZoneSchema.transform((data) => ({
  ...data,
  // Rename iconName to icon for UI consistency
  icon: data.iconName,
  // UI computed fields
  displayName: data.name,
  hasIcon: !!data.iconName,
  hasColor: !!data.color,
}));

export type Zone = z.infer<typeof ZoneSchema>;

/**
 * Base Zone with Statistics Schema (without transform)
 */
const BaseZoneWithStatsSchema = BaseZoneSchema.extend({
  stats: z.object({
    activeProjects: z.number().int().min(0),
    completedProjects: z.number().int().min(0),
    activeTasks: z.number().int().min(0),
    completedTasks: z.number().int().min(0),
    totalItems: z.number().int().min(0),
    lastActivity: z.coerce.date().nullable(),
  }),
});

/**
 * Zone with Statistics Schema (with transform)
 */
export const ZoneWithStatsSchema = BaseZoneWithStatsSchema.transform((data) => ({
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
  items: z.array(ZoneSchema),
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
// ADMIN SCHEMAS (for zone management)
// ============================================================================

/**
 * Create Zone Schema (admin only)
 */
export const CreateZoneSchema = BaseZoneSchema.omit({
  id: true,
}) satisfies z.ZodType<DbCreateZone>;

export type CreateZone = z.infer<typeof CreateZoneSchema>;

/**
 * Update Zone Schema (admin only)
 */
export const UpdateZoneSchema = CreateZoneSchema.partial();

// Zone categories removed as they don't exist in the database

// All schemas and types are already exported above
