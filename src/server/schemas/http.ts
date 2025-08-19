// HTTP envelopes and helpers
// Data types sourced from server/db/schema.ts (canonical database schema)
// No manual types created - all types inferred from zod schemas

import { z } from "zod";

// Standard success/error envelope using discriminated union
export const ErrorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

export const Envelope = <T extends z.ZodType>(
  data: T,
): z.ZodDiscriminatedUnion<"ok", z.Primitive[]> =>
  z.discriminatedUnion("ok", [z.object({ ok: z.literal(true), data }), ErrorEnvelopeSchema]);

export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

// Pagination helpers
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(10),
  total: z.number().int().min(0),
});

export const PaginatedResponseSchema = <T extends z.ZodType>(
  itemSchema: T,
): z.ZodObject<z.ZodRawShape> =>
  z.object({
    items: z.array(itemSchema),
    pagination: PaginationSchema.omit({ page: true, pageSize: true }),
  });

export type Pagination = z.infer<typeof PaginationSchema>;
