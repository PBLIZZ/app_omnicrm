/**
 * Unified API Type System
 *
 * Consolidates all API response types from:
 * - src/server/utils/api-helpers.ts
 * - src/lib/api-client.ts
 * - src/lib/validation/schemas/http.ts
 *
 * Single source of truth for API response patterns
 */

// ============================================================================
// CORE API RESPONSE TYPES
// ============================================================================

/**
 * Successful API response
 */
export interface ApiSuccessResponse<T> {
  ok: true;
  data: T;
  requestId?: string;
  timestamp?: string;
  message?: string;
}

/**
 * Error API response
 */
export interface ApiErrorResponse {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
  requestId?: string;
  timestamp?: string;
}

/**
 * Main API response type - discriminated union for type safety
 */
export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standardized API Error Codes
 */
export const API_ERROR_CODES = {
  // Client Errors (4xx)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  VALIDATION_FAILED: "VALIDATION_FAILED", // Legacy compatibility
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND", // Legacy compatibility
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",

  // Server Errors (5xx)
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  INTEGRATION_ERROR: "INTEGRATION_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

/**
 * HTTP status code mappings for error codes
 */
export const ERROR_STATUS_CODES: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  VALIDATION_FAILED: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  RESOURCE_NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  INTERNAL_ERROR: 500,
  DATABASE_ERROR: 500,
  INTEGRATION_ERROR: 502,
  SERVICE_UNAVAILABLE: 503,
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.ok === true;
}

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.ok === false;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extract data from API response or throw error
 */
export function extractApiData<T>(response: ApiResponse<T>): T {
  if (isApiSuccess(response)) {
    return response.data;
  }

  // Create error with code if available
  const error = new Error(response.error);
  if (response.code) {
    (error as Error & { code: string }).code = response.code;
  }
  if (response.details) {
    (error as Error & { details: unknown }).details = response.details;
  }

  throw error;
}

/**
 * Safe API data extraction with fallback
 */
export function safeExtractApiData<T>(response: ApiResponse<T>, fallback: T): T {
  if (isApiSuccess(response)) {
    return response.data;
  }
  return fallback;
}

// ============================================================================
// PAGINATION TYPES
// ============================================================================

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

export interface ApiRequestOptions extends RequestInit {
  /**
   * Whether to show error toasts automatically (default: true)
   */
  showErrorToast?: boolean;

  /**
   * Custom error message for toasts
   */
  errorToastTitle?: string;

  /**
   * Request timeout in milliseconds
   */
  timeout?: number;

  /**
   * Whether to include CSRF token (default: true)
   */
  includeCsrf?: boolean;
}

// ============================================================================
// CUSTOM ERROR CLASS
// ============================================================================

/**
 * Enhanced API Error class with structured error handling
 */
export class ApiError extends Error {
  constructor(
    public override readonly name = "ApiError",
    public code: ApiErrorCode,
    public override message: string,
    public statusCode: number,
    public details?: unknown,
    public requestId?: string,
  ) {
    super(message);
  }

  /**
   * Create ApiError from ApiErrorResponse
   */
  static fromResponse(response: ApiErrorResponse, statusCode?: number): ApiError {
    return new ApiError(
      "ApiError",
      (response.code as ApiErrorCode) ?? API_ERROR_CODES.INTERNAL_ERROR,
      response.error,
      statusCode ?? ERROR_STATUS_CODES[response.code as ApiErrorCode] ?? 500,
      response.details,
      response.requestId,
    );
  }

  /**
   * Convert to ApiErrorResponse format
   */
  toResponse(): ApiErrorResponse {
    const response: ApiErrorResponse = {
      ok: false,
      error: this.message,
      code: this.code,
      timestamp: new Date().toISOString(),
    };

    if (this.details !== undefined) {
      response.details = this.details;
    }

    if (this.requestId !== undefined) {
      response.requestId = this.requestId;
    }

    return response;
  }
}
