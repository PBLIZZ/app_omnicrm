/**
 * API Error utilities
 *
 * Standardized error classes for API responses with proper HTTP status codes
 */

export class ApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  static notFound(message: string, details?: unknown): ApiError {
    return new ApiError(message, 404, details);
  }

  static badRequest(message: string, details?: unknown): ApiError {
    return new ApiError(message, 400, details);
  }

  static unauthorized(message: string = "Unauthorized", details?: unknown): ApiError {
    return new ApiError(message, 401, details);
  }

  static forbidden(message: string = "Forbidden", details?: unknown): ApiError {
    return new ApiError(message, 403, details);
  }

  static internalServerError(
    message: string = "Internal Server Error",
    details?: unknown,
  ): ApiError {
    return new ApiError(message, 500, details);
  }
}
