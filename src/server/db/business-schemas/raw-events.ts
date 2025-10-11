/**
 * Data Intelligence - Raw Event Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - RawEvent (select type)
 * - CreateRawEvent (insert type)
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { providerTypeEnum, rawEvents } from "@/server/db/schema";

export type { RawEvent, CreateRawEvent, UpdateRawEvent } from "@/server/db/schema";

// ============================================================================
// ENUMS
// ============================================================================

export const RawEventProcessingStatusValues = [
  "pending",
  "processing",
  "completed",
  "failed",
  "skipped",
] as const;

export const RawEventProcessingStatusSchema = z.enum(RawEventProcessingStatusValues);
export type RawEventProcessingStatus = z.infer<typeof RawEventProcessingStatusSchema>;

export const RawEventContactExtractionStatusValues = [
  "NO_IDENTIFIERS",
  "IDENTIFIERS_FOUND",
  "PENDING",
  "YES",
  "REJECTED",
] as const;

export const RawEventContactExtractionStatusSchema = z.enum(
  RawEventContactExtractionStatusValues,
);
export type RawEventContactExtractionStatus = z.infer<
  typeof RawEventContactExtractionStatusSchema
>;

const ProviderTypeSchema = z.enum(providerTypeEnum.enumValues as [string, ...string[]]);

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseRawEventSchema = createSelectSchema(rawEvents);

export const RawEventSchema = BaseRawEventSchema.extend({
  payload: z.unknown(),
  sourceMeta: z.unknown(),
  processingStatus: RawEventProcessingStatusSchema,
  contactExtractionStatus: RawEventContactExtractionStatusSchema.nullable(),
});

export type RawEventDTO = z.infer<typeof RawEventSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const BaseRawEventPayloadSchema = z.object({
  provider: ProviderTypeSchema,
  payload: z.unknown(),
  occurredAt: z.coerce.date(),
  sourceId: z.string().min(1, "sourceId is required"),
  sourceMeta: z.unknown().optional(),
  batchId: z.string().uuid().optional(),
  processingStatus: RawEventProcessingStatusSchema.optional(),
  processingAttempts: z.coerce.number().int().min(0).optional(),
  processingError: z.string().optional(),
  processedAt: z.coerce.date().optional(),
  contactExtractionStatus: RawEventContactExtractionStatusSchema.optional(),
  extractedAt: z.coerce.date().optional(),
});

export const CreateRawEventBodySchema = BaseRawEventPayloadSchema;

export type CreateRawEventBody = z.infer<typeof CreateRawEventBodySchema>;

export const UpdateRawEventBodySchema = BaseRawEventPayloadSchema.partial().superRefine(
  (data, ctx) => {
    if (Object.keys(data).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field must be provided",
      });
    }
  },
);

export type UpdateRawEventBody = z.infer<typeof UpdateRawEventBodySchema>;

export const RawEventQuerySchema = z.object({
  provider: z.array(ProviderTypeSchema).optional(),
  processingStatus: z.array(RawEventProcessingStatusSchema).optional(),
  contactExtractionStatus: z
    .array(RawEventContactExtractionStatusSchema)
    .optional(),
  batchId: z.string().uuid().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(50),
  order: z.enum(["asc", "desc"]).default("desc"),
  sort: z.enum(["createdAt", "occurredAt"]).default("createdAt"),
});

export type RawEventQuery = z.infer<typeof RawEventQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

export const RawEventListResponseSchema = z.object({
  items: z.array(RawEventSchema),
  pagination: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
    hasNext: z.boolean(),
    hasPrev: z.boolean(),
  }),
});

export type RawEventListResponse = z.infer<typeof RawEventListResponseSchema>;

export const RawEventResponseSchema = z.object({
  item: RawEventSchema,
});
