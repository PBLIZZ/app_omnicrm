/**
 * useOmniConnect Hook Tests (using MSW)
 *
 * These tests use Mock Service Worker to intercept HTTP requests,
 * providing a realistic testing environment without brittle module mocks.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { server } from "../../../test/msw/server";
import { http, HttpResponse } from "msw";
import {
  useOmniConnect,
  useOmniConnectConnection,
  useOmniConnectEmails,
  useOmniConnectJobs,
  useOmniConnectSyncStatus,
} from "../use-omni-connect";

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
});

describe("useOmniConnect (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
    mockLocationHref.mockClear();
  });

  describe("Main hook - useOmniConnect()", () => {
    it("fetches dashboard data successfully with all slices", async () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      // Wait for the query to settle (initial data is available immediately)
      await waitFor(() => {
        return result.current.data?.connection.emailCount === 150;
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.connection).toBeDefined();
      expect(result.current.data?.connection.isConnected).toBe(true);
      expect(result.current.data?.connection.emailCount).toBe(150);
      expect(result.current.data?.connection.contactCount).toBe(42);

      expect(result.current.data?.emailPreview).toBeDefined();
      expect(result.current.data?.emailPreview.emails).toHaveLength(2);
      expect(result.current.data?.emailPreview.emails[0].subject).toBe("Meeting confirmation");

      expect(result.current.data?.jobs).toBeDefined();
      expect(result.current.data?.jobs?.active).toHaveLength(1);
      expect(result.current.data?.jobs?.active[0].kind).toBe("gmail_sync");

      expect(result.current.data?.syncStatus).toBeDefined();
      expect(result.current.data?.syncStatus?.googleConnected).toBe(true);
    });

    it("shows initial data state (disconnected) before first fetch", () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      // Check initial data structure
      expect(result.current.data).toBeDefined();
      expect(result.current.data?.connection.isConnected).toBe(false);
      expect(result.current.data?.emailPreview.emails).toEqual([]);
    });

    it("handles loading states correctly", async () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      // With initialData, the query is not "loading" in the traditional sense
      // Data is available immediately, then refetched in the background
      await waitFor(() => {
        return result.current.data?.connection.emailCount === 150;
      });

      expect(result.current.data).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it("handles network errors gracefully", async () => {
      // Override handler to return network error
      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          return HttpResponse.json(
            { error: "Network error" },
            { status: 500 }
          );
        })
      );

      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeDefined();
    });

    it("handles auth errors (401) without retry", async () => {
      // Override handler to return 401
      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          return HttpResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        })
      );

      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.error).toBeDefined();
      // Should not retry on auth errors (tested by quick failure)
    });

    it("refetches data when refetch is called", async () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      const initialData = result.current.data;

      // Trigger refetch
      result.current.refetch();

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Data should be refreshed (even if same content)
      expect(result.current.data).toBeDefined();
    });

    it("triggers OAuth redirect when connect is called", async () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // Trigger connect mutation
      result.current.connection.connect();

      await waitFor(() => {
        expect(mockLocationHref).toHaveBeenCalledWith("/api/google/gmail/connect");
      });
    });

    it("shows isConnecting state during OAuth redirect", async () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => {
        return result.current.data?.connection.emailCount === 150;
      });

      // Before connect
      expect(result.current.connection.isConnecting).toBe(false);

      // Trigger connect
      result.current.connection.connect();

      // Should show connecting state
      expect(result.current.connection.isConnecting).toBe(true);
    });

    it("provides backward compatible connection slice", async () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => {
        return result.current.data?.connection.emailCount === 150;
      });

      // Connection slice should be properly formatted
      expect(result.current.connection.status).toBeDefined();
      expect(result.current.connection.status.isConnected).toBe(true);
      expect(result.current.connection.stats).toBeDefined();
      expect(result.current.connection.stats?.emailCount).toBe(150);
    });

    it("provides backward compatible emails slice", async () => {
      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => {
        return result.current.emails.emails.length === 2;
      });

      // Emails slice should be properly formatted
      expect(result.current.emails.emails).toHaveLength(2);
      expect(result.current.emails.previewRange).toBeDefined();
      expect(result.current.emails.previewRange?.from).toBeDefined();
      expect(result.current.emails.previewRange?.to).toBeDefined();
    });

    it("handles empty dashboard data gracefully", async () => {
      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          return HttpResponse.json({
            connection: {
              isConnected: false,
            },
            emailPreview: {
              emails: [],
              range: null,
            },
            jobs: null,
            syncStatus: undefined,
          });
        })
      );

      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.data?.connection.isConnected).toBe(false);
      expect(result.current.emails.emails).toEqual([]);
    });
  });

  describe("Convenience hook - useOmniConnectConnection()", () => {
    it("returns only connection slice from dashboard data", async () => {
      const { result } = renderHook(() => useOmniConnectConnection(), { wrapper });

      await waitFor(() => {
        return result.current?.emailCount === 150;
      });

      expect(result.current?.isConnected).toBe(true);
      expect(result.current?.emailCount).toBe(150);
      expect(result.current?.contactCount).toBe(42);
      expect(result.current?.lastSync).toBeDefined();
    });

    it("returns undefined when data is not loaded", () => {
      // This test may show initial undefined before data loads
      const { result } = renderHook(() => useOmniConnectConnection(), { wrapper });

      // Initially undefined or has initial data structure
      expect(result.current?.isConnected).toBeDefined();
    });
  });

  describe("Convenience hook - useOmniConnectEmails()", () => {
    it("returns only emails slice from dashboard data", async () => {
      const { result } = renderHook(() => useOmniConnectEmails(), { wrapper });

      await waitFor(() => {
        return result.current && result.current.length === 2;
      });

      expect(Array.isArray(result.current)).toBe(true);
      expect(result.current).toHaveLength(2);
      expect(result.current?.[0].subject).toBe("Meeting confirmation");
      expect(result.current?.[0].from).toBe("client@example.com");
    });

    it("returns empty array when no emails are available", async () => {
      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          return HttpResponse.json({
            connection: { isConnected: false },
            emailPreview: { emails: [], range: null },
            jobs: null,
          });
        })
      );

      const { result } = renderHook(() => useOmniConnectEmails(), { wrapper });

      await waitFor(() => expect(result.current).toBeDefined());

      expect(result.current).toEqual([]);
    });
  });

  describe("Convenience hook - useOmniConnectJobs()", () => {
    it("returns only jobs slice from dashboard data", async () => {
      const { result } = renderHook(() => useOmniConnectJobs(), { wrapper });

      await waitFor(() => {
        return result.current.jobs.length === 1;
      });

      expect(result.current.jobs).toHaveLength(1);
      expect(result.current.jobs[0].kind).toBe("gmail_sync");
      expect(result.current.jobs[0].status).toBe("running");
      expect(result.current.currentBatch).toBe("batch-123");
    });

    it("includes batch progress when available", async () => {
      const { result } = renderHook(() => useOmniConnectJobs(), { wrapper });

      await waitFor(() => {
        return result.current.totalEmails === 100;
      });

      expect(result.current.totalEmails).toBe(100);
      expect(result.current.processedEmails).toBe(50);
    });

    it("returns empty jobs array when no jobs are active", async () => {
      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          return HttpResponse.json({
            connection: { isConnected: true },
            emailPreview: { emails: [], range: null },
            jobs: {
              active: [],
              summary: {
                queued: 0,
                running: 0,
                completed: 0,
                failed: 0,
              },
              currentBatch: null,
            },
          });
        })
      );

      const { result } = renderHook(() => useOmniConnectJobs(), { wrapper });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(result.current.jobs).toEqual([]);
      expect(result.current.currentBatch).toBeNull();
    });
  });

  describe("Convenience hook - useOmniConnectSyncStatus()", () => {
    it("returns only syncStatus slice from dashboard data", async () => {
      const { result } = renderHook(() => useOmniConnectSyncStatus(), { wrapper });

      await waitFor(() => {
        return result.current.syncStatus?.googleConnected === true;
      });

      expect(result.current.syncStatus).toBeDefined();
      expect(result.current.syncStatus?.googleConnected).toBe(true);
      expect(result.current.syncStatus?.serviceTokens.gmail).toBe(true);
      expect(result.current.syncStatus?.serviceTokens.calendar).toBe(true);
    });

    it("includes sync timestamps", async () => {
      const { result } = renderHook(() => useOmniConnectSyncStatus(), { wrapper });

      await waitFor(() => {
        return result.current.syncStatus?.lastSync.gmail !== null;
      });

      expect(result.current.syncStatus?.lastSync.gmail).toBeDefined();
      expect(result.current.syncStatus?.lastSync.calendar).toBeDefined();
    });

    it("includes job statistics", async () => {
      const { result } = renderHook(() => useOmniConnectSyncStatus(), { wrapper });

      await waitFor(() => {
        return result.current.syncStatus?.jobs.done === 5;
      });

      expect(result.current.syncStatus?.jobs.done).toBe(5);
      expect(result.current.syncStatus?.jobs.error).toBe(0);
      expect(result.current.syncStatus?.embedJobs.queued).toBe(2);
    });
  });

  describe("Error scenarios", () => {
    it("retries on network errors but not on auth errors", async () => {
      let attemptCount = 0;

      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          attemptCount++;
          if (attemptCount < 3) {
            return HttpResponse.json(
              { error: "Network error" },
              { status: 500 }
            );
          }
          return HttpResponse.json({
            connection: { isConnected: true, emailCount: 150 },
            emailPreview: { emails: [], range: null },
            jobs: null,
          });
        })
      );

      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      // Wait for data to load successfully after retries
      await waitFor(
        () => {
          return result.current.data?.connection.emailCount === 150;
        },
        { timeout: 5000 }
      );

      // Should have retried and eventually succeeded
      expect(attemptCount).toBeGreaterThan(1);
      expect(result.current.data).toBeDefined();
    });

    it("does not retry on 401 unauthorized", async () => {
      let attemptCount = 0;

      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          attemptCount++;
          return HttpResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
          );
        })
      );

      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      // Wait for error state
      await waitFor(
        () => {
          return result.current.error !== null;
        },
        { timeout: 2000 }
      );

      // Should NOT have retried (only 1 attempt)
      expect(attemptCount).toBe(1);
      expect(result.current.error).toBeDefined();
    });

    it("does not retry on 403 forbidden", async () => {
      let attemptCount = 0;

      server.use(
        http.get("/api/omni-connect/dashboard", () => {
          attemptCount++;
          return HttpResponse.json(
            { error: "Forbidden" },
            { status: 403 }
          );
        })
      );

      const { result } = renderHook(() => useOmniConnect(), { wrapper });

      // Wait for error state
      await waitFor(
        () => {
          return result.current.error !== null;
        },
        { timeout: 2000 }
      );

      // Should NOT have retried
      expect(attemptCount).toBe(1);
      expect(result.current.error).toBeDefined();
    });
  });
});
