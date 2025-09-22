import { z } from "zod";

// ============================================================================
// INTERACTIONS DTO SCHEMAS - Aligned with database schema
// ============================================================================

// Full interaction schema (mirrors interactions table structure)
export const InteractionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  type: z.string(), // email | call | meeting | note | web
  subject: z.string().nullable(),
  bodyText: z.string().nullable(),
  bodyRaw: z.unknown().nullable(), // JSONB field
  occurredAt: z.string().datetime(), // ISO string format
  source: z.string().nullable(), // gmail | calendar | manual
  sourceId: z.string().nullable(),
  sourceMeta: z.unknown().nullable(), // JSONB field
  batchId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(), // ISO string format
});

// Schema for creating new interactions
export const NewInteractionSchema = InteractionSchema.omit({
  id: true,
  createdAt: true,
});

// Schema for updating existing interactions
export const UpdateInteractionSchema = InteractionSchema.partial().omit({
  id: true,
  userId: true,
  createdAt: true,
});

// Schema for normalized interactions (during processing)
export const NormalizedInteractionSchema = z.object({
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable().optional(),
  type: z.string(),
  subject: z.string().nullable().optional(),
  bodyText: z.string().nullable().optional(),
  bodyRaw: z.unknown().nullable().optional(),
  occurredAt: z.string().datetime(), // ISO string
  source: z.string(),
  sourceId: z.string().optional(),
  sourceMeta: z.unknown().nullable().optional(), // JSONB field
  batchId: z.string().uuid().nullable().optional(),
});

// Schema for interaction queries/filters
export const InteractionQuerySchema = z.object({
  contactId: z.string().uuid().optional(),
  type: z.string().optional(),
  source: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type Interaction = z.infer<typeof InteractionSchema>;
export type NewInteraction = z.infer<typeof NewInteractionSchema>;
export type UpdateInteraction = z.infer<typeof UpdateInteractionSchema>;
export type NormalizedInteraction = z.infer<typeof NormalizedInteractionSchema>;
export type InteractionQuery = z.infer<typeof InteractionQuerySchema>;
