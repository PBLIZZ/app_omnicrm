/**
 * Centralized API utilities for handling typed responses with OkEnvelope pattern
 */

import { toast } from "sonner";

export type OkEnvelope<T> = { ok: true; data: T } | { ok: false; error: string; details?: unknown };

/**
 * Gets CSRF token from cookie
 */
function getCsrf(): string {
  if (typeof document === "undefined") return "";
  const m = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return m ? decodeURIComponent(m[1] ?? "") : "";
}

export interface FetchOptions extends RequestInit {
  /**
   * Whether to show error toasts automatically (default: true)
   */
  showErrorToast?: boolean;
  /**
   * Custom error message for toasts
   */
  errorToastTitle?: string;
}

/**
 * Centralized fetch wrapper that handles OkEnvelope responses and error handling
 */
export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const { showErrorToast = true, errorToastTitle = "Request failed", ...fetchOptions } = options;

  // Default headers with CSRF token
  const defaultHeaders: HeadersInit = {
    "x-csrf-token": getCsrf(),
    credentials: "same-origin",
  };

  // Merge headers
  const headers = {
    ...defaultHeaders,
    ...(fetchOptions.headers ?? {}),
  };

  // Add content-type for POST/PUT/PATCH requests with body
  if (
    fetchOptions.body &&
    fetchOptions.method &&
    ["POST", "PUT", "PATCH"].includes(fetchOptions.method.toUpperCase())
  ) {
    (headers as Record<string, string>)["content-type"] = "application/json";
  }

  try {
    const res = await fetch(url, {
      credentials: "same-origin",
      ...fetchOptions,
      headers,
    });

    // Handle non-200 responses
    if (!res.ok) {
      const errorText = await res.text().catch(() => res.statusText);
      throw new Error(errorText);
    }

    const envelope = (await res.json()) as OkEnvelope<T>;

    // Handle envelope errors
    if (!envelope.ok) {
      throw new Error(envelope.error);
    }

    return envelope.data;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Show error toast if enabled
    if (showErrorToast) {
      toast.error(errorToastTitle, {
        description: errorMessage,
      });
    }

    // Re-throw for caller to handle if needed
    throw error;
  }
}

/**
 * Convenience wrapper for GET requests
 */
export async function fetchGet<T>(url: string, options: FetchOptions = {}): Promise<T> {
  return fetchJson<T>(url, { ...options, method: "GET" });
}

/**
 * Convenience wrapper for POST requests
 */
export async function fetchPost<T>(
  url: string,
  data: unknown,
  options: FetchOptions = {},
): Promise<T> {
  return fetchJson<T>(url, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });
}

/**
 * Convenience wrapper for PUT requests
 */
export async function fetchPut<T>(
  url: string,
  data: unknown,
  options: FetchOptions = {},
): Promise<T> {
  return fetchJson<T>(url, {
    ...options,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

/**
 * Convenience wrapper for DELETE requests
 */
export async function fetchDelete<T>(url: string, options: FetchOptions = {}): Promise<T> {
  return fetchJson<T>(url, { ...options, method: "DELETE" });
}

/**
 * Build URL with query parameters
 */
export function buildUrl(
  baseUrl: string,
  params: Record<string, string | number | boolean | null | undefined> = {},
): string {
  const url = new URL(baseUrl, window.location.origin);

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
