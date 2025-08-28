import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// Get CSRF token from cookie
function getCsrfToken(): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|; )csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1] ?? "") : "";
}

export async function apiRequest<T = any>(url: string, options: RequestInit = {}): Promise<T> {
  const isUnsafeMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(options.method || "GET");

  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "Content-Type": "application/json",
      ...(isUnsafeMethod && { "x-csrf-token": getCsrfToken() }),
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 429) {
    throw new Error("Rate limit exceeded. Please try again later.");
  }

  if (response.status === 403) {
    const errorData = await response.json().catch(() => ({}));
    if (errorData.error === "missing_csrf" || errorData.error === "invalid_csrf") {
      throw new Error("CSRF token missing or invalid. Please refresh the page.");
    }
  }

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.error) {
        errorMessage = errorData.error;
      }
    } catch {
      // Use default error message if JSON parsing fails
    }
    throw new Error(errorMessage);
  }

  return response.json();
}
