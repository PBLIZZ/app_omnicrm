/**
 * Direct API Client (No Abstractions)
 *
 * Features:
 * - Direct envelope pattern ({ ok, data } | { ok, error })
 * - Automatic CSRF token handling
 * - Automatic error toasting with Sonner
 * - Convenience methods: get(), post(), put(), delete()
 * - Request timeout support
 * - Type-safe responses
 */

import { toast } from "sonner";

// ============================================================================
// CSRF TOKEN UTILITIES
// ============================================================================

/**
 * Gets CSRF token from cookie (browser only)
 */
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1] ?? "") : "";
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
// CORE API CLIENT
// ============================================================================

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

  /**
   * Whether to include CSRF token (default: true)
   */
  includeCsrf?: boolean;
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
    includeCsrf = true,
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

  // Add CSRF token if enabled and request is mutating
  const method = fetchOptions.method?.toUpperCase() ?? "GET";
  const isMutatingRequest = ["POST", "PUT", "PATCH", "DELETE"].includes(method);

  if (includeCsrf && isMutatingRequest) {
    const csrfToken = getCsrfToken();
    if (csrfToken) {
      (headers as Record<string, string>)["x-csrf-token"] = csrfToken;
    } else if (process.env.NODE_ENV === "development") {
      console.warn(
        `No CSRF token found in cookies for ${method} request. This may cause authentication issues.`,
      );
    }
  }

  // Add content-type for requests with body
  if (
    fetchOptions.body &&
    fetchOptions.method &&
    ["POST", "PUT", "PATCH"].includes(fetchOptions.method.toUpperCase())
  ) {
    (headers as Record<string, string>)["content-type"] = "application/json";
  }

  try {
    // Make the request
    const response = await fetch(url, {
      credentials: "same-origin",
      ...fetchOptions,
      headers,
      signal: finalSignal,
    });

    // Handle HTTP errors
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      const error = new Error(errorText || response.statusText);
      throw error;
    }

    // Parse response
    const responseData = (await response.json()) as unknown;

    // Check if response is in envelope format (direct pattern)
    if (responseData && typeof responseData === "object" && "ok" in responseData) {
      const envelope = responseData as { ok: boolean; data?: T; error?: string; details?: unknown };

      // Handle API envelope errors
      if (!envelope.ok) {
        const error = new Error(envelope.error ?? "Unknown error");
        throw error;
      }

      return envelope.data as T;
    }

    // Response is direct JSON, return as-is
    return responseData as T;
  } catch (error) {
    // Handle different error types
    let finalError: Error;

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        finalError = new Error(
          timeout ? `Request timeout after ${timeout}ms` : "Request was aborted"
        );
      } else {
        // Use the error as-is
        finalError = error;
      }
    } else {
      finalError = new Error("Unknown error occurred");
    }

    // Show error toast if enabled
    if (showErrorToast) {
      toast.error(errorToastTitle, {
        description: finalError.message,
      });
    }

    throw finalError;
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
  return apiRequest<T>(url, { includeCsrf: false, ...options, method: "GET" });
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
      console.error("API request failed, using fallback:", error);
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
