/**
 * Zones Schemas
 *
 * Type definitions and validation schemas for wellness zone categories.
 * Zones are shared categories that all users can access for organizing tasks and projects.
 */

import { z } from "zod";

// ============================================================================
// CORE ZONE SCHEMAS
// ============================================================================

/**
 * Zone Schema
 */
export const ZoneSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  category: z.string().nullable(),
  isActive: z.boolean(),
  sortOrder: z.number().int().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
}).transform((data) => ({
  ...data,
  // UI computed fields
  displayName: data.name,
  hasDescription: !!data.description,
  hasIcon: !!data.icon,
  hasColor: !!data.color,
  isWellnessZone: data.category === 'wellness',
  isBusinessZone: data.category === 'business',
  isPersonalZone: data.category === 'personal',
}));

export type Zone = z.infer<typeof ZoneSchema>;

/**
 * Zone with Statistics Schema
 */
export const ZoneWithStatsSchema = ZoneSchema.extend({
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
  // Additional UI computed fields for stats
  hasActiveWork: data.stats.activeProjects > 0 || data.stats.activeTasks > 0,
  hasCompletedWork: data.stats.completedProjects > 0 || data.stats.completedTasks > 0,
  hasRecentActivity: data.stats.lastActivity ?
    (Date.now() - data.stats.lastActivity.getTime()) < (7 * 24 * 60 * 60 * 1000) : false, // within 7 days
  workloadLevel: (() => {
    const total = data.stats.activeProjects + data.stats.activeTasks;
    if (total === 0) return 'none';
    if (total <= 3) return 'light';
    if (total <= 8) return 'moderate';
    return 'heavy';
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
  category: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  includeInactive: z
    .string()
    .optional()
    .transform((val) => val === "true"),
});

export type ZonesQuery = z.infer<typeof ZonesQuerySchema>;

/**
 * Zone Filters Schema
 */
export const ZoneFiltersSchema = z.object({
  category: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  hasProjects: z.boolean().optional(),
  hasTasks: z.boolean().optional(),
  lastActivityAfter: z.coerce.date().optional(),
  lastActivityBefore: z.coerce.date().optional(),
});

export type ZoneFilters = z.infer<typeof ZoneFiltersSchema>;

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
  recentProjects: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.string(),
    updatedAt: z.coerce.date(),
  })).optional(),
  recentTasks: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    status: z.string(),
    priority: z.string(),
    updatedAt: z.coerce.date(),
  })).optional(),
});

export type ZoneDetailsResponse = z.infer<typeof ZoneDetailsResponseSchema>;

// ============================================================================
// ADMIN SCHEMAS (for zone management)
// ============================================================================

/**
 * Create Zone Schema (admin only)
 */
export const CreateZoneSchema = ZoneSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  displayName: true,
  hasDescription: true,
  hasIcon: true,
  hasColor: true,
  isWellnessZone: true,
  isBusinessZone: true,
  isPersonalZone: true,
});

export type CreateZone = z.infer<typeof CreateZoneSchema>;

/**
 * Update Zone Schema (admin only)
 */
export const UpdateZoneSchema = CreateZoneSchema.partial();
export type UpdateZone = z.infer<typeof UpdateZoneSchema>;

// ============================================================================
// ZONE CATEGORIES
// ============================================================================

/**
 * Predefined zone categories for wellness businesses
 */
export const ZoneCategorySchema = z.enum([
  'wellness',
  'business',
  'personal',
  'clinical',
  'marketing',
  'education',
  'community',
]);

export type ZoneCategory = z.infer<typeof ZoneCategorySchema>;

/**
 * Zone Category Info Schema
 */
export const ZoneCategoryInfoSchema = z.object({
  category: ZoneCategorySchema,
  name: z.string(),
  description: z.string(),
  defaultColor: z.string(),
  defaultIcon: z.string(),
  sortOrder: z.number().int(),
});

export type ZoneCategoryInfo = z.infer<typeof ZoneCategoryInfoSchema>;

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export {
  // Core schemas
  ZoneSchema,
  ZoneWithStatsSchema,
  ZonesQuerySchema,
  ZoneFiltersSchema,

  // Response schemas
  ZonesListResponseSchema,
  ZonesWithStatsResponseSchema,
  ZoneDetailsResponseSchema,

  // Admin schemas
  CreateZoneSchema,
  UpdateZoneSchema,

  // Category schemas
  ZoneCategorySchema,
  ZoneCategoryInfoSchema,

  // Types
  type Zone,
  type ZoneWithStats,
  type ZonesQuery,
  type ZoneFilters,
  type ZonesListResponse,
  type ZonesWithStatsResponse,
  type ZoneDetailsResponse,
  type CreateZone,
  type UpdateZone,
  type ZoneCategory,
  type ZoneCategoryInfo,
};