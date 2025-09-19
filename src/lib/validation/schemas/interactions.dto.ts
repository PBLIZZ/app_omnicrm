import { z } from "zod";

// Mirror the interactions table structure with Zod validation
export const InteractionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  type: z.string(),
  subject: z.string().nullable(),
  bodyText: z.string().nullable(),
  bodyRaw: z.unknown().nullable(),
  occurredAt: z.string().datetime(), // ISO string
  source: z.string().nullable(),
  sourceId: z.string().nullable(),
  sourceMeta: z.record(z.string(), z.unknown()).nullable(),
  batchId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
});

export const NewInteractionSchema = InteractionSchema.omit({
  id: true,
  createdAt: true,
});

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
  sourceMeta: z.record(z.string(), z.unknown()).nullable().optional(),
  batchId: z.string().uuid().nullable().optional(),
});

export type Interaction = z.infer<typeof InteractionSchema>;
export type NewInteraction = z.infer<typeof NewInteractionSchema>;
export type NormalizedInteraction = z.infer<typeof NormalizedInteractionSchema>;
