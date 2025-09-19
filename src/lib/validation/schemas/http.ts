import { z } from "zod";

export const successEnvelope = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    ok: z.literal(true),
    data,
  });

export const errorEnvelope = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

export const envelope = <T extends z.ZodTypeAny>(data: T) =>
  z.discriminatedUnion("ok", [successEnvelope(data), errorEnvelope]);

// Legacy export for backward compatibility
export const Envelope = envelope;

// Legacy exports for backward compatibility
export const ErrorEnvelopeSchema = errorEnvelope;

// Pagination helpers
export const PaginationSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(200).default(10),
  total: z.number().int().min(0),
});

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
): z.ZodObject<z.ZodRawShape> =>
  z.object({
    items: z.array(itemSchema),
    pagination: PaginationSchema.omit({ page: true, pageSize: true }),
  });

export type Pagination = z.infer<typeof PaginationSchema>;
export type ErrorEnvelope = z.infer<typeof errorEnvelope>;
