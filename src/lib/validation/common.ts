/**
 * Shared Validation Helpers
 *
 * Common validation schemas used across business schemas.
 * Centralizes repeated patterns for consistency and maintainability.
 */

import { z } from "zod";

// ============================================================================
// PAGINATION SCHEMAS
// ============================================================================

/**
 * Standard Pagination Query Schema
 * Use for GET endpoints that support pagination
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  order: z.enum(["asc", "desc"]).default("desc"),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Standard Pagination Response Schema
 * Use for list response pagination metadata
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasNext: z.boolean(),
  hasPrev: z.boolean(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Generic paginated list response schema factory
 * Use to create type-safe paginated response schemas
 */
export function createPaginatedResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    items: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });
}

// ============================================================================
// JSONB VALIDATION SCHEMAS
// ============================================================================

/**
 * Safe JSONB schema for validated record types
 * Use when you need a structured object but with flexible keys
 */
export const SafeJsonbRecordSchema = z.record(z.string(), z.unknown());

/**
 * Nullable JSONB schema with fallback to empty object
 * Use for optional JSONB fields that default to {}
 */
export const NullableJsonbSchema = z
  .union([SafeJsonbRecordSchema, z.null(), z.undefined()])
  .transform((value) => (value == null ? {} : value));

/**
 * Optional JSONB field schema
 * Use for JSONB fields that can be omitted or null
 */
export const OptionalJsonbSchema = z.unknown().optional();

/**
 * Nullish JSONB field schema (null, undefined, or value)
 * Use for update operations where null explicitly clears the field
 */
export const NullishJsonbSchema = z.unknown().nullish();

// ============================================================================
// DATE/TIME SCHEMAS
// ============================================================================

/**
 * Flexible date input schema (accepts string, number, Date, null, undefined)
 */
export const DateInputSchema = z.union([z.string(), z.number(), z.date(), z.null(), z.undefined()]);

/**
 * Coerce nullable date helper
 */
export function coerceNullableDate(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }
  const date = value instanceof Date ? value : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date value");
  }
  return date;
}

/**
 * Nullable date input with transform
 * Use for optional date fields in create/update schemas
 */
export const NullableDateInputSchema = DateInputSchema.transform(coerceNullableDate);

// ============================================================================
// UUID SCHEMAS
// ============================================================================

/**
 * Required UUID schema
 */
export const UuidSchema = z.string().uuid();

/**
 * Optional UUID schema
 */
export const OptionalUuidSchema = z.string().uuid().optional();

/**
 * Nullable UUID schema
 */
export const NullableUuidSchema = z.string().uuid().nullable();

/**
 * Nullish UUID schema (for updates)
 */
export const NullishUuidSchema = z.string().uuid().nullish();

/**
 * Array of UUIDs schema
 */
export const UuidArraySchema = z.array(z.string().uuid());

// ============================================================================
// ARRAY SCHEMAS
// ============================================================================

/**
 * Non-empty array schema factory
 */
export function nonEmptyArray<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.array(itemSchema).min(1, "Array must contain at least one item");
}

/**
 * Array with max length schema factory
 */
export function boundedArray<T extends z.ZodTypeAny>(
  itemSchema: T,
  maxLength: number,
  minLength = 0,
) {
  return z
    .array(itemSchema)
    .min(minLength, `Array must contain at least ${minLength} items`)
    .max(maxLength, `Array cannot exceed ${maxLength} items`);
}

// ============================================================================
// SEARCH & FILTER SCHEMAS
// ============================================================================

/**
 * Optional search query schema
 */
export const SearchQuerySchema = z.string().min(1).optional();

/**
 * Optional filter array schema factory
 */
export function createFilterArraySchema<T extends readonly [string, ...string[]]>(values: T) {
  return z.array(z.enum(values)).optional();
}

// ============================================================================
// RESPONSE SCHEMAS
// ============================================================================

/**
 * Generic success response
 */
export const SuccessResponseSchema = z.object({
  success: z.literal(true),
});

/**
 * Generic item response schema factory
 */
export function createItemResponseSchema<T extends z.ZodTypeAny>(itemSchema: T) {
  return z.object({
    item: itemSchema,
  });
}

/**
 * Generic deletion response
 */
export const DeleteResponseSchema = z.object({
  deleted: z.number().int().min(0),
});
