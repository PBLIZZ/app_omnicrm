/**
 * Direct API Client (No Abstractions)
 *
 * Features:
 * - Automatic CSRF token handling
 * - Automatic error toasting with Sonner
 * - Convenience methods: get(), post(), put(), delete()
 * - Request timeout support
 * - Type-safe responses
 */

import { toast } from "sonner";

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guard to check if a value is a record (plain object)
 */
function isRecord(x: unknown): x is Record<string, unknown> {
  return x !== null && typeof x === "object" && !Array.isArray(x);
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string | undefined;
  public readonly details: unknown;

  constructor(message: string, status: number = 0, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// REQUEST TIMEOUT HANDLING
// ============================================================================

/**
 * Create AbortController with timeout
 */
function createTimeoutController(timeoutMs?: number): AbortController {
  const controller = new AbortController();

  if (timeoutMs && timeoutMs > 0) {
    setTimeout(() => {
      if (!controller.signal.aborted) {
        controller.abort(new Error(`Request timeout after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  }

  return controller;
}

// ============================================================================
// DIRECT REQUEST OPTIONS (no abstraction)
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
}

/**
 * Enhanced fetch wrapper with unified error handling and type safety
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    showErrorToast = true,
    errorToastTitle = "Request failed",
    timeout,
    ...fetchOptions
  } = options;

  // Create timeout controller
  const timeoutController = createTimeoutController(timeout);
  const existingSignal = fetchOptions.signal;

  // Combine timeout signal with any existing signal
  let finalSignal: AbortSignal = timeoutController.signal;
  if (existingSignal) {
    if (existingSignal.aborted) {
      throw new Error("Request was aborted before sending");
    }

    // Create combined signal that aborts when either signal aborts
    const combinedController = new AbortController();

    const abortListener = (): void => {
      combinedController.abort(existingSignal.reason);
    };

    const timeoutListener = (): void => {
      combinedController.abort(timeoutController.signal.reason);
    };

    existingSignal.addEventListener("abort", abortListener, { once: true });
    timeoutController.signal.addEventListener("abort", timeoutListener, { once: true });

    finalSignal = combinedController.signal;
  }

  // Build headers
  const headers: HeadersInit = {
    credentials: "same-origin",
    ...fetchOptions.headers,
  };

  // Add content-type for requests with body
  if (
    fetchOptions.body &&
    fetchOptions.method &&
    ["POST", "PUT", "PATCH"].includes(fetchOptions.method.toUpperCase())
  ) {
    (headers as Record<string, string>)["content-type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...fetchOptions,
      headers,
      signal: finalSignal,
    });

    if (!response.ok) {
      const rawBody = await response
        .clone()
        .text()
        .catch(() => "");

      let parsedBody: unknown = undefined;
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          parsedBody = rawBody;
        }
      }

      // Safe extraction of error details without type assertions
      const message =
        (() => {
          // Check if parsedBody is a record and has message or error properties
          if (isRecord(parsedBody) && "message" in parsedBody && typeof parsedBody["message"] === "string") {
            return parsedBody["message"];
          }
          if (isRecord(parsedBody) && "error" in parsedBody && typeof parsedBody["error"] === "string") {
            return parsedBody["error"];
          }
          return undefined;
        })() ||
        (typeof rawBody === "string" && rawBody.trim().length > 0 ? rawBody : undefined) ||
        response.statusText ||
        "Request failed";

      const code =
        (() => {
          // Check if parsedBody is a record and has code property
          if (isRecord(parsedBody) && "code" in parsedBody && typeof parsedBody["code"] === "string") {
            return parsedBody["code"];
          }
          return undefined;
        })();

      throw new ApiError(message, response.status, code, parsedBody ?? rawBody);
    }

    if (response.status === 204 || response.headers.get("content-length") === "0") {
      return undefined as T;
    }

    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      return (await response.json()) as T;
    }

    const textBody = await response.text();
    return textBody as unknown as T;
  } catch (error) {
    let apiError: ApiError;

    if (error instanceof ApiError) {
      apiError = error;
    } else if (error instanceof Error && error.name === "AbortError") {
      apiError = new ApiError(
        timeout ? `Request timeout after ${timeout}ms` : "Request was aborted",
        499,
        undefined,
        error,
      );
    } else if (error instanceof Error) {
      apiError = new ApiError(error.message, 0, undefined, error);
    } else {
      apiError = new ApiError("Unknown error occurred", 0, undefined, { originalError: error });
    }

    if (showErrorToast) {
      toast.error(errorToastTitle, {
        description: apiError.message,
      });
    }

    throw apiError;
  }
}

// ============================================================================
// CONVENIENCE METHODS
// ============================================================================

/**
 * GET request
 */
export async function get<T = unknown>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  // GET requests typically don't need CSRF tokens
  return apiRequest<T>(url, { ...options, method: "GET" });
}

/**
 * POST request with JSON body
 */
export async function post<T = unknown>(
  url: string,
  data: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * PUT request with JSON body
 */
export async function put<T = unknown>(
  url: string,
  data: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * PATCH request with JSON body
 */
export async function patch<T = unknown>(
  url: string,
  data: unknown,
  options: ApiRequestOptions = {},
): Promise<T> {
  return apiRequest<T>(url, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export async function del<T = unknown>(url: string, options: ApiRequestOptions = {}): Promise<T> {
  return apiRequest<T>(url, { ...options, method: "DELETE" });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Build URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const url = new URL(baseUrl, typeof window !== "undefined" ? window.location.origin : undefined);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      if (typeof value === "object") {
        url.searchParams.set(key, JSON.stringify(value));
      } else {
        url.searchParams.set(key, String(value));
      }
    }
  });

  return url.toString();
}

/**
 * Safe API request with fallback value
 */
export async function safeRequest<T>(
  requestFn: () => Promise<T>,
  fallback: T,
  options: {
    showErrorToast?: boolean;
    logError?: boolean;
  } = {},
): Promise<T> {
  const { showErrorToast = false, logError = true } = options;

  try {
    return await requestFn();
  } catch (error) {
    if (logError) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      console.error("API request failed, using fallback", { operation: "safe_request" }, errorInstance);
    }

    if (showErrorToast && error instanceof Error) {
      toast.error("Request failed", {
        description: error.message,
      });
    }

    return fallback;
  }
}

// ============================================================================
// UNIFIED API CLIENT OBJECT
// ============================================================================

/**
 * Main API client object with all HTTP methods
 */
export const apiClient = {
  get,
  post,
  put,
  patch,
  delete: del,
  request: apiRequest,
  buildUrl,
  safeRequest,
};
