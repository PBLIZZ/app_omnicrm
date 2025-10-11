/**
 * Calendar Sync Hook
 *
 * Handles Google Calendar data synchronization using the direct sync pattern
 * proven in OmniConnect (vs the complex job-based polling approach).
 *
 * Responsibilities:
 * - Direct calendar sync execution
 * - Progress feedback to user
 * - Error handling and recovery
 * - Data refresh after sync
 */
import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { Result, isErr, isOk } from "@/lib/utils/result";
// Direct error handling and success notifications (no abstraction)
const createErrorHandler = (context: string) => (error: unknown) => {
  const message = error instanceof Error ? error.message : "An unknown error occurred";
  toast.error(`${context} Failed`, { description: message });

  // Log for debugging (development only)
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}] Error:`, error);
  }
};

const showSyncSuccessToast = (service: string, details?: { count?: number; duration?: string }) => {
  const title = `${service} Sync Complete`;
  let description = `${service} data has been synchronized successfully.`;

  if (details?.count !== undefined) {
    description = `${details.count} ${service.toLowerCase()} items synchronized successfully.`;
  }

  if (details?.duration) {
    description += ` (${details.duration})`;
  }

  toast.success(title, { description });
};

export interface CalendarSyncStats {
  syncedEvents: number;
  batchId?: string;
}

export interface UseCalendarSyncResult {
  // Sync state
  isSyncing: boolean;
  syncStatus: string;
  error: string | null;
  lastSyncStats: CalendarSyncStats | null;

  // Actions
  syncCalendar: () => Promise<void>;
  clearError: () => void;
}

export function useCalendarSync(): UseCalendarSyncResult {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<CalendarSyncStats | null>(null);

  // Calendar sync mutation using direct pattern (like Gmail)
  const syncMutation = useMutation({
    mutationFn: async (): Promise<CalendarSyncStats> => {
      setSyncStatus("Initializing sync...");
      setError(null);

      try {
        toast.info("Starting calendar sync...", {
          description: "Preparing to sync your calendar events...",
        });

        setSyncStatus("Connecting to Google Calendar...");

        // Direct sync call (following the proven Gmail pattern)
        const result = await apiClient.post<
          Result<
            {
              message?: string;
              stats?: CalendarSyncStats;
            },
            { message: string; code: string }
          >
        >("/api/google/calendar/sync", {});

        if (isErr(result)) {
          throw new Error(result.error.message);
        }
        if (!isOk(result)) {
          throw new Error("Invalid result state");
        }

        const syncResponse = result.data;

        setSyncStatus("Processing calendar events...");

        // Extract sync results from direct sync response
        const syncedEvents = syncResponse?.stats?.syncedEvents ?? 0;
        const batchId = syncResponse?.stats?.batchId;

        const stats: CalendarSyncStats = {
          syncedEvents,
          ...(batchId && { batchId }),
        };

        setSyncStatus("Sync completed successfully");

        return stats;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An error occurred during sync";
        setSyncStatus("Sync failed");
        throw new Error(errorMessage);
      }
    },
    onSuccess: (stats) => {
      setLastSyncStats(stats);
      setSyncStatus("Sync Done");

      showSyncSuccessToast("Google Calendar", {
        count: stats.syncedEvents,
      });

      // Invalidate all calendar-related queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.google.calendar.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.google.status() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.omniConnect.dashboard() });

      // Clear status after delay
      setTimeout(() => {
        setSyncStatus("");
      }, 2000);
    },
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : "An error occurred during sync";
      setError(errorMessage);
      setSyncStatus("Sync Failed");

      createErrorHandler("Calendar Sync")(err);

      // Clear status after delay
      setTimeout(() => {
        setSyncStatus("");
      }, 3000);
    },
  });

  // Manual sync action
  const syncCalendar = useCallback(async () => {
    setError(null);
    await syncMutation.mutateAsync();
  }, [syncMutation]);

  const clearError = useCallback(() => {
    setError(null);
    setSyncStatus("");
  }, []);

  return {
    // State
    isSyncing: syncMutation.isPending,
    syncStatus,
    error,
    lastSyncStats,

    // Actions
    syncCalendar,
    clearError,
  };
}
