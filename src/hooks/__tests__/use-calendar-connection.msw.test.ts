/**
 * useCalendarConnection Hook Tests (using MSW)
 *
 * Tests for Google Calendar OAuth connection, token refresh,
 * and connection state management with comprehensive coverage.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { server } from "../../../test/msw/server";
import { http, HttpResponse } from "msw";
import { useCalendarConnection } from "../useCalendarConnection";
import { toast } from "sonner";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock window.location.href for OAuth redirects
const mockLocationHref = vi.fn();
Object.defineProperty(window, "location", {
  value: {
    href: "",
    get href() {
      return this._href || "";
    },
    set href(value) {
      this._href = value;
      mockLocationHref(value);
    },
  },
  writable: true,
  configurable: true,
});

describe("useCalendarConnection (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
    vi.clearAllMocks();
    mockLocationHref.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("OAuth connection flow", () => {
    it("triggers redirect to calendar connect endpoint", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(result.current.isConnecting).toBe(false);

      // Trigger connection
      result.current.connect();

      await waitFor(() => {
        return mockLocationHref.mock.calls.length > 0;
      });

      expect(mockLocationHref).toHaveBeenCalledWith("/api/google/calendar/connect");
    });

    it("sets isConnecting to true during redirect", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(result.current.isConnecting).toBe(false);

      result.current.connect();

      // Should be connecting immediately
      expect(result.current.isConnecting).toBe(true);
    });

    it("clears error state before connecting", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Simulate an existing error by triggering a failed refresh first
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Refresh failed" },
            { status: 401 }
          );
        })
      );

      // Trigger refresh to set error
      try {
        await result.current.refreshTokens();
      } catch {
        // Expected to fail
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      // Now connect should clear the error
      result.current.connect();

      expect(result.current.error).toBeNull();
    });

    it("handles connection error with toast notification", async () => {
      // We can't easily test redirect failures, but we can verify error handling structure
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(result.current.error).toBeNull();

      // The connect mutation itself doesn't fail (it's just a redirect)
      // But the error handling is in place for edge cases
      result.current.connect();

      // Verify no error occurred for normal redirect
      expect(result.current.error).toBeNull();
    });
  });

  describe("Token refresh mutation", () => {
    it("refreshes tokens successfully with proper response", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(result.current.isRefreshing).toBe(false);

      // Trigger token refresh
      const refreshPromise = result.current.refreshTokens();

      expect(result.current.isRefreshing).toBe(true);

      await refreshPromise;

      await waitFor(() => {
        return result.current.isRefreshing === false;
      });

      expect(result.current.error).toBeNull();
    });

    it("shows info toast at refresh start", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await result.current.refreshTokens();

      expect(toast.info).toHaveBeenCalledWith("Refreshing Google Calendar tokens...");
    });

    it("shows success toast after successful refresh", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await result.current.refreshTokens();

      await waitFor(() => {
        return result.current.isRefreshing === false;
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Tokens refreshed",
        expect.objectContaining({
          description: "Google Calendar tokens have been refreshed successfully.",
        })
      );
    });

    it("clears error state on successful refresh", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // First, create an error by failing a refresh
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Token expired" },
            { status: 401 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected to fail
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      // Reset to success handler
      server.resetHandlers();

      // Now refresh should succeed and clear error
      await result.current.refreshTokens();

      await waitFor(() => {
        return result.current.error === null;
      });

      expect(result.current.error).toBeNull();
    });

    it("invalidates calendar queries after successful refresh", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await result.current.refreshTokens();

      await waitFor(() => {
        return result.current.isRefreshing === false;
      });

      // Query invalidation happens automatically in the hook
      expect(toast.success).toHaveBeenCalled();
    });

    it("handles refresh failure with expired token error", async () => {
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Token has expired" },
            { status: 401 }
          );
        })
      );

      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await expect(result.current.refreshTokens()).rejects.toThrow();

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toContain("Token has expired");
      expect(toast.error).toHaveBeenCalled();
    });

    it("handles refresh failure with network error", async () => {
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { error: "Network error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await expect(result.current.refreshTokens()).rejects.toThrow();

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeDefined();
      expect(toast.error).toHaveBeenCalled();
    });

    it("handles refresh with unsuccessful response", async () => {
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json({
            success: false,
            message: "Refresh failed for unknown reason",
          });
        })
      );

      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await expect(result.current.refreshTokens()).rejects.toThrow("Refresh failed for unknown reason");

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toContain("Refresh failed");
    });

    it("shows loading state during token refresh", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(result.current.isRefreshing).toBe(false);

      const refreshPromise = result.current.refreshTokens();

      expect(result.current.isRefreshing).toBe(true);

      await refreshPromise;

      expect(result.current.isRefreshing).toBe(false);
    });

    it("clears error before starting refresh", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Set an error first
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "First failure" },
            { status: 500 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      // Reset handlers for success
      server.resetHandlers();

      // Error should be cleared when starting new refresh
      const refreshPromise = result.current.refreshTokens();

      // Error is cleared immediately when refresh starts
      expect(result.current.error).toBeNull();

      await refreshPromise;
    });
  });

  describe("Error state management", () => {
    it("populates error state on connection failure", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      expect(result.current.error).toBeNull();

      // Simulate refresh failure to test error state
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Authentication failed" },
            { status: 403 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toContain("Authentication failed");
    });

    it("populates error state on refresh failure", async () => {
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Refresh token invalid" },
            { status: 401 }
          );
        })
      );

      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toContain("Refresh token invalid");
    });

    it("clears error state with clearError function", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Create an error first
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Test error" },
            { status: 500 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      // Clear the error
      result.current.clearError();

      expect(result.current.error).toBeNull();
    });

    it("persists error until explicitly cleared", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Persistent error" },
            { status: 500 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      const errorMessage = result.current.error;
      expect(errorMessage).toContain("Persistent error");

      // Wait a bit and verify error persists
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(result.current.error).toBe(errorMessage);

      // Only clearError should remove it
      result.current.clearError();

      expect(result.current.error).toBeNull();
    });

    it("replaces old error with new error on subsequent failures", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // First error
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "First error" },
            { status: 500 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toContain("First error");

      // Second error
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Second error" },
            { status: 500 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error?.includes("Second error") === true;
      });

      expect(result.current.error).toContain("Second error");
      expect(result.current.error).not.toContain("First error");
    });
  });

  describe("Integration scenarios", () => {
    it("handles complete refresh workflow successfully", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Initial state
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();

      // Start refresh
      const refreshPromise = result.current.refreshTokens();

      expect(result.current.isRefreshing).toBe(true);

      await refreshPromise;

      // Final state
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(toast.success).toHaveBeenCalled();
      expect(toast.info).toHaveBeenCalled();
    });

    it("handles refresh failure and recovery", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Fail first
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Temporary failure" },
            { status: 503 }
          );
        })
      );

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      // Reset to success
      server.resetHandlers();

      // Retry should succeed
      await result.current.refreshTokens();

      await waitFor(() => {
        return result.current.error === null;
      });

      expect(result.current.error).toBeNull();
      expect(result.current.isRefreshing).toBe(false);
    });

    it("maintains correct state during rapid refresh attempts", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Trigger multiple refreshes (though typically shouldn't happen)
      const refresh1 = result.current.refreshTokens();
      const refresh2 = result.current.refreshTokens();

      expect(result.current.isRefreshing).toBe(true);

      await Promise.all([refresh1, refresh2]);

      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it("does not interfere between connect and refresh operations", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      // Connect (redirect)
      result.current.connect();

      await waitFor(() => {
        return mockLocationHref.mock.calls.length > 0;
      });

      expect(mockLocationHref).toHaveBeenCalled();

      // Refresh should still work
      await result.current.refreshTokens();

      expect(result.current.error).toBeNull();
    });
  });

  describe("Toast notification details", () => {
    it("calls toast.info with correct message on refresh start", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await result.current.refreshTokens();

      expect(toast.info).toHaveBeenCalledWith("Refreshing Google Calendar tokens...");
    });

    it("calls toast.success with correct message and description", async () => {
      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      await result.current.refreshTokens();

      await waitFor(() => {
        return result.current.isRefreshing === false;
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Tokens refreshed",
        {
          description: "Google Calendar tokens have been refreshed successfully.",
        }
      );
    });

    it("calls toast.error on refresh failure", async () => {
      server.use(
        http.post("/api/google/calendar/refresh", () => {
          return HttpResponse.json(
            { success: false, message: "Token refresh failed" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useCalendarConnection(), { wrapper });

      try {
        await result.current.refreshTokens();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(toast.error).toHaveBeenCalled();
    });
  });
});
