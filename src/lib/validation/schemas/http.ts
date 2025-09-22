import { z } from "zod";

// ============================================================================
// SIMPLIFIED API RESPONSE SCHEMAS (aligned with contracts package)
// ============================================================================

/**
 * Successful API response schema - simplified pattern
 * Matches OkEnvelope<T> from contracts package
 */
export const okEnvelopeSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.object({
    ok: z.literal(true),
    data,
  });

/**
 * Error API response schema - simplified pattern
 * Matches ErrorEnvelope from contracts package
 */
export const errorEnvelopeSchema = z.object({
  ok: z.literal(false),
  error: z.string(),
  details: z.unknown().optional(),
});

/**
 * Main API response schema - discriminated union for type safety
 * Matches ApiResponse<T> from contracts package
 */
export const apiResponseSchema = <T extends z.ZodTypeAny>(data: T) =>
  z.discriminatedUnion("ok", [okEnvelopeSchema(data), errorEnvelopeSchema]);

// ============================================================================
// LEGACY COMPATIBILITY (DEPRECATED - Use simplified schemas above)
// ============================================================================

export const successEnvelope = okEnvelopeSchema;
export const errorEnvelope = errorEnvelopeSchema;
export const envelope = apiResponseSchema;

// Legacy exports for backward compatibility
export const Envelope = envelope;
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

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OkEnvelope<T> = z.infer<ReturnType<typeof okEnvelopeSchema<z.ZodType<T>>>>;
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export type ApiResponse<T> = z.infer<ReturnType<typeof apiResponseSchema<z.ZodType<T>>>>;

export type Pagination = z.infer<typeof PaginationSchema>;

// Legacy type aliases for backward compatibility
export type ApiSuccessResponse<T> = OkEnvelope<T>;
export type ApiErrorResponse = ErrorEnvelope;
