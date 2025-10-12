/**
 * Zod parsing helpers with Result type integration
 *
 * Provides safe parsing functions that return Result types instead of throwing
 */

import { z } from "zod";

/**
 * Parse data with a schema. Throws on validation errors.
 */
export function validateSchema<T>(schema: z.Schema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Parse data with a schema safely. Returns `null` when validation fails.
 */
export function validateSchemaSafe<T>(schema: z.Schema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Type-safe object property extraction using Zod
 */
export function extractProperty<T>(
  obj: unknown,
  key: string,
  schema: z.ZodSchema<T>,
): T {
  if (typeof obj !== "object" || obj === null) {
    throw new Error(`Expected object, got ${typeof obj}`);
  }

  const value = (obj as Record<string, unknown>)[key];
  return validateSchema(schema, value);
}

/**
 * Safe variant of property extraction. Returns null when validation fails.
 */
export function extractPropertySafe<T>(
  obj: unknown,
  key: string,
  schema: z.ZodSchema<T>,
): T | null {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }

  const value = (obj as Record<string, unknown>)[key];
  return validateSchemaSafe(schema, value);
}

/**
 * Type-safe array element validation. Throws on invalid items.
 */
export function validateArray<T>(data: unknown, itemSchema: z.ZodSchema<T>): T[] {
  if (!Array.isArray(data)) {
    throw new Error(`Expected array, got ${typeof data}`);
  }

  return data.map((item, index) => {
    const parsed = validateSchemaSafe(itemSchema, item);
    if (parsed === null) {
      throw new Error(`Invalid item at index ${index}`);
    }
    return parsed;
  });
}

/**
 * Common schemas for type narrowing
 */
export const StringSchema = z.string();
export const NumberSchema = z.number();
export const BooleanSchema = z.boolean();
export const DateSchema = z.date();
export const TimestampSchema = z.string().datetime();

/**
 * Database row schemas
 */
export const NonEmptyStringSchema = z.string().min(1);
export const UuidSchema = z.string().uuid();
export const EmailSchema = z.string().email();
export const UrlSchema = z.string().url();

/**
 * Narrow unknown database result to typed data
 */
export function narrowDbResult<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return validateSchema(schema, data);
  } catch (_error) {
    throw new Error("Database result does not match expected schema");
  }
}

/**
 * Narrow API response data
 */
export function narrowApiResponse<T>(schema: z.ZodSchema<T>, response: unknown): T {
  try {
    return validateSchema(schema, response);
  } catch (_error) {
    throw new Error("API response does not match expected schema");
  }
}

/**
 * Helper for nullable fields
 */
export function nullable<T>(schema: z.ZodSchema<T>) {
  return z.union([schema, z.null()]);
}

/**
 * Helper for optional nullable fields
 */
export function optionalNullable<T>(schema: z.ZodSchema<T>) {
  return z.union([schema, z.null(), z.undefined()]);
}

/**
 * Transform undefined to null for exact optional property types
 */
export function undefinedToNull<T>(value: T | undefined): T | null {
  return value === undefined ? null : value;
}

/**
 * Database insert/update value transformer
 */
export function toDbValue<T>(value: T | undefined): T | null {
  return undefinedToNull(value);
}
