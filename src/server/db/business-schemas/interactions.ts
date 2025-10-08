/**
 * Data Intelligence - Interaction Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - Interaction (select type)
 * - CreateInteraction (insert type)
 * - UpdateInteraction (partial insert type)
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { interactions } from "@/server/db/schema";

export type { Interaction, CreateInteraction, UpdateInteraction } from "@/server/db/schema";

// ============================================================================
// SOURCE METADATA SCHEMAS
// ============================================================================

export const GmailSourceMetaSchema = z.object({
  from: z.string().optional(),
  to: z.array(z.string()).optional(),
  cc: z.array(z.string()).optional(),
  bcc: z.array(z.string()).optional(),
  subject: z.string().optional(),
  threadId: z.string().optional(),
  messageId: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  fetchedAt: z.string().optional(),
  matchedQuery: z.string().optional(),
});

export const CalendarSourceMetaSchema = z.object({
  attendees: z
    .array(
      z.object({
        email: z.string(),
        name: z.string().optional(),
        responseStatus: z.string().optional(),
      }),
    )
    .optional(),
  organizer: z
    .object({
      email: z.string(),
      name: z.string().optional(),
    })
    .optional(),
  eventId: z.string().optional(),
  calendarId: z.string().optional(),
  summary: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  isAllDay: z.boolean().optional(),
  recurring: z.boolean().optional(),
  status: z.string().optional(),
  fetchedAt: z.string().optional(),
});

export const GenericSourceMetaSchema = z.record(z.string(), z.unknown());

export const SourceMetaSchema = z.union([
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
  GenericSourceMetaSchema,
]);

export type GmailSourceMeta = z.infer<typeof GmailSourceMetaSchema>;
export type CalendarSourceMeta = z.infer<typeof CalendarSourceMetaSchema>;
export type SourceMeta = z.infer<typeof SourceMetaSchema>;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseInteractionSchema = createSelectSchema(interactions);

export const InteractionSchema = BaseInteractionSchema.extend({
  sourceMeta: z.unknown(),
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
  sourceMeta: SourceMetaSchema.optional(),
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
    sourceMeta: SourceMetaSchema.nullish(),
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

export const GetInteractionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),
  sort: z.enum(["occurredAt", "createdAt"]).default("occurredAt"),
  order: z.enum(["asc", "desc"]).default("desc"),
  contactId: z.string().uuid().optional(),
  type: z.array(z.string()).optional(),
  source: z.array(z.string()).optional(),
  search: z.string().optional(),
});

export type GetInteractionsQuery = z.infer<typeof GetInteractionsQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const InteractionWithUISchema = InteractionSchema.transform((data) => ({
  ...data,
  hasContent: Boolean(data.bodyText || data.subject),
  contentPreview: data.bodyText
    ? data.bodyText.slice(0, 150) + (data.bodyText.length > 150 ? "..." : "")
    : data.subject || "No content",
  isEmail: data.type === "email",
  isCall: data.type === "call",
  isMeeting: data.type === "meeting",
  isCalendarEvent: data.type === "calendar_event",
})) satisfies z.ZodType<
  InteractionDTO & {
    hasContent: boolean;
    contentPreview: string;
    isEmail: boolean;
    isCall: boolean;
    isMeeting: boolean;
    isCalendarEvent: boolean;
  }
>;

export type InteractionWithUI = z.infer<typeof InteractionWithUISchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const InteractionListResponseSchema = z.object({
  items: z.array(InteractionWithUISchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type InteractionListResponse = z.infer<typeof InteractionListResponseSchema>;

export const InteractionResponseSchema = z.object({
  item: InteractionSchema,
});
