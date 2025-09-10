/**
 * Type Guards and Runtime Validation Utilities
 *
 * Collection of type guards and validation functions to ensure type safety
 * when dealing with unknown data from APIs, user input, or external sources.
 */

// ============================================================================
// BASIC TYPE GUARDS
// ============================================================================

export function isString(value: unknown): value is string {
  return typeof value === "string";
}

export function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function isStringArray(value: unknown): value is string[] {
  return isArray(value) && value.every(isString);
}

export function isNumberArray(value: unknown): value is number[] {
  return isArray(value) && value.every(isNumber);
}

export function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function isValidDateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime());
}

// ============================================================================
// OBJECT PROPERTY EXTRACTORS WITH TYPE SAFETY
// ============================================================================

/**
 * Safely extract a string property from an object
 */
export function getString(obj: unknown, key: string): string | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isString(value) ? value : undefined;
}

/**
 * Safely extract a number property from an object
 */
export function getNumber(obj: unknown, key: string): number | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isNumber(value) ? value : undefined;
}

/**
 * Safely extract a boolean property from an object
 */
export function getBoolean(obj: unknown, key: string): boolean | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isBoolean(value) ? value : undefined;
}

/**
 * Safely extract an object property from an object
 */
export function getObject(obj: unknown, key: string): Record<string, unknown> | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isObject(value) ? value : undefined;
}

/**
 * Safely extract an array property from an object
 */
export function getArray(obj: unknown, key: string): unknown[] | undefined {
  if (!isObject(obj)) return undefined;
  const value = obj[key];
  return isArray(value) ? value : undefined;
}

/**
 * Safely extract a string array property from an object
 */
export function getStringArray(obj: unknown, key: string): string[] | undefined {
  const arr = getArray(obj, key);
  return arr && isStringArray(arr) ? arr : undefined;
}

// ============================================================================
// API RESPONSE VALIDATION
// ============================================================================

/**
 * Type guard for standard API response envelope
 */
export interface ApiEnvelope<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  details?: unknown;
}

export function isApiEnvelope(value: unknown): value is ApiEnvelope {
  if (!isObject(value)) return false;
  const ok = getBoolean(value, "ok");
  return typeof ok === "boolean";
}

export function isSuccessApiEnvelope<T>(
  value: unknown,
): value is ApiEnvelope<T> & { ok: true; data: T } {
  return isApiEnvelope(value) && value.ok === true && "data" in value;
}

export function isErrorApiEnvelope(
  value: unknown,
): value is ApiEnvelope & { ok: false; error: string } {
  return isApiEnvelope(value) && value.ok === false;
}

// ============================================================================
// JSON PARSING WITH VALIDATION
// ============================================================================

/**
 * Safely parse JSON with optional validation
 */
export function safeJsonParse<T>(
  json: string,
  validator?: (value: unknown) => value is T,
): { success: true; data: T } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (validator && !validator(parsed)) {
      return { success: false, error: "Parsed JSON does not match expected type" };
    }
    return { success: true, data: parsed as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown JSON parse error",
    };
  }
}

// ============================================================================
// ARRAY VALIDATION HELPERS
// ============================================================================

/**
 * Filter array to only include items that pass the type guard
 */
export function filterByTypeGuard<T>(array: unknown[], guard: (item: unknown) => item is T): T[] {
  return array.filter(guard);
}

/**
 * Validate that all items in array pass the type guard
 */
export function validateArrayItems<T>(
  array: unknown[],
  guard: (item: unknown) => item is T,
): array is T[] {
  return array.every(guard);
}

// ============================================================================
// ERROR HANDLING UTILITIES
// ============================================================================

/**
 * Type guard for Error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Safely extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (isError(error)) {
    return error.message;
  }
  if (isString(error)) {
    return error;
  }
  if (isObject(error)) {
    const message = getString(error, "message");
    if (message) return message;
  }
  return "Unknown error occurred";
}

// ============================================================================
// VALIDATION RESULT TYPES
// ============================================================================

export type ValidationResult<T> = { valid: true; data: T } | { valid: false; errors: string[] };

/**
 * Create a successful validation result
 */
export function validationSuccess<T>(data: T): ValidationResult<T> {
  return { valid: true, data };
}

/**
 * Create a failed validation result
 */
export function validationError<T>(errors: string[]): ValidationResult<T> {
  return { valid: false, errors };
}

// ============================================================================
// FORM DATA VALIDATION
// ============================================================================

/**
 * Validate form data object structure
 */
export interface FormValidationRule<T> {
  required?: boolean;
  type?: "string" | "number" | "boolean" | "array";
  validator?: (value: unknown) => value is T;
  transform?: (value: unknown) => T | undefined;
}

export function validateFormData<T extends Record<string, unknown>>(
  data: unknown,
  rules: Record<keyof T, FormValidationRule<T[keyof T]>>,
): ValidationResult<T> {
  if (!isObject(data)) {
    return validationError(["Data must be an object"]);
  }

  const errors: string[] = [];
  const result: Partial<T> = {};

  for (const [key, rule] of Object.entries(rules) as [keyof T, FormValidationRule<T[keyof T]>][]) {
    const value = data[key as string];

    // Check if required field is missing
    if (rule.required && (value === undefined || value === null)) {
      errors.push(`Field '${String(key)}' is required`);
      continue;
    }

    // Skip validation for optional missing fields
    if (!rule.required && (value === undefined || value === null)) {
      continue;
    }

    // Apply transformation if provided
    let processedValue = value;
    if (rule.transform) {
      processedValue = rule.transform(value);
      if (processedValue === undefined) {
        errors.push(`Field '${String(key)}' transformation failed`);
        continue;
      }
    }

    // Type validation
    if (rule.type) {
      switch (rule.type) {
        case "string":
          if (!isString(processedValue)) {
            errors.push(`Field '${String(key)}' must be a string`);
            continue;
          }
          break;
        case "number":
          if (!isNumber(processedValue)) {
            errors.push(`Field '${String(key)}' must be a number`);
            continue;
          }
          break;
        case "boolean":
          if (!isBoolean(processedValue)) {
            errors.push(`Field '${String(key)}' must be a boolean`);
            continue;
          }
          break;
        case "array":
          if (!isArray(processedValue)) {
            errors.push(`Field '${String(key)}' must be an array`);
            continue;
          }
          break;
      }
    }

    // Custom validator
    if (rule.validator && !rule.validator(processedValue)) {
      errors.push(`Field '${String(key)}' failed custom validation`);
      continue;
    }

    result[key] = processedValue as T[keyof T];
  }

  if (errors.length > 0) {
    return validationError(errors);
  }

  return validationSuccess(result as T);
}
