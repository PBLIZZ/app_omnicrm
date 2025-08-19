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

/**
 * Creates a success envelope schema for a given data type.
 *
 * @template T
 * @param {T} data - The data type to create a success envelope schema for.
 * @returns {z.ZodObject<{ ok: z.ZodLiteral<true>; data: T }>} The success envelope schema.
 */
const SuccessEnvelopeSchema = <T extends z.ZodType>(
  data: T,
): z.ZodObject<{ ok: z.ZodLiteral<true>; data: T }> => z.object({ ok: z.literal(true), data });

/**
 * Creates an envelope schema that can be either a success or error envelope.
 *
 * @template T
 * @param {T} data - The data type to create an envelope schema for.
 * @returns {z.ZodDiscriminatedUnion<"ok", [z.ZodObject<{ ok: z.ZodLiteral<true>; data: T }>, z.ZodObject<{ ok: z.ZodLiteral<false>; error: z.ZodString; details: z.ZodUnknown }>]>} The envelope schema.
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const Envelope = <T extends z.ZodType>(data: T) => {
  const successSchema = SuccessEnvelopeSchema(data);
  return z.discriminatedUnion("ok", [successSchema, ErrorEnvelopeSchema]);
};

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
