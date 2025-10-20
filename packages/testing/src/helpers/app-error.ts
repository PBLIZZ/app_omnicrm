/**
 * @fileoverview AppError Test Helpers
 *
 * Utilities for testing AppError instances in service and route tests.
 */

import { expect } from "vitest";
import { AppError } from "@/lib/errors/app-error";
import type { ErrorCategory } from "@/lib/constants/errorCategories";

/**
 * Type guard to check if an error is an AppError
 */
function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Expected AppError properties
 */
export interface ExpectedAppError {
  message?: string;
  code?: string;
  category?: ErrorCategory;
  retryable?: boolean;
  details?: unknown;
}

/**
 * Asserts that a value is an AppError and that its selected properties match the provided expectations.
 *
 * The `expected.message` supports `*` as a wildcard (matches any sequence of characters).
 *
 * @param error - The value to validate as an AppError.
 * @param expected - Partial expectations to check on the error (only provided fields are asserted).
 */
export function expectAppError(
  error: unknown,
  expected: ExpectedAppError,
): asserts error is AppError {
  // Check if error is an instance of Error
  expect(error).toBeInstanceOf(Error);

  // Use type guard
  if (!isAppError(error)) {
    throw new Error("Expected AppError but got different error type");
  }

  // Check message if provided
  if (expected.message !== undefined) {
    if (expected.message.includes("*")) {
      // Pattern matching
      const pattern = expected.message.replace(/\*/g, ".*");
      expect(error.message).toMatch(new RegExp(pattern));
    } else {
      expect(error.message).toBe(expected.message);
    }
  }

  // Check error code if provided
  if (expected.code !== undefined) {
    expect(error.code).toBe(expected.code);
  }

  // Check category if provided
  if (expected.category !== undefined) {
    expect(error.category).toBe(expected.category);
  }

  // Check retryable flag if provided
  if (expected.retryable !== undefined) {
    expect(error.retryable).toBe(expected.retryable);
  }

  // Check details if provided
  if (expected.details !== undefined) {
    expect(error.details).toEqual(expected.details);
  }
}

/**
 * Asserts that a promise rejects with an AppError matching the provided expectations.
 *
 * @param promise - The promise expected to reject
 * @param expected - Partial AppError properties to validate against the rejection
 * @throws Throws an Error if the promise resolves instead of rejecting
 */
export async function expectAppErrorRejection(
  promise: Promise<unknown>,
  expected: ExpectedAppError,
): Promise<void> {
  try {
    await promise;
    throw new Error("Expected promise to reject but it resolved");
  } catch (error: unknown) {
    expectAppError(error, expected);
  }
}

/**
 * Create a mock AppError with sensible defaults and optional overrides.
 *
 * Defaults: `message` = "Test error", `code` = "TEST_ERROR", `category` = "validation",
 * `retryable` = false, `details` = undefined.
 *
 * @param props - Partial properties to override the default error fields (`message`, `code`, `category`, `retryable`, `details`)
 * @returns The constructed `AppError` with provided overrides applied
 */
export function createMockAppError(props: Partial<ExpectedAppError> = {}): AppError {
  return new AppError(
    props.message || "Test error",
    props.code || "TEST_ERROR",
    props.category || "validation",
    props.retryable ?? false,
    props.details,
  );
}

/**
 * Common AppError scenarios for testing
 */
export const commonAppErrors = {
  notFound: (resource: string = "Resource"): ExpectedAppError => ({
    code: "NOT_FOUND",
    category: "validation",
    message: `${resource} not found`,
    retryable: false,
  }),

  dbError: (message: string = "Database operation failed"): ExpectedAppError => ({
    code: "DB_ERROR",
    category: "database",
    message,
    retryable: true,
  }),

  validationError: (message: string = "Validation failed"): ExpectedAppError => ({
    code: "VALIDATION_ERROR",
    category: "validation",
    message,
    retryable: false,
  }),

  unauthorized: (): ExpectedAppError => ({
    code: "UNAUTHORIZED",
    category: "authentication",
    message: "Unauthorized",
    retryable: false,
  }),

  forbidden: (): ExpectedAppError => ({
    code: "FORBIDDEN",
    category: "authentication",
    message: "Forbidden",
    retryable: false,
  }),

  serviceUnavailable: (): ExpectedAppError => ({
    code: "SERVICE_UNAVAILABLE",
    category: "network",
    message: "Service unavailable",
    retryable: true,
  }),
};