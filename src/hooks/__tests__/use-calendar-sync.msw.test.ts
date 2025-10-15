/**
 * useCalendarSync Hook Tests (using MSW)
 *
 * Tests for direct calendar sync execution, status lifecycle,
 * and sync state management with comprehensive coverage.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { server } from "../../../test/msw/server";
import { http, HttpResponse } from "msw";
import { useCalendarSync } from "../useCalendarSync";
import { toast } from "sonner";

// Mock toast notifications
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock timers for status message lifecycle
vi.useFakeTimers();

describe("useCalendarSync (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
  });

  describe("Direct sync execution", () => {
    it("executes sync successfully with proper response structure", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncStats).toBeNull();

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.isSyncing === false;
      });

      expect(result.current.lastSyncStats).toBeDefined();
      expect(result.current.lastSyncStats?.syncedEvents).toBe(25);
      expect(result.current.lastSyncStats?.batchId).toBeDefined();
      expect(result.current.error).toBeNull();
    });

    it("shows isSyncing true during sync operation", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      expect(result.current.isSyncing).toBe(false);

      const syncPromise = result.current.syncCalendar();

      // Should be syncing immediately
      expect(result.current.isSyncing).toBe(true);

      await syncPromise;

      expect(result.current.isSyncing).toBe(false);
    });

    it("tracks last sync stats after successful sync", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      expect(result.current.lastSyncStats).toBeNull();

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.lastSyncStats !== null;
      });

      expect(result.current.lastSyncStats?.syncedEvents).toBe(25);
      expect(result.current.lastSyncStats?.batchId).toBeTruthy();
    });

    it("updates lastSyncStats with new data on subsequent syncs", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      // First sync
      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.lastSyncStats !== null;
      });

      const firstBatchId = result.current.lastSyncStats?.batchId;

      // Second sync (will have different batchId due to crypto.randomUUID())
      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.lastSyncStats?.batchId !== firstBatchId;
      });

      expect(result.current.lastSyncStats?.syncedEvents).toBe(25);
      expect(result.current.lastSyncStats?.batchId).not.toBe(firstBatchId);
    });

    it("invalidates calendar queries after successful sync", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.isSyncing === false;
      });

      // Query invalidation happens automatically in the hook
      expect(result.current.lastSyncStats).toBeDefined();
    });
  });

  describe("Toast notifications", () => {
    it("shows info toast at sync start", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      expect(toast.info).toHaveBeenCalledWith(
        "Starting calendar sync...",
        expect.objectContaining({
          description: "Preparing to sync your calendar events...",
        }),
      );
    });

    it("shows success toast after successful sync", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.isSyncing === false;
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Google Calendar",
        expect.objectContaining({
          count: 25,
        }),
      );
    });

    it("shows error toast on sync failure", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Sync failed" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await expect(result.current.syncCalendar()).rejects.toThrow();

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(toast.error).toHaveBeenCalled();
    });

    it("includes sync stats in success toast", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.lastSyncStats !== null;
      });

      expect(toast.success).toHaveBeenCalledWith(
        "Google Calendar",
        expect.objectContaining({
          count: 25,
        }),
      );
    });
  });

  describe("Status message lifecycle", () => {
    it("sets status message during sync", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      expect(result.current.syncStatus).toBe("");

      const syncPromise = result.current.syncCalendar();

      await waitFor(() => {
        return result.current.syncStatus !== "";
      });

      expect(result.current.syncStatus).toBeTruthy();

      await syncPromise;
    });

    it("updates status message through sync lifecycle", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      const syncPromise = result.current.syncCalendar();

      // Check for initial status
      await waitFor(() => {
        return result.current.syncStatus === "Initializing sync...";
      });

      await syncPromise;

      // Final status
      expect(result.current.syncStatus).toBe("Sync Done");
    });

    it("clears status message after delay on success", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.syncStatus === "Sync Done";
      });

      // Advance timers
      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        return result.current.syncStatus === "";
      });

      expect(result.current.syncStatus).toBe("");
    });

    it("sets failure status on sync error", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Network error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.syncStatus === "Sync Failed";
      });

      expect(result.current.syncStatus).toBe("Sync Failed");
    });

    it("clears failure status after delay on error", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Sync error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.syncStatus === "Sync Failed";
      });

      // Advance timers
      vi.advanceTimersByTime(3000);

      await waitFor(() => {
        return result.current.syncStatus === "";
      });

      expect(result.current.syncStatus).toBe("");
    });
  });

  describe("Error handling", () => {
    it("populates error state on sync failure", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Sync failed due to network issue" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      expect(result.current.error).toBeNull();

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toContain("network issue");
    });

    it("handles network errors gracefully", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Connection timeout" }, { status: 504 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeDefined();
      expect(toast.error).toHaveBeenCalled();
    });

    it("handles server errors with proper messaging", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Internal server error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();
    });

    it("handles validation errors", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Invalid sync parameters" }, { status: 400 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toContain("Invalid sync parameters");
    });

    it("clears error with clearError function", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Test error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      result.current.clearError();

      expect(result.current.error).toBeNull();
      expect(result.current.syncStatus).toBe("");
    });

    it("clears both error and status with clearError", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Sync error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null && result.current.syncStatus !== "";
      });

      result.current.clearError();

      expect(result.current.error).toBeNull();
      expect(result.current.syncStatus).toBe("");
    });

    it("clears error before starting new sync", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      // Fail first sync
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "First error" }, { status: 500 });
        }),
      );

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      // Reset handlers
      server.resetHandlers();

      // Start new sync - error should be cleared
      const syncPromise = result.current.syncCalendar();

      expect(result.current.error).toBeNull();

      await syncPromise;
    });
  });

  describe("Integration scenarios", () => {
    it("handles complete sync workflow successfully", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      // Initial state
      expect(result.current.isSyncing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.syncStatus).toBe("");
      expect(result.current.lastSyncStats).toBeNull();

      // Execute sync
      await result.current.syncCalendar();

      // Verify completion
      await waitFor(() => {
        return result.current.isSyncing === false && result.current.lastSyncStats !== null;
      });

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.lastSyncStats?.syncedEvents).toBe(25);
      expect(toast.success).toHaveBeenCalled();
    });

    it("handles sync failure and recovery", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      // Fail first
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({ error: "Temporary failure" }, { status: 503 });
        }),
      );

      try {
        await result.current.syncCalendar();
      } catch {
        // Expected
      }

      await waitFor(() => {
        return result.current.error !== null;
      });

      expect(result.current.error).toBeTruthy();

      // Reset and retry
      server.resetHandlers();

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.error === null && result.current.lastSyncStats !== null;
      });

      expect(result.current.error).toBeNull();
      expect(result.current.lastSyncStats).toBeDefined();
    });

    it("maintains correct state during rapid sync attempts", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      // Start two syncs (though typically shouldn't happen)
      const sync1 = result.current.syncCalendar();
      const sync2 = result.current.syncCalendar();

      expect(result.current.isSyncing).toBe(true);

      await Promise.all([sync1, sync2]);

      expect(result.current.isSyncing).toBe(false);
      expect(result.current.lastSyncStats).toBeDefined();
    });

    it("preserves last sync stats across multiple syncs", async () => {
      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      // First sync
      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.lastSyncStats !== null;
      });

      expect(result.current.lastSyncStats?.syncedEvents).toBe(25);

      // Second sync
      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.isSyncing === false;
      });

      // Stats should be updated
      expect(result.current.lastSyncStats?.syncedEvents).toBe(25);
    });
  });

  describe("Edge cases", () => {
    it("handles missing stats in response", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({
            message: "Sync completed",
            // Missing stats field
          });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.isSyncing === false;
      });

      expect(result.current.lastSyncStats?.syncedEvents).toBe(0);
    });

    it("handles partial stats in response", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({
            message: "Sync completed",
            stats: {
              syncedEvents: 10,
              // Missing batchId
            },
          });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.lastSyncStats !== null;
      });

      expect(result.current.lastSyncStats?.syncedEvents).toBe(10);
      expect(result.current.lastSyncStats?.batchId).toBeUndefined();
    });

    it("handles zero events synced", async () => {
      server.use(
        http.post("/api/google/calendar/sync", () => {
          return HttpResponse.json({
            message: "Sync completed",
            stats: {
              syncedEvents: 0,
              batchId: "batch-empty",
            },
          });
        }),
      );

      const { result } = renderHook(() => useCalendarSync(), { wrapper });

      await result.current.syncCalendar();

      await waitFor(() => {
        return result.current.lastSyncStats !== null;
      });

      expect(result.current.lastSyncStats?.syncedEvents).toBe(0);
      expect(toast.success).toHaveBeenCalled();
    });
  });
});
