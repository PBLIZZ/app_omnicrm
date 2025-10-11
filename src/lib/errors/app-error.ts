/**
 * Simple, Unified AppError System
 *
 * Replaces complex error classification with minimal complexity approach.
 */

import { err, type Result } from "@/lib/utils/result";
import { ErrorCategory } from "@/lib/constants/errorCategories";

export class AppError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly retryable: boolean;
  public readonly details?: unknown;

  constructor(
    message: string,
    code: string,
    category: ErrorCategory,
    retryable: boolean,
    details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.category = category;
    this.retryable = retryable;
    this.details = details;
  }
}

export class ErrorHandler {
  /**
   * Create a new AppError with specified properties
   */
  static create(message: string, code: string, category: ErrorCategory): AppError {
    return new AppError(
      message,
      code,
      category,
      category === "network" || category === "system",
      undefined,
    );
  }

  /**
   * Convert any error to standardized AppError format
   */
  static fromError(error: unknown): AppError {
    if (error instanceof Error) {
      return new AppError(error.message, "GENERIC_ERROR", "system", true, { originalError: error });
    }
    return new AppError(String(error), "UNKNOWN_ERROR", "system", false, { originalValue: error });
  }

  /**
   * Convert AppError to Result type for type-safe error handling
   */
  static toResult<T>(error: AppError): Result<T, AppError> {
    return err(error);
  }

  /**
   * Check if an error is retryable based on category and explicit flag
   */
  static isRetryable(error: AppError): boolean {
    return error.retryable;
  }

  /**
   * Create auth-specific error
   */
  static authError(message: string, code = "AUTH_ERROR"): AppError {
    return new AppError(message, code, "authentication", true);
  }

  /**
   * Create network-specific error
   */
  static networkError(message: string, code = "NETWORK_ERROR"): AppError {
    return new AppError(message, code, "network", true);
  }

  /**
   * Create validation-specific error
   */
  static validationError(message: string, code = "VALIDATION_ERROR"): AppError {
    return new AppError(message, code, "validation", false);
  }

  /**
   * Create system-specific error
   */
  static systemError(message: string, code = "SYSTEM_ERROR"): AppError {
    return new AppError(message, code, "system", true);
  }
}
