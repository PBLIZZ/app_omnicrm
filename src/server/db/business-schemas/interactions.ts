/**
 * Data Intelligence - Interaction Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - Interaction (select type)
 * - CreateInteraction (insert type)
 * - UpdateInteraction (partial insert type)
 *
 * Per architecture blueprint: JSONB fields use validated schemas from raw-events-payloads
 * (single source of truth for all JSONB payload and source_meta structures)
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { interactions } from "@/server/db/schema";
import {
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
  RawEventSourceMetaSchema,
  type GmailSourceMeta,
  type CalendarSourceMeta,
  type RawEventSourceMeta,
} from "./raw-events-payloads";
import { PaginationQuerySchema, createPaginatedResponseSchema } from "@/lib/validation/common";

export type { Interaction, CreateInteraction, UpdateInteraction } from "@/server/db/schema";

// Re-export source metadata schemas from raw-events-payloads (single source of truth)
export {
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
  RawEventSourceMetaSchema as SourceMetaSchema,
  type GmailSourceMeta,
  type CalendarSourceMeta,
  type RawEventSourceMeta as SourceMeta,
};

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseInteractionSchema = createSelectSchema(interactions);

/**
 * Interaction schema with validated JSONB field
 */
export const InteractionSchema = BaseInteractionSchema.extend({
  sourceMeta: RawEventSourceMetaSchema.optional(),
});

export type InteractionDTO = z.infer<typeof InteractionSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

export const CreateInteractionBodySchema = z.object({
  contactId: z.string().uuid(),
  type: z.string().min(1, "type is required"),
  subject: z.string().optional(),
  bodyText: z.string().optional(),
  occurredAt: z.coerce.date(),
  source: z.string().min(1, "source is required"),
  sourceId: z.string().min(1, "sourceId is required"),
  sourceMeta: RawEventSourceMetaSchema.optional(),
  batchId: z.string().uuid().optional(),
});

export type CreateInteractionBody = z.infer<typeof CreateInteractionBodySchema>;

export const UpdateInteractionBodySchema = z
  .object({
    type: z.string().min(1).optional(),
    subject: z.string().nullish(),
    bodyText: z.string().nullish(),
    occurredAt: z.coerce.date().optional(),
    source: z.string().min(1).optional(),
    sourceId: z.string().min(1).optional(),
    sourceMeta: RawEventSourceMetaSchema.nullish(),
    batchId: z.string().uuid().nullish(),
  })
  .refine(
    (data) =>
      data.type !== undefined ||
      data.subject !== undefined ||
      data.bodyText !== undefined ||
      data.occurredAt !== undefined ||
      data.source !== undefined ||
      data.sourceId !== undefined ||
      data.sourceMeta !== undefined ||
      data.batchId !== undefined,
    {
      message: "At least one field must be provided",
    },
  );

export type UpdateInteractionBody = z.infer<typeof UpdateInteractionBodySchema>;

export const GetInteractionsQuerySchema = PaginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(20), // Override max for interactions
  sort: z.enum(["occurredAt", "createdAt"]).default("occurredAt"),
  contactId: z.string().uuid().optional(),
  type: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  search: z.string().optional(),
});

export type GetInteractionsQuery = z.infer<typeof GetInteractionsQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Interaction List Response Schema
 * Note: Per architecture blueprint, transforms removed. UI enrichment should happen
 * in service layer mappers (e.g., `mapToInteractionWithUI()` helper function).
 */
export const InteractionListResponseSchema = createPaginatedResponseSchema(InteractionSchema);

export type InteractionListResponse = z.infer<typeof InteractionListResponseSchema>;

export const InteractionResponseSchema = z.object({
  item: InteractionSchema,
});
