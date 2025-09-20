/**
 * Zone DTOs and Validation Schemas
 *
 * Zones represent life-business contexts for wellness practitioners
 * (Personal Wellness, Client Care, Admin & Finances, etc.)
 */

import { z } from "zod";

// Base Zone Schema - matches the database structure
export const ZoneDTOSchema = z.object({
  id: z.number(),
  name: z.string().min(1, "Zone name is required"),
  color: z.string().nullable(),
  iconName: z.string().nullable(),
});

// Create Zone Schema - for creating new zones (admin function)
export const CreateZoneDTOSchema = z.object({
  name: z.string().min(1, "Zone name is required"),
  color: z.string().optional(),
  iconName: z.string().optional(),
});

// Update Zone Schema - for updating existing zones (admin function)
export const UpdateZoneDTOSchema = CreateZoneDTOSchema.partial();

// Zone with usage statistics - for analytics
export const ZoneWithStatsDTOSchema = ZoneDTOSchema.extend({
  projectCount: z.number(),
  taskCount: z.number(),
  activeTaskCount: z.number(),
});

// Wellness-specific zone constants
export const WELLNESS_ZONES = [
  "Personal Wellness",
  "Self Care",
  "Admin & Finances",
  "Business Development",
  "Social Media & Marketing",
  "Client Care"
] as const;

export const WellnessZoneSchema = z.enum(WELLNESS_ZONES);

// Type exports
export type ZoneDTO = z.infer<typeof ZoneDTOSchema>;
export type CreateZoneDTO = z.infer<typeof CreateZoneDTOSchema>;
export type UpdateZoneDTO = z.infer<typeof UpdateZoneDTOSchema>;
export type ZoneWithStatsDTO = z.infer<typeof ZoneWithStatsDTOSchema>;
export type WellnessZone = z.infer<typeof WellnessZoneSchema>;