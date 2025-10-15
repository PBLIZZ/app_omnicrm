/**
 * Zod parsing helpers with Result type integration
 *
 * Provides safe parsing functions that return Result types instead of throwing
 */

import { z } from "zod";

/**
 * Validates and parses `data` against the provided Zod `schema`.
 *
 * @param schema - Zod schema describing the expected shape
 * @param data - Value to validate and parse
 * @returns The parsed value conforming to `schema`
 * @throws z.ZodError when `data` does not match `schema`
 */
export function validateSchema<T>(schema: z.Schema<T>, data: unknown): T {
  return schema.parse(data);
}

/**
 * Parses `data` against the provided Zod `schema` and returns the parsed value or `null` on validation failure.
 *
 * @param schema - Zod schema used to validate and parse the input
 * @param data - The value to validate and parse
 * @returns `T` if `data` conforms to `schema`, `null` otherwise
 */
export function validateSchemaSafe<T>(schema: z.Schema<T>, data: unknown): T | null {
  const result = schema.safeParse(data);
  return result.success ? result.data : null;
}

/**
 * Extracts and validates a named property from an object.
 *
 * @param obj - The source value; must be a non-null object
 * @param key - The property name to extract
 * @param schema - Zod schema used to validate the extracted property
 * @returns The extracted property's value validated against `schema`
 * @throws Error if `obj` is not a non-null object
 * @throws z.ZodError if the extracted value does not conform to `schema`
 */
export function extractProperty<T>(obj: unknown, key: string, schema: z.ZodSchema<T>): T {
  if (typeof obj !== "object" || obj === null) {
    throw new Error(`Expected object, got ${typeof obj}`);
  }

  const value = Reflect.get(obj, key);
  return validateSchema(schema, value);
}

/**
 * Safely extracts a property by key from an object and validates it against the provided Zod schema, returning null on any failure.
 *
 * @param obj - The source value expected to be an object.
 * @param key - The property key to extract from `obj`.
 * @param schema - The Zod schema to validate the extracted property against.
 * @returns The validated property of type `T` if present and valid, `null` otherwise.
 */
export function extractPropertySafe<T>(
  obj: unknown,
  key: string,
  schema: z.ZodSchema<T>,
): T | null {
  if (typeof obj !== "object" || obj === null) {
    return null;
  }

  const value = Reflect.get(obj, key);
  return validateSchemaSafe(schema, value);
}

/**
 * Validates that the input is an array and parses each element using the provided Zod schema.
 *
 * @param data - The value to validate as an array of items
 * @param itemSchema - Zod schema to apply to each array element
 * @returns An array of parsed items of type `T`
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
 * Validate and cast a raw database result to the provided Zod schema.
 *
 * @param schema - Zod schema used to validate the database result
 * @param data - The raw value (e.g., a database row) to validate and narrow
 * @returns The validated value typed as `T`
 * @throws Error if `data` does not conform to `schema` (message: "Database result does not match expected schema")
 */
export function narrowDbResult<T>(schema: z.ZodSchema<T>, data: unknown): T {
  try {
    return validateSchema(schema, data);
  } catch {
    throw new Error("Database result does not match expected schema");
  }
}

/**
 * Validate and narrow an API response to the provided Zod schema.
 *
 * @param schema - Zod schema used to validate the response
 * @param response - The API response value to validate
 * @returns The validated value typed as `T`
 * @throws Error with message "API response does not match expected schema" when validation fails
 */
export function narrowApiResponse<T>(schema: z.ZodSchema<T>, response: unknown): T {
  try {
    return validateSchema(schema, response);
  } catch {
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
