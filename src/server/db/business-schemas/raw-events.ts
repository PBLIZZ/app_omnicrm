/**
 * Data Intelligence - Raw Event Business Schemas
 *
 * Base drizzle types are re-exported for convenience:
 * - RawEvent (select type)
 * - CreateRawEvent (insert type)
 *
 * Per architecture blueprint: Validated JSONB schemas, no transforms.
 */

import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

import { rawEvents } from "@/server/db/schema";
import type { ProviderType } from "@repo";
import { RawEventPayloadSchema, RawEventSourceMetaSchema } from "./raw-events-payloads";
import { PaginationQuerySchema, createPaginatedResponseSchema } from "@/lib/validation/common";

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

export const RawEventContactExtractionStatusSchema = z.enum(RawEventContactExtractionStatusValues);
export type RawEventContactExtractionStatus = z.infer<typeof RawEventContactExtractionStatusSchema>;

// Use the ProviderType from @repo to ensure type consistency
const ProviderTypeSchema = z.enum([
  "gmail",
  "calendar",
  "drive",
  "upload",
] as const) satisfies z.ZodType<ProviderType>;

// ============================================================================
// BASE SCHEMAS
// ============================================================================

const BaseRawEventSchema = createSelectSchema(rawEvents);

/**
 * Raw Event schema - matches database SELECT type
 * Note: JSONB fields (payload, sourceMeta) are unknown from DB
 * Use structured schemas for input validation (CREATE/UPDATE)
 */
export const RawEventSchema = BaseRawEventSchema.extend({
  payload: z.unknown(),
  sourceMeta: z.unknown(),
  processingStatus: RawEventProcessingStatusSchema.nullable(),
  contactExtractionStatus: RawEventContactExtractionStatusSchema.nullable(),
});

export type RawEventDTO = z.infer<typeof RawEventSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

const BaseRawEventPayloadSchema = z.object({
  provider: ProviderTypeSchema,
  payload: RawEventPayloadSchema,
  occurredAt: z.coerce.date(),
  sourceId: z.string().min(1, "sourceId is required"),
  sourceMeta: RawEventSourceMetaSchema.optional(),
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

export const RawEventQuerySchema = PaginationQuerySchema.extend({
  pageSize: z.coerce.number().int().min(1).max(200).default(50), // Override defaults
  sort: z.enum(["createdAt", "occurredAt"]).default("createdAt"),
  provider: z.array(ProviderTypeSchema).optional(),
  processingStatus: z.array(RawEventProcessingStatusSchema).optional(),
  contactExtractionStatus: z.array(RawEventContactExtractionStatusSchema).optional(),
  batchId: z.string().uuid().optional(),
  createdAfter: z.coerce.date().optional(),
  createdBefore: z.coerce.date().optional(),
});

export type RawEventQuery = z.infer<typeof RawEventQuerySchema>;

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Raw Event List Response Schema
 * Uses shared pagination helper
 */
export const RawEventListResponseSchema = createPaginatedResponseSchema(RawEventSchema);

export type RawEventListResponse = z.infer<typeof RawEventListResponseSchema>;

export const RawEventResponseSchema = z.object({
  item: RawEventSchema,
});

export type RawEventResponse = z.infer<typeof RawEventResponseSchema>;
