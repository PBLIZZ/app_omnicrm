/**
 * Safe JSON type for replacing 'any' in API responses and data handling
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | Json[]
  | { [key: string]: Json };

/**
 * Type guard to check if a value is a valid JSON value
 */
export function isJson(value: unknown): value is Json {
  if (value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJson);
  }

  if (typeof value === 'object' && value !== null) {
    return Object.values(value).every(isJson);
  }

  return false;
}

/**
 * Safe error type for error handling
 */
export type SafeError = {
  message: string;
  name: string | undefined;
  stack: string | undefined;
  cause: unknown | undefined;
};

/**
 * Type guard for Error objects
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Convert unknown error to SafeError
 */
export function toSafeError(error: unknown): SafeError {
  if (isError(error)) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack ?? undefined,
      cause: error.cause ?? undefined,
    };
  }

  if (typeof error === 'string') {
    return {
      message: error,
      name: undefined,
      stack: undefined,
      cause: undefined,
    };
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    return {
      message: String(error.message),
      name: 'name' in error ? String(error.name) : undefined,
      stack: undefined,
      cause: undefined,
    };
  }

  return {
    message: 'Unknown error occurred',
    name: undefined,
    stack: undefined,
    cause: undefined,
  };
}