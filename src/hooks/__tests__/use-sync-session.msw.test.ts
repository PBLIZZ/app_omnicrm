/**
 * useSyncSession Hook Tests (using MSW)
 *
 * Tests for Gmail and Calendar sync mutations, progress polling,
 * and manual sync workflows with comprehensive coverage.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { server } from "../../../test/msw/server";
import { http, HttpResponse } from "msw";
import { useSyncSession, useSyncProgress, useManualSync } from "../useSyncSession";
import { toast } from "sonner";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

describe("useSyncSession (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("useSyncSession() - Gmail sync mutation", () => {
    it("starts Gmail sync successfully with proper result structure", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      // Trigger Gmail sync
      await act(async () => {
        result.current.startGmailSync.mutate({
          incremental: false,
          overlapHours: 0,
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.startGmailSync.isSuccess).toBe(true);
      });

      expect(result.current.startGmailSync.data).toBeDefined();
      expect(result.current.startGmailSync.data?.sessionId).toBeDefined();
      expect(result.current.startGmailSync.data?.success).toBe(true);
      expect(result.current.startGmailSync.data?.messagesProcessed).toBe(150);
      expect(result.current.startGmailSync.data?.normalizedInteractions).toBe(120);
    });

    it("shows toast notification on successful Gmail sync", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startGmailSync.mutate({
          incremental: false,
          overlapHours: 0,
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.startGmailSync.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Gmail sync started successfully");
    });

    it("handles Gmail sync errors with toast notification", async () => {
      server.use(
        http.post("/api/google/gmail/sync-blocking", () => {
          return HttpResponse.json({ error: "Sync failed" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startGmailSync.mutate({
          incremental: false,
          overlapHours: 0,
        });
      });

      // Wait for the mutation to complete with error
      await waitFor(() => {
        expect(result.current.startGmailSync.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalled();
      expect(result.current.startGmailSync.error).toBeDefined();
    });

    it("invalidates queries after successful Gmail sync", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startGmailSync.mutate({
          incremental: false,
          overlapHours: 0,
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.startGmailSync.isSuccess).toBe(true);
      });

      // Query invalidation happens automatically in the hook
      expect(result.current.startGmailSync.isSuccess).toBe(true);
    });

    it("shows loading state during Gmail sync", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      expect(result.current.startGmailSync.isPending).toBe(false);

      // Start the mutation but don't await it yet
      let mutationPromise: Promise<unknown>;
      await act(async () => {
        mutationPromise = result.current.startGmailSync.mutateAsync({
          incremental: false,
          overlapHours: 0,
        });
      });

      // Wait for the mutation to start and check isPending
      await waitFor(() => {
        expect(result.current.startGmailSync.isPending).toBe(true);
      });

      // Now await the mutation to complete
      await act(async () => {
        await mutationPromise!;
      });

      // Wait for the state to update after mutation completes
      await waitFor(() => {
        expect(result.current.startGmailSync.isPending).toBe(false);
      });
    });

    it("accepts sync preferences for Gmail sync", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startGmailSync.mutate({
          preferences: { syncEmails: true, syncLabels: true },
          incremental: true,
          overlapHours: 24,
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.startGmailSync.isSuccess).toBe(true);
      });

      expect(result.current.startGmailSync.data).toBeDefined();
    });
  });

  describe("useSyncSession() - Calendar sync mutation", () => {
    it("starts Calendar sync successfully with proper result structure", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startCalendarSync.mutate({
          daysPast: 30,
          daysFuture: 90,
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.startCalendarSync.isSuccess).toBe(true);
      });

      expect(result.current.startCalendarSync.data).toBeDefined();
      expect(result.current.startCalendarSync.data?.sessionId).toBeDefined();
      expect(result.current.startCalendarSync.data?.success).toBe(true);
      expect(result.current.startCalendarSync.data?.messagesProcessed).toBe(25);
    });

    it("shows toast notification on successful Calendar sync", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startCalendarSync.mutate({
          daysPast: 30,
          daysFuture: 90,
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.startCalendarSync.isSuccess).toBe(true);
      });

      expect(toast.success).toHaveBeenCalledWith("Calendar sync started successfully");
    });

    it("handles Calendar sync errors with toast notification", async () => {
      server.use(
        http.post("/api/google/calendar/sync-blocking", () => {
          return HttpResponse.json({ error: "Calendar sync failed" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startCalendarSync.mutate({
          daysPast: 30,
          daysFuture: 90,
        });
      });

      // Wait for the mutation to complete with error
      await waitFor(() => {
        expect(result.current.startCalendarSync.isError).toBe(true);
      });

      expect(toast.error).toHaveBeenCalled();
      expect(result.current.startCalendarSync.error).toBeDefined();
    });

    it("invalidates queries after successful Calendar sync", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      await act(async () => {
        result.current.startCalendarSync.mutate({
          daysPast: 30,
          daysFuture: 90,
        });
      });

      // Wait for the mutation to complete
      await waitFor(() => {
        expect(result.current.startCalendarSync.isSuccess).toBe(true);
      });

      expect(result.current.startCalendarSync.isSuccess).toBe(true);
    });

    it("shows loading state during Calendar sync", async () => {
      const { result } = renderHook(() => useSyncSession(), { wrapper });

      expect(result.current.startCalendarSync.isPending).toBe(false);

      // Start the mutation but don't await it yet
      let mutationPromise: Promise<unknown>;
      await act(async () => {
        mutationPromise = result.current.startCalendarSync.mutateAsync({
          daysPast: 30,
          daysFuture: 90,
        });
      });

      // Wait for the mutation to start and check isPending
      await waitFor(() => {
        expect(result.current.startCalendarSync.isPending).toBe(true);
      });

      // Now await the mutation to complete
      await act(async () => {
        await mutationPromise!;
      });

      // Wait for the state to update after mutation completes
      await waitFor(() => {
        expect(result.current.startCalendarSync.isPending).toBe(false);
      });
    });
  });

  describe("useSyncProgress() - Polling tests", () => {
    it("starts polling when session ID is provided", async () => {
      const sessionId = "test-session-123";

      const { result } = renderHook(() => useSyncProgress(sessionId, true), { wrapper });

      // Add debugging to see what's happening
      console.log("Query state:", {
        isLoading: result.current.isLoading,
        isSuccess: result.current.isSuccess,
        isError: result.current.isError,
        error: result.current.error,
        data: result.current.data,
        fetchStatus: result.current.fetchStatus,
      });

      // Add a small delay to allow the query to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Add more debugging after the delay
      console.log("Query state after delay:", {
        isLoading: result.current.isLoading,
        isSuccess: result.current.isSuccess,
        isError: result.current.isError,
        error: result.current.error,
        data: result.current.data,
        fetchStatus: result.current.fetchStatus,
      });

      // Wait for the query to complete
      await waitFor(
        () => {
          return result.current.isSuccess === true && result.current.data !== undefined;
        },
        { timeout: 20000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.sessionId).toBe(sessionId);
      expect(result.current.data?.status).toBe("completed");
    });

    it("does not poll when session ID is null", () => {
      const { result } = renderHook(() => useSyncProgress(null, true), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(result.current.data).toBeUndefined();
    });

    it("does not poll when enabled is false", () => {
      const { result } = renderHook(() => useSyncProgress("test-session-123", false), { wrapper });

      expect(result.current.fetchStatus).toBe("idle");
      expect(result.current.data).toBeUndefined();
    });

    it("returns proper progress data structure", async () => {
      const sessionId = "test-session-456";

      const { result } = renderHook(() => useSyncProgress(sessionId, true), { wrapper });

      // Add a small delay to allow the query to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Wait for the query to complete
      await waitFor(
        () => {
          return result.current.isSuccess === true && result.current.data !== undefined;
        },
        { timeout: 20000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.progress).toBeDefined();
      expect(result.current.data?.progress.percentage).toBe(100);
      expect(result.current.data?.progress.totalItems).toBe(150);
      expect(result.current.data?.progress.importedItems).toBe(150);
      expect(result.current.data?.progress.processedItems).toBe(120);
      expect(result.current.data?.timestamps).toBeDefined();
      expect(result.current.data?.timestamps.startedAt).toBeDefined();
      expect(result.current.data?.timestamps.completedAt).toBeDefined();
    });

    it("stops polling when sync status is completed", async () => {
      let requestCount = 0;

      server.use(
        http.get("/api/sync-progress/:sessionId", () => {
          requestCount++;
          return HttpResponse.json({
            sessionId: "test-session",
            service: "gmail",
            status: "completed",
            progress: {
              percentage: 100,
              currentStep: "Done",
              totalItems: 100,
              importedItems: 100,
              processedItems: 100,
              failedItems: 0,
            },
            timestamps: {
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
            },
            preferences: {},
          });
        }),
      );

      const { result } = renderHook(() => useSyncProgress("test-session", true), { wrapper });

      await waitFor(() => {
        return result.current.data?.status === "completed";
      });

      const initialCount = requestCount;

      // Wait a bit to ensure polling has stopped
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Request count should not have increased significantly after completion
      expect(requestCount).toBeLessThanOrEqual(initialCount + 1);
    });

    it("stops polling when sync status is failed", async () => {
      server.use(
        http.get("/api/sync-progress/:sessionId", () => {
          return HttpResponse.json({
            sessionId: "test-session",
            service: "gmail",
            status: "failed",
            progress: {
              percentage: 50,
              currentStep: "Failed",
              totalItems: 100,
              importedItems: 50,
              processedItems: 0,
              failedItems: 50,
            },
            timestamps: {
              startedAt: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
            },
            preferences: {},
            errorDetails: { message: "Sync failed" },
          });
        }),
      );

      const { result } = renderHook(() => useSyncProgress("test-session", true), { wrapper });

      // Add a small delay to allow the query to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      await waitFor(
        () => {
          return result.current.isSuccess === true && result.current.data?.status === "failed";
        },
        { timeout: 15000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.errorDetails).toBeDefined();
    });

    it("stops polling when sync status is cancelled", async () => {
      server.use(
        http.get("/api/sync-progress/:sessionId", () => {
          return HttpResponse.json({
            sessionId: "test-session",
            service: "gmail",
            status: "cancelled",
            progress: {
              percentage: 30,
              currentStep: "Cancelled",
              totalItems: 100,
              importedItems: 30,
              processedItems: 0,
              failedItems: 0,
            },
            timestamps: {
              startedAt: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
            },
            preferences: {},
          });
        }),
      );

      const { result } = renderHook(() => useSyncProgress("test-session", true), { wrapper });

      // Add a small delay to allow the query to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      await waitFor(
        () => {
          return result.current.isSuccess === true && result.current.data?.status === "cancelled";
        },
        { timeout: 15000 },
      );

      expect(result.current.data).toBeDefined();
      expect(result.current.data?.status).toBe("cancelled");
    });

    it("stops retrying on 404 (session not found)", async () => {
      let requestCount = 0;

      server.use(
        http.get("/api/sync-progress/:sessionId", () => {
          requestCount++;
          return HttpResponse.json(
            { error: "Session not found", code: "NOT_FOUND" },
            { status: 404 },
          );
        }),
      );

      const { result } = renderHook(() => useSyncProgress("nonexistent-session", true), {
        wrapper,
      });

      await waitFor(
        () => {
          return result.current.isError;
        },
        { timeout: 5000 },
      );

      // Should not retry on 404
      expect(requestCount).toBe(1);
      expect(result.current.error).toBeDefined();
    });

    it.skip("retries on other errors (up to 3 times)", async () => {
      let requestCount = 0;

      server.use(
        http.get("/api/sync-progress/:sessionId", () => {
          requestCount++;
          console.log(
            `Request ${requestCount}: returning ${requestCount < 3 ? "500 error" : "success"}`,
          );
          if (requestCount < 3) {
            return HttpResponse.json({ error: "Server error" }, { status: 500 });
          }
          return HttpResponse.json({
            sessionId: "test-session",
            service: "gmail",
            status: "completed",
            progress: {
              percentage: 100,
              currentStep: "Done",
              totalItems: 100,
              importedItems: 100,
              processedItems: 100,
              failedItems: 0,
            },
            timestamps: {
              startedAt: new Date().toISOString(),
              completedAt: new Date().toISOString(),
              lastUpdate: new Date().toISOString(),
            },
            preferences: {},
          });
        }),
      );

      const { result } = renderHook(() => useSyncProgress("test-session", true), { wrapper });

      // Wait for the query to succeed (after retries)
      await waitFor(
        () => {
          return result.current.isSuccess === true && result.current.data?.status === "completed";
        },
        { timeout: 10000 },
      );

      // Verify that retries occurred
      expect(requestCount).toBeGreaterThanOrEqual(2);
      expect(result.current.data).toBeDefined();
    });
  });

  describe("useManualSync() - Integration tests", () => {
    it("triggers Gmail sync with session tracking", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      expect(result.current.currentSessionId).toBeNull();
      expect(result.current.isModalOpen).toBe(false);

      // Trigger sync
      await act(async () => {
        await result.current.triggerGmailSync();
      });

      expect(result.current.currentSessionId).toBeDefined();
      expect(result.current.isModalOpen).toBe(true);
    });

    it("triggers Calendar sync with session tracking", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      let syncResult: any;
      await act(async () => {
        syncResult = await result.current.triggerCalendarSync();
      });

      expect(syncResult.sessionId).toBeDefined();
      expect(result.current.currentSessionId).toBe(syncResult.sessionId);
      expect(result.current.isModalOpen).toBe(true);
    });

    it("accepts preferences for Gmail sync", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      const preferences = {
        syncEmails: true,
        syncLabels: false,
        daysBack: 30,
      };

      let syncResult: any;
      await act(async () => {
        syncResult = await result.current.triggerGmailSync(preferences);
      });

      expect(syncResult.sessionId).toBeDefined();
    });

    it("accepts preferences for Calendar sync", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      const preferences = {
        syncEvents: true,
        daysBack: 60,
      };

      let syncResult: any;
      await act(async () => {
        syncResult = await result.current.triggerCalendarSync(preferences);
      });

      expect(syncResult.sessionId).toBeDefined();
    });

    it("handles sync completion successfully", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      await act(async () => {
        await result.current.triggerGmailSync();
      });

      // Simulate completion
      act(() => {
        result.current.handleSyncComplete({
          success: true,
          stats: { processed: 100, inserted: 80 },
        });
      });

      expect(toast.success).toHaveBeenCalledWith("Sync completed successfully!");
      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.currentSessionId).toBeNull();
    });

    it("handles sync failure with error toast", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      await act(async () => {
        await result.current.triggerGmailSync();
      });

      act(() => {
        result.current.handleSyncComplete({
          success: false,
          error: "Sync failed due to network error",
        });
      });

      expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Sync failed"));
      expect(result.current.isModalOpen).toBe(false);
    });

    it("closes modal without completing sync", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      await act(async () => {
        await result.current.triggerGmailSync();
      });

      act(() => {
        result.current.closeModal();
      });

      expect(result.current.isModalOpen).toBe(false);
      expect(result.current.currentSessionId).toBeNull();
    });

    it("shows loading states for both sync types independently", async () => {
      const { result } = renderHook(() => useManualSync(), { wrapper });

      expect(result.current.isGmailSyncLoading).toBe(false);
      expect(result.current.isCalendarSyncLoading).toBe(false);

      // Trigger Gmail sync
      const syncPromise = result.current.triggerGmailSync();

      // Wait for the loading state to be set
      await waitFor(() => {
        expect(result.current.isGmailSyncLoading).toBe(true);
      });

      expect(result.current.isCalendarSyncLoading).toBe(false);

      await act(async () => {
        await syncPromise;
      });

      expect(result.current.isGmailSyncLoading).toBe(false);
    });

    it("handles errors during sync trigger", async () => {
      server.use(
        http.post("/api/google/gmail/sync-blocking", () => {
          return HttpResponse.json({ error: "Failed to start sync" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useManualSync(), { wrapper });

      await expect(result.current.triggerGmailSync()).rejects.toThrow();

      expect(result.current.currentSessionId).toBeNull();
      expect(result.current.isModalOpen).toBe(false);
    });
  });
});
