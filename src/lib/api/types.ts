/**
 * Unified API Type System
 * Single source of truth for API response patterns
 */


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
// API RESPONSE TYPES
// ============================================================================

/**
 * Success response envelope
 */
export interface OkEnvelope<T> {
  ok: true;
  data: T;
}

/**
 * Error response envelope
 */
export interface ErrorEnvelope {
  ok: false;
  error: string;
  details?: unknown;
}

/**
 * Union type for API responses
 */
export type ApiResponse<T> = OkEnvelope<T> | ErrorEnvelope;


// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if API response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is OkEnvelope<T> {
  return response.ok === true;
}

/**
 * Type guard to check if API response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ErrorEnvelope {
  return response.ok === false;
}
