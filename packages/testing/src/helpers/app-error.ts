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
 * Asserts that a promise rejects with an AppError matching the provided expectations.
 *
 * @param promise - The promise expected to reject
 * @param expected - Partial AppError properties to validate against the rejection
 * @throws Throws an Error if the promise resolves instead of rejecting
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
 * Create a mock AppError with sensible defaults and optional overrides.
 *
 * Defaults: `message` = "Test error", `code` = "TEST_ERROR", `category` = "validation",
 * `statusCode` = 500, `isOperational` = true.
 *
 * @param props - Partial properties to override the default error fields (`message`, `code`, `category`, `statusCode`, `isOperational`)
 * @returns The constructed `AppError` with provided overrides applied
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