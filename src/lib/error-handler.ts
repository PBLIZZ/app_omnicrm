/**
 * Centralized error handling utilities
 *
 * This module provides standardized error handling patterns to replace
 * silent catch blocks and improve error visibility and debugging.
 */

import { toast } from "sonner";

export interface ErrorContext {
  operation: string;
  userId?: string;
  contactId?: string;
  component?: string;
  additionalData?: Record<string, unknown>;
}

export interface ErrorHandlingOptions {
  showToast?: boolean;
  toastTitle?: string;
  logLevel?: "debug" | "info" | "warn" | "error";
  fallbackValue?: unknown;
  rethrow?: boolean;
}

/**
 * Standardized error handler for catch blocks
 */
export function handleError(
  error: unknown,
  context: ErrorContext,
  options: ErrorHandlingOptions = {},
): never | unknown {
  const {
    showToast = false,
    toastTitle = "Operation failed",
    logLevel = "error",
    fallbackValue,
    rethrow = true,
  } = options;

  // Normalize error to a proper Error object
  const normalizedError =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "Unknown error occurred");

  // Create structured error log
  const errorLog = {
    error: normalizedError.message,
    stack: normalizedError.stack,
    context,
    timestamp: new Date().toISOString(),
  };

  // Log error based on level
  switch (logLevel) {
    case "debug":
      console.error("Error handled (debug):", errorLog);
      break;
    case "info":
      console.error("Error handled (info):", errorLog);
      break;
    case "warn":
      console.warn("Error handled:", errorLog);
      break;
    case "error":
    default:
      console.error("Error handled:", errorLog);
      break;
  }

  // Show toast notification if requested
  if (showToast) {
    toast.error(toastTitle, {
      description: normalizedError.message,
    });
  }

  // Return fallback value or rethrow
  if (fallbackValue !== undefined && !rethrow) {
    return fallbackValue;
  }

  if (rethrow) {
    throw normalizedError;
  }

  return fallbackValue;
}

/**
 * Error handler for async operations that should not crash the app
 */
export function handleAsyncError(
  error: unknown,
  context: ErrorContext,
  fallbackValue?: unknown,
): unknown {
  return handleError(error, context, {
    showToast: false,
    logLevel: "warn",
    fallbackValue,
    rethrow: false,
  });
}

/**
 * Error handler for user-facing operations
 */
export function handleUserError(error: unknown, context: ErrorContext, toastTitle?: string): never {
  return handleError(error, context, {
    showToast: true,
    toastTitle: toastTitle ?? `${context.operation} failed`,
    logLevel: "error",
    rethrow: true,
  });
}

/**
 * Error handler for background/service operations
 */
export function handleServiceError(
  error: unknown,
  context: ErrorContext,
  fallbackValue?: unknown,
): unknown {
  return handleError(error, context, {
    showToast: false,
    logLevel: "error",
    fallbackValue,
    rethrow: fallbackValue === undefined,
  });
}

/**
 * Wrapper function for async operations with error handling
 */
export async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: ErrorContext,
  options?: ErrorHandlingOptions,
): Promise<T | unknown> {
  try {
    return await operation();
  } catch (error) {
    return handleError(error, context, options);
  }
}

/**
 * Type guard for checking if a value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}

/**
 * Extract error message from unknown error value
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unknown error occurred";
}

/**
 * Create a structured error with additional context
 */
export class ContextualError extends Error {
  public readonly context: ErrorContext;
  public readonly originalError: unknown;

  constructor(message: string, context: ErrorContext, originalError?: unknown) {
    super(message);
    this.name = "ContextualError";
    this.context = context;
    this.originalError = originalError;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ContextualError);
    }
  }
}
