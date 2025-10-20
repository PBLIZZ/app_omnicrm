/**
 * Error Sanitization Utilities
 *
 * Provides secure error handling that prevents information leakage while maintaining
 * useful debugging information for developers.
 */

import { AppError } from "@/lib/errors/app-error";

export interface SanitizedError {
  message: string;
  code: string;
  category: string;
  timestamp: string;
  requestId?: string | undefined;
}

export interface ErrorContext {
  userId?: string;
  requestId?: string;
  operation: string;
  endpoint?: string;
  userAgent?: string;
  ip?: string;
}

/**
 * Sanitizes error messages to prevent information leakage
 */
export function sanitizeErrorMessage(error: unknown, _context?: ErrorContext): string {
  if (error instanceof AppError) {
    // AppError messages are already safe for user consumption
    return error.message;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Check for sensitive patterns that should be sanitized
    const sensitivePatterns = [
      /password/i,
      /token/i,
      /secret/i,
      /key/i,
      /credential/i,
      /auth/i,
      /database/i,
      /connection/i,
      /sql/i,
      /query/i,
      /table/i,
      /column/i,
      /schema/i,
      /migration/i,
      /env/i,
      /config/i,
      /file path/i,
      /directory/i,
      /permission/i,
      /access denied/i,
      /unauthorized/i,
      /forbidden/i,
      /internal/i,
      /server/i,
      /system/i,
      /stack trace/i,
      /at \w+\.\w+/i, // Stack trace patterns
      /Error: /i,
      /TypeError: /i,
      /ReferenceError: /i,
      /SyntaxError: /i,
    ];

    // Allow validation errors that don't contain sensitive information
    if (error.name === "ValidationError" || error.name === "ZodError") {
      // Check if the message contains sensitive patterns
      if (sensitivePatterns.some((pattern) => pattern.test(message))) {
        return "An unexpected error occurred. Please try again.";
      }
      return error.message;
    }

    // If message contains sensitive information, return generic message
    if (sensitivePatterns.some((pattern) => pattern.test(message))) {
      return "An unexpected error occurred. Please try again.";
    }

    // For other errors, return generic message
    return "An unexpected error occurred. Please try again.";
  }

  return "An unexpected error occurred. Please try again.";
}

/**
 * Creates a sanitized error response for API endpoints
 */
export function createSanitizedErrorResponse(
  error: unknown,
  context?: ErrorContext,
): SanitizedError {
  const sanitizedMessage = sanitizeErrorMessage(error, context);

  if (error instanceof AppError) {
    return {
      message: sanitizedMessage,
      code: error.code,
      category: error.category,
      timestamp: new Date().toISOString(),
      requestId: context?.requestId,
    };
  }

  // Generate a unique error code for tracking
  const errorCode = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    message: sanitizedMessage,
    code: errorCode,
    category: "system",
    timestamp: new Date().toISOString(),
    requestId: context?.requestId,
  };
}

/**
 * Determines if an error should be logged with full details
 */
export function shouldLogErrorDetails(error: unknown): boolean {
  if (error instanceof AppError) {
    // Log AppError details for debugging
    return true;
  }

  if (error instanceof Error) {
    // Don't log sensitive error details
    const message = error.message.toLowerCase();
    const sensitivePatterns = [/password/i, /token/i, /secret/i, /key/i, /credential/i];

    return !sensitivePatterns.some((pattern) => pattern.test(message));
  }

  return true;
}

/**
 * Extracts safe error details for logging
 */
export function extractSafeErrorDetails(error: unknown): Record<string, unknown> {
  if (error instanceof AppError) {
    return {
      name: error.name,
      code: error.code,
      category: error.category,
      retryable: error.retryable,
      message: error.message,
      stack: error.stack,
    };
  }

  if (error instanceof Error) {
    const details: Record<string, unknown> = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };

    // Preserve custom properties that might be useful for debugging
    // but only include safe, non-sensitive properties
    const safeCustomProps = ["status", "code", "category", "retryable"];
    for (const prop of safeCustomProps) {
      if (prop in error && typeof error[prop as keyof Error] !== "function") {
        details[prop] = error[prop as keyof Error];
      }
    }

    return details;
  }

  return {
    type: typeof error,
    value: String(error),
  };
}

/**
 * Creates a safe error message for different environments
 */
export function getEnvironmentSafeErrorMessage(
  error: unknown,
  isDevelopment: boolean = process.env.NODE_ENV === "development",
): string {
  if (isDevelopment) {
    // In development, show more details for debugging
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  // In production, always sanitize
  return sanitizeErrorMessage(error);
}
