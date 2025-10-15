/**
 * @fileoverview AppError Test Helpers
 *
 * Utilities for testing AppError instances in service and route tests.
 */

import { expect } from "vitest";
import type { AppError } from "@/lib/errors/app-error";

/**
 * Expected AppError properties
 */
export interface ExpectedAppError {
  message?: string;
  code?: string;
  category?: "validation" | "database" | "api" | "security" | "business_logic";
  statusCode?: number;
  isOperational?: boolean;
}

/**
 * Validates that an error is an AppError with expected properties
 *
 * @example
 * ```typescript
 * try {
 *   await someService();
 * } catch (error) {
 *   expectAppError(error, {
 *     code: 'NOT_FOUND',
 *     statusCode: 404,
 *     category: 'validation'
 *   });
 * }
 * ```
 */
export function expectAppError(
  error: unknown,
  expected: ExpectedAppError,
): asserts error is AppError {
  // Check if error is an instance of Error
  expect(error).toBeInstanceOf(Error);

  const err = error as AppError;

  // Check message if provided
  if (expected.message !== undefined) {
    if (expected.message.includes("*")) {
      // Pattern matching
      const pattern = expected.message.replace(/\*/g, ".*");
      expect(err.message).toMatch(new RegExp(pattern));
    } else {
      expect(err.message).toBe(expected.message);
    }
  }

  // Check error code if provided
  if (expected.code !== undefined) {
    expect(err.code).toBe(expected.code);
  }

  // Check category if provided
  if (expected.category !== undefined) {
    expect(err.category).toBe(expected.category);
  }

  // Check status code if provided
  if (expected.statusCode !== undefined) {
    expect(err.statusCode).toBe(expected.statusCode);
  }

  // Check operational flag if provided
  if (expected.isOperational !== undefined) {
    expect(err.isOperational).toBe(expected.isOperational);
  }
}

/**
 * Validates that a promise rejects with an AppError
 *
 * @example
 * ```typescript
 * await expectAppErrorRejection(
 *   someService(),
 *   { code: 'DB_ERROR', statusCode: 500 }
 * );
 * ```
 */
export async function expectAppErrorRejection(
  promise: Promise<any>,
  expected: ExpectedAppError,
): Promise<void> {
  try {
    await promise;
    throw new Error("Expected promise to reject but it resolved");
  } catch (error) {
    expectAppError(error, expected);
  }
}

/**
 * Creates a mock AppError for testing
 *
 * @example
 * ```typescript
 * const mockError = createMockAppError({
 *   message: 'Not found',
 *   code: 'NOT_FOUND',
 *   statusCode: 404
 * });
 * ```
 */
export function createMockAppError(props: Partial<ExpectedAppError> = {}): AppError {
  const error = new Error(props.message || "Test error") as AppError;
  error.code = props.code || "TEST_ERROR";
  error.category = props.category || "validation";
  error.statusCode = props.statusCode || 500;
  error.isOperational = props.isOperational ?? true;
  return error;
}

/**
 * Common AppError scenarios for testing
 */
export const commonAppErrors = {
  notFound: (resource: string = "Resource"): ExpectedAppError => ({
    code: "NOT_FOUND",
    statusCode: 404,
    category: "validation",
    message: `${resource} not found`,
  }),

  dbError: (message: string = "Database operation failed"): ExpectedAppError => ({
    code: "DB_ERROR",
    statusCode: 500,
    category: "database",
    message,
  }),

  validationError: (message: string = "Validation failed"): ExpectedAppError => ({
    code: "VALIDATION_ERROR",
    statusCode: 400,
    category: "validation",
    message,
  }),

  unauthorized: (): ExpectedAppError => ({
    code: "UNAUTHORIZED",
    statusCode: 401,
    category: "security",
    message: "Unauthorized",
  }),

  forbidden: (): ExpectedAppError => ({
    code: "FORBIDDEN",
    statusCode: 403,
    category: "security",
    message: "Forbidden",
  }),

  serviceUnavailable: (): ExpectedAppError => ({
    code: "SERVICE_UNAVAILABLE",
    statusCode: 503,
    category: "api",
    message: "Service unavailable",
  }),
};
