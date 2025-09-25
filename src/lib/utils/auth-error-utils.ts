// Utility functions for handling authentication errors

/**
 * Type guard to check if an error is an authentication error
 * @param error - The error to check
 * @returns true if the error is an authentication error
 */
export function isAuthError(error: unknown): error is Error & { status?: number; statusCode?: number } {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithStatus = error as Error & { status?: number; statusCode?: number };
  const status = errorWithStatus.status || errorWithStatus.statusCode;

  return (
    status === 401 ||
    error.name === "Unauthorized" ||
    error.message.includes("Unauthorized") ||
    error.message.includes("401")
  );
}

/**
 * Check if an error is a validation error (ZodError)
 * @param error - The error to check
 * @returns true if the error is a validation error
 */
export function isValidationError(error: unknown): error is import("zod").ZodError {
  return error instanceof Error && error.name === "ZodError";
}

/**
 * Extract error message safely
 * @param error - The error to extract message from
 * @returns The error message or "Unknown error"
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}
