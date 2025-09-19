import { z } from "zod";

/**
 * Interaction DTO Schema
 *
 * Stable UI-focused contract for interaction data.
 * Represents emails, calls, meetings, notes, and web interactions.
 */
export const InteractionDTOSchema = z.object({
  id: z.string().uuid(),
  contactId: z.string().uuid().nullable(),
  type: z.enum(["email", "call", "meeting", "note", "web"]),
  subject: z.string().nullable(),
  bodyText: z.string().nullable(),
  bodyRaw: z.unknown().nullable(), // JSON blob
  occurredAt: z.coerce.date(),
  source: z.enum(["gmail", "calendar", "manual"]).nullable(),
  sourceId: z.string().nullable(),
  sourceMeta: z.unknown().nullable(), // JSON blob
  batchId: z.string().uuid().nullable(),
  createdAt: z.coerce.date(),
});

export type InteractionDTO = z.infer<typeof InteractionDTOSchema>;

/**
 * Create Interaction DTO Schema
 *
 * Schema for creating new interactions
 */
export const CreateInteractionDTOSchema = z.object({
  contactId: z.string().uuid().optional(),
  type: z.enum(["email", "call", "meeting", "note", "web"]),
  subject: z.string().optional(),
  bodyText: z.string().optional(),
  bodyRaw: z.unknown().optional(),
  occurredAt: z.coerce.date(),
  source: z.enum(["gmail", "calendar", "manual"]).optional(),
  sourceId: z.string().optional(),
  sourceMeta: z.unknown().optional(),
  batchId: z.string().uuid().optional(),
});

export type CreateInteractionDTO = z.infer<typeof CreateInteractionDTOSchema>;

/**
 * Update Interaction DTO Schema
 *
 * Schema for updating existing interactions
 */
export const UpdateInteractionDTOSchema = CreateInteractionDTOSchema.partial();

export type UpdateInteractionDTO = z.infer<typeof UpdateInteractionDTOSchema>;