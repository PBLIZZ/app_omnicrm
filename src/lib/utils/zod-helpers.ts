/**
 * Zod parsing helpers with Result type integration
 *
 * Provides safe parsing functions that return Result types instead of throwing
 */

import { z } from "zod";
import { Result, ok, err } from "./result";

/**
 * Safe Zod parsing that returns Result instead of throwing
 */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, z.ZodError> {
  const result = schema.safeParse(data);

  if (result.success) {
    return ok(result.data);
  } else {
    return err(result.error);
  }
}

/**
 * Parse with custom error mapping
 */
export function parseWithError<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  errorMessage?: string,
): Result<T, string> {
  const result = schema.safeParse(data);

  if (result.success) {
    return ok(result.data);
  } else {
    const message =
      errorMessage ??
      `Validation failed: ${result.error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(", ")}`;
    return err(message);
  }
}

/**
 * Validate API request body with proper error format
 */
export function validateApiBody<T>(
  schema: z.ZodSchema<T>,
  body: unknown,
): Result<
  T,
  {
    status: number;
    message: string;
    issues: Array<{ path: string; message: string }>;
  }
> {
  const result = schema.safeParse(body);

  if (result.success) {
    return ok(result.data);
  } else {
    return err({
      status: 400,
      message: "Validation failed",
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }
}

/**
 * Type-safe object property extraction using Zod
 */
export function extractProperty<T>(
  obj: unknown,
  key: string,
  schema: z.ZodSchema<T>,
): Result<T, string> {
  if (typeof obj !== "object" || obj === null) {
    return err(`Expected object, got ${typeof obj}`);
  }

  const value = (obj as Record<string, unknown>)[key];
  return parseWithError(schema, value, `Invalid ${key}: expected ${schema._def.typeName}`);
}

/**
 * Type-safe array element validation
 */
export function validateArray<T>(data: unknown, itemSchema: z.ZodSchema<T>): Result<T[], string> {
  if (!Array.isArray(data)) {
    return err(`Expected array, got ${typeof data}`);
  }

  const result: T[] = [];

  for (let i = 0; i < data.length; i++) {
    const itemResult = parseWithError(itemSchema, data[i], `Invalid item at index ${i}`);
    if (itemResult.success === false) {
      return err(itemResult.error);
    }
    result.push(itemResult.data);
  }

  return ok(result);
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
export function narrowDbResult<T>(schema: z.ZodSchema<T>, data: unknown): Result<T, string> {
  return parseWithError(schema, data, "Database result does not match expected schema");
}

/**
 * Narrow API response data
 */
export function narrowApiResponse<T>(schema: z.ZodSchema<T>, response: unknown): Result<T, string> {
  return parseWithError(schema, response, "API response does not match expected schema");
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
