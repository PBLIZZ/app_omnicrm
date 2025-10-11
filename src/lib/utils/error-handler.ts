/**
 * Centralized error handling utilities
 *
 * This module provides standardized error handling patterns to replace
 * silent catch blocks and improve error visibility and debugging.
 */

import { toast } from "sonner";
import { logger } from "@/lib/observability/unified-logger";

/**
 * Error context for logging and debugging
 */
export interface ErrorContext {
  operation: string;
  userId?: string;
  component?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Options for error handling behavior
 */
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

  // Log error based on level using unified logger
  switch (logLevel) {
    case "debug":
      logger.debug("Error handled", context, normalizedError);
      break;
    case "info":
      logger.info("Error handled", context);
      break;
    case "warn":
      logger.warn("Error handled", context, normalizedError);
      break;
    case "error":
    default:
      logger.error("Error handled", context, normalizedError);
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
  handleError(error, context, {
    showToast: true,
    toastTitle: toastTitle ?? `${context.operation} failed`,
    logLevel: "error",
    rethrow: true,
  });
  // This line should never be reached since rethrow: true always throws
  throw new Error("Unexpected return from handleError with rethrow: true");
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
