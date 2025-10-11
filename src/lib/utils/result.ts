/**
 * Result Type Pattern
 *
 * Replaces error-throwing functions with proper Result<T, E> types
 * to eliminate unsafe assignments and improve type safety.
 */

/**
 * Result type for functions that can succeed or fail
 */
export type Result<T, E = Error> =
  | {
      readonly success: true;
      readonly data: T;
    }
  | {
      readonly success: false;
      readonly error: E;
    };

/**
 * Success result constructor
 */
export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

/**
 * Error result constructor
 */
export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Type guard to check if result is success
 */
export function isOk<T, E>(result: Result<T, E>): result is { success: true; data: T } {
  return result.success === true;
}

/**
 * Type guard to check if result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is { success: false; error: E } {
  return result.success === false;
}

/**
 * Extract data from result or throw error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (isOk(result)) {
    return result.data;
  }
  if (isErr(result)) {
    throw result.error;
  }
  throw new Error("Invalid result state");
}

/**
 * Extract data from result or return default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (isOk(result)) {
    return result.data;
  }
  return defaultValue;
}

/**
 * Map over the success value
 */
export function map<T, U, E>(result: Result<T, E>, fn: (data: T) => U): Result<U, E> {
  if (isOk(result)) {
    return ok(fn(result.data));
  }
  return result as Result<U, E>;
}

/**
 * Map over the error value
 */
export function mapErr<T, E, F>(result: Result<T, E>, fn: (error: E) => F): Result<T, F> {
  if (isErr(result)) {
    return err(fn(result.error));
  }
  return result as Result<T, F>;
}

/**
 * Chain operations that return Results
 */
export function flatMap<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => Result<U, E>,
): Result<U, E> {
  if (isOk(result)) {
    return fn(result.data);
  }
  return result as Result<U, E>;
}

/**
 * Convert throwing function to Result-returning function
 */
export function safeAsync<T, Args extends readonly unknown[]>(
  fn: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<Result<T, Error>> {
  return async (...args) => {
    try {
      const data = await fn(...args);
      return ok(data);
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      // Preserve original error details by attaching as cause
      const errorObj = new Error(String(error));
      // Type-safe extension of Error object
      Object.defineProperty(errorObj, "original", {
        value: error,
        writable: false,
        enumerable: false,
        configurable: false,
      });
      return err(errorObj);
    }
  };
}

/**
 * Convert throwing function to Result-returning function (sync version)
 */
export function safe<T, Args extends readonly unknown[]>(
  fn: (...args: Args) => T,
): (...args: Args) => Result<T, Error> {
  return (...args) => {
    try {
      const data = fn(...args);
      return ok(data);
    } catch (error) {
      if (error instanceof Error) {
        return err(error);
      }
      // Preserve original error details by attaching as cause
      const errorObj = new Error(String(error));
      // Type-safe extension of Error object
      Object.defineProperty(errorObj, "original", {
        value: error,
        writable: false,
        enumerable: false,
        configurable: false,
      });
      return err(errorObj);
    }
  };
}

/**
 * Combine multiple Results into a single Result with array of data
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
  const data: T[] = [];

  for (const result of results) {
    if (isErr(result)) {
      return result as Result<T[], E>;
    }
    if (isOk(result)) {
      data.push(result.data);
    }
  }

  return ok(data);
}

/**
 * Return the first success Result, or the last error if all fail
 */
export function any<T, E>(results: Result<T, E>[]): Result<T, E[]> {
  const errors: E[] = [];

  for (const result of results) {
    if (isOk(result)) {
      return result as Result<T, E[]>;
    }
    if (isErr(result)) {
      errors.push(result.error);
    }
  }

  return err(errors);
}

/**
 * Database operation result types
 */
export type DbResult<T> = Result<
  T,
  {
    code: string;
    message: string;
    details?: unknown;
  }
>;

/**
 * API response result types
 */
export type ApiResult<T> = Result<
  T,
  {
    status: number;
    message: string;
    code?: string;
    details?: unknown;
  }
>;

/**
 * Validation result types
 */
export type ValidationResult<T> = Result<
  T,
  {
    field: string | undefined;
    message: string;
    code: string;
  }
>;

/**
 * Helper to create database error
 */
export function dbError(code: string, message: string, details?: unknown): DbResult<never> {
  return err({ code, message, details });
}

/**
 * Helper to create API error
 */
export function apiError(
  status: number,
  message: string,
  code?: string,
  details?: unknown,
): ApiResult<never> {
  return err({ status, message, code: code ?? "", details });
}

/**
 * Helper to create validation error
 */
export function validationError(
  message: string,
  code: string,
  field?: string,
): ValidationResult<never> {
  return err({ field, message, code });
}
