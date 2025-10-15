"use client";

import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { post, get } from "@/lib/api";
import { toast } from "sonner";

interface SyncProgress {
  sessionId: string;
  service: "gmail" | "calendar";
  status: "started" | "importing" | "processing" | "completed" | "failed" | "cancelled";
  progress: {
    percentage: number;
    currentStep: string;
    totalItems: number;
    importedItems: number;
    processedItems: number;
    failedItems: number;
  };
  timeEstimate?: {
    remainingSeconds: number;
    eta?: string;
  };
  timestamps: {
    startedAt: string;
    completedAt?: string;
    lastUpdate: string;
  };
  errorDetails?: Record<string, unknown>;
  preferences: Record<string, unknown>;
}

interface SyncSessionResult {
  sessionId: string;
  success: boolean;
  messagesProcessed: number;
  normalizedInteractions?: number;
  duration?: number;
  errors?: unknown[];
  message: string;
  stats: {
    totalFound: number;
    processed: number;
    inserted: number;
    errors: number;
    processedJobs: number;
    batchId: string;
  };
}

export function useSyncSession(): {
  startGmailSync: ReturnType<
    typeof useMutation<
      SyncSessionResult,
      Error,
      {
        preferences?: Record<string, unknown>;
        incremental?: boolean;
        overlapHours?: number;
      }
    >
  >;
  startCalendarSync: ReturnType<
    typeof useMutation<
      SyncSessionResult,
      Error,
      {
        preferences?: Record<string, unknown>;
        daysPast?: number;
        daysFuture?: number;
        maxResults?: number;
      }
    >
  >;
} {
  const queryClient = useQueryClient();

  // Start blocking sync mutation
  const startGmailSync = useMutation({
    mutationFn: async (params: {
      preferences?: Record<string, unknown>;
      incremental?: boolean;
      overlapHours?: number;
    }) => {
      const result = await post<SyncSessionResult>("/api/google/gmail/sync-blocking", params);
      return result;
    },
    onSuccess: () => {
      toast.success("Gmail sync started successfully");
      // Invalidate relevant queries after successful sync
      void queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/contacts-new"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-connect/dashboard"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start Gmail sync: ${error.message ?? "Unknown error"}`);
    },
  });

  const startCalendarSync = useMutation({
    mutationFn: async (params: {
      preferences?: Record<string, unknown>;
      daysPast?: number;
      daysFuture?: number;
      maxResults?: number;
    }) => {
      const result = await post<SyncSessionResult>("/api/google/calendar/sync-blocking", params);
      return result;
    },
    onSuccess: () => {
      toast.success("Calendar sync started successfully");
      // Invalidate relevant queries after successful sync
      void queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/google/calendar/events"] });
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-rhythm"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to start Calendar sync: ${error.message ?? "Unknown error"}`);
    },
  });

  return {
    startGmailSync,
    startCalendarSync,
  };
}

export function useSyncProgress(
  sessionId: string | null,
  enabled = true,
): ReturnType<typeof useQuery<SyncProgress, Error>> {
  return useQuery({
    queryKey: ["/api/sync-progress", sessionId],
    queryFn: async () => {
      if (!sessionId) throw new Error("No session ID provided");
      const result = await get<SyncProgress>(`/api/sync-progress/${sessionId}`);
      return result;
    },
    enabled: enabled && !!sessionId,
    refetchInterval: (query) => {
      // Stop polling if sync is completed, failed, or cancelled
      if (
        query.state.data?.status &&
        ["completed", "failed", "cancelled"].includes(query.state.data.status)
      ) {
        return false;
      }
      return 2000; // Poll every 2 seconds while active
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    retry: (failureCount: number, error: Error) => {
      // Stop retrying for 404s (session not found)
      if (error?.message?.includes("NOT_FOUND")) {
        return false;
      }
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
  });
}

export function useManualSync(): {
  currentSessionId: string | null;
  isModalOpen: boolean;
  triggerGmailSync: (preferences?: Record<string, unknown>) => Promise<SyncSessionResult>;
  triggerCalendarSync: (preferences?: Record<string, unknown>) => Promise<SyncSessionResult>;
  handleSyncComplete: (result: {
    success: boolean;
    stats?: Record<string, unknown>;
    error?: string;
  }) => void;
  closeModal: () => void;
  isGmailSyncLoading: boolean;
  isCalendarSyncLoading: boolean;
} {
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const { startGmailSync, startCalendarSync } = useSyncSession();

  const triggerGmailSync = useCallback(
    async (preferences?: Record<string, unknown>) => {
      try {
        const payload: { incremental: boolean; preferences?: Record<string, unknown> } = {
          incremental: false, // Manual sync is typically full sync
        };

        // Only add preferences if they're defined
        if (preferences) {
          payload.preferences = preferences;
        }

        const result = await startGmailSync.mutateAsync(payload);

        setCurrentSessionId(result.sessionId);
        setIsModalOpen(true);

        return result;
      } catch (error) {
        console.error("Failed to trigger Gmail sync:", error);
        throw error;
      }
    },
    [startGmailSync],
  );

  const triggerCalendarSync = useCallback(
    async (preferences?: Record<string, unknown>) => {
      try {
        const payload: { preferences?: Record<string, unknown> } = {};

        // Only add preferences if they're defined
        if (preferences) {
          payload.preferences = preferences;
        }

        const result = await startCalendarSync.mutateAsync(payload);

        setCurrentSessionId(result.sessionId);
        setIsModalOpen(true);

        return result;
      } catch (error) {
        console.error("Failed to trigger Calendar sync:", error);
        throw error;
      }
    },
    [startCalendarSync],
  );

  const handleSyncComplete = useCallback(
    (result: { success: boolean; stats?: Record<string, unknown>; error?: string }) => {
      setIsModalOpen(false);
      setCurrentSessionId(null);

      if (result.success) {
        toast.success("Sync completed successfully!");

        // Invalidate all sync-related queries to refresh UI
        void queryClient.invalidateQueries({ queryKey: ["/api/google/status"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/contacts-new"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/omni-connect/dashboard"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/google/calendar/events"] });
        void queryClient.invalidateQueries({ queryKey: ["/api/omni-rhythm"] });
      } else {
        toast.error(`Sync failed: ${result.error ?? "Unknown error"}`);
      }
    },
    [queryClient],
  );

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setCurrentSessionId(null);
  }, []);

  return {
    // State
    currentSessionId,
    isModalOpen,

    // Actions
    triggerGmailSync,
    triggerCalendarSync,
    handleSyncComplete,
    closeModal,

    // Loading states
    isGmailSyncLoading: startGmailSync.isPending,
    isCalendarSyncLoading: startCalendarSync.isPending,
  };
}
