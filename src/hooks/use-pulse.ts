import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { AppError } from "@/lib/errors/app-error";
import type { DailyPulseLog, PulseAnalytics } from "@repo";
import type {
  CreateDailyPulseLogInput,
  UpdateDailyPulseLogInput,
} from "@/server/db/business-schemas/productivity";

// ============================================================================
// RETRY LOGIC
// ============================================================================

const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors
  if (error instanceof AppError && error.category === "authentication") return false;

  // Don't retry validation errors
  if (error instanceof AppError && error.category === "validation") return false;

  // Retry network and system errors up to 3 times
  if (error instanceof AppError && error.retryable) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};

// ============================================================================
// TYPES
// ============================================================================

interface UsePulseOptions {
  limit?: number;
  autoRefetch?: boolean;
}

interface UsePulseReturn {
  // Query data
  pulseLogs: DailyPulseLog[];
  todaysPulse: DailyPulseLog | undefined;

  // Loading states
  isLoadingLogs: boolean;
  isLoadingToday: boolean;

  // Error states
  logsError: unknown;
  todayError: unknown;

  // Pulse actions
  createPulse: (data: CreateDailyPulseLogInput) => void;
  updatePulse: (logId: string, data: UpdateDailyPulseLogInput) => void;
  deletePulse: (logId: string) => void;

  // Mutation loading states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Utilities
  refetchLogs: () => void;
  refetchToday: () => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Provides queries and mutations for daily pulse logging with analytics and trends.
 *
 * @param options - Configuration for the hook
 * @param options.limit - Maximum number of pulse logs to fetch (default: 30)
 * @param options.autoRefetch - Whether queries should periodically refetch (defaults to true)
 * @returns An object exposing pulse log data, today's pulse, loading and error states,
 *          mutation actions (create/update/delete), and refetch utilities
 */
export function usePulse(options: UsePulseOptions = {}): UsePulseReturn {
  const { limit = 30, autoRefetch = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch pulse logs
  const pulseLogsQuery = useQuery({
    queryKey: queryKeys.wellness.pulse.list(limit),
    queryFn: async (): Promise<DailyPulseLog[]> => {
      const params = new URLSearchParams({ limit: String(limit) });
      const response = await apiClient.get<{ items: DailyPulseLog[]; total: number }>(
        `/api/omni-momentum/pulse?${params.toString()}`,
      );
      return response.items;
    },
    refetchInterval: autoRefetch ? 120000 : false, // Refresh every 2 minutes
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch today's pulse (disabled - endpoint not implemented yet)
  const todaysPulseQuery = useQuery({
    queryKey: queryKeys.wellness.pulse.byDate(new Date().toISOString().split("T")[0] ?? ""),
    queryFn: async (): Promise<DailyPulseLog | null> => {
      const today = new Date().toISOString().split("T")[0];
      if (!today) {
        throw new AppError("Failed to format today's date", "INTERNAL_ERROR", "system", false, 500);
      }

      const params = new URLSearchParams({ date: today });
      return await apiClient.get<DailyPulseLog | null>(
        `/api/omni-momentum/pulse/by-date?${params.toString()}`,
      );
    },
    enabled: false, // Disabled until endpoint is implemented
    refetchInterval: autoRefetch ? 60000 : false, // Refresh every minute
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  const createPulseMutation = useMutation({
    mutationFn: async (data: CreateDailyPulseLogInput): Promise<DailyPulseLog> => {
      return await apiClient.post<DailyPulseLog>("/api/omni-momentum/pulse", data);
    },
    onSuccess: (newPulse) => {
      // Add to pulse logs list
      queryClient.setQueryData<DailyPulseLog[]>(
        queryKeys.wellness.pulse.list(limit),
        (old) => {
          // Remove old pulse for same date if exists, then add new one
          const filtered = old?.filter((pulse) => pulse.logDate !== newPulse.logDate) ?? [];
          return [newPulse, ...filtered];
        },
      );

      // Update today's pulse if it's for today
      const today = new Date().toISOString().split("T")[0];
      if (newPulse.logDate === today) {
        queryClient.setQueryData(queryKeys.wellness.pulse.byDate(today), newPulse);
      }

      // Invalidate analytics
      queryClient.invalidateQueries({
        queryKey: queryKeys.wellness.pulse.analytics(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.summary() });

      toast({
        title: "Pulse logged",
        description: "Your wellness check-in has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to log pulse",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updatePulseMutation = useMutation({
    mutationFn: async ({
      logId,
      data,
    }: {
      logId: string;
      data: UpdateDailyPulseLogInput;
    }): Promise<DailyPulseLog> => {
      return await apiClient.put<DailyPulseLog>(`/api/omni-momentum/pulse/${logId}`, data);
    },
    // Optimistic update
    onMutate: async ({ logId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wellness.pulse.list(limit) });

      // Snapshot previous values for rollback
      const previousLogs = queryClient.getQueryData<DailyPulseLog[]>(
        queryKeys.wellness.pulse.list(limit),
      );

      // Optimistically update pulse logs
      queryClient.setQueryData<DailyPulseLog[]>(
        queryKeys.wellness.pulse.list(limit),
        (old) =>
          old?.map((pulse) => {
            if (pulse.id !== logId) return pulse;

            // Merge details if provided
            const mergedPulse = { ...pulse };
            if (data.details && typeof pulse.details === "object" && pulse.details !== null) {
              mergedPulse.details = {
                ...(pulse.details as Record<string, unknown>),
                ...(data.details as Record<string, unknown>),
              };
            }

            return mergedPulse;
          }),
      );

      // Return context for rollback
      return { previousLogs };
    },
    onSuccess: (updatedPulse) => {
      // Update with real data from server
      queryClient.setQueryData<DailyPulseLog[]>(
        queryKeys.wellness.pulse.list(limit),
        (old) =>
          old?.map((pulse) => (pulse.id === updatedPulse.id ? updatedPulse : pulse)) ?? [
            updatedPulse,
          ],
      );

      // Update today's pulse if it's for today
      const today = new Date().toISOString().split("T")[0];
      if (updatedPulse.logDate === today) {
        queryClient.setQueryData(queryKeys.wellness.pulse.byDate(today), updatedPulse);
      }

      // Invalidate analytics
      queryClient.invalidateQueries({
        queryKey: queryKeys.wellness.pulse.analytics(),
      });

      toast({
        title: "Pulse updated",
        description: "Your wellness check-in has been updated.",
      });
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousLogs) {
        queryClient.setQueryData(queryKeys.wellness.pulse.list(limit), context.previousLogs);
      }
      toast({
        title: "Failed to update pulse",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deletePulseMutation = useMutation({
    mutationFn: async (logId: string): Promise<void> => {
      await apiClient.delete(`/api/omni-momentum/pulse/${logId}`);
    },
    onSuccess: (...[, logId]) => {
      // Remove from pulse logs
      const removedPulse = pulseLogsQuery.data?.find((pulse) => pulse.id === logId);

      queryClient.setQueryData<DailyPulseLog[]>(
        queryKeys.wellness.pulse.list(limit),
        (old) => old?.filter((pulse) => pulse.id !== logId) ?? [],
      );

      // Clear today's pulse if it was today's
      if (removedPulse) {
        const today = new Date().toISOString().split("T")[0];
        if (removedPulse.logDate === today) {
          queryClient.setQueryData(queryKeys.wellness.pulse.byDate(today), null);
        }
      }

      // Invalidate analytics
      queryClient.invalidateQueries({
        queryKey: queryKeys.wellness.pulse.analytics(),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.summary() });

      toast({
        title: "Pulse deleted",
        description: "The wellness check-in has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete pulse",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // Query data
    pulseLogs: pulseLogsQuery.data ?? [],
    todaysPulse: todaysPulseQuery.data ?? undefined,

    // Loading states
    isLoadingLogs: pulseLogsQuery.isLoading,
    isLoadingToday: todaysPulseQuery.isLoading,

    // Error states
    logsError: pulseLogsQuery.error,
    todayError: todaysPulseQuery.error,

    // Pulse actions
    createPulse: createPulseMutation.mutate,
    updatePulse: (logId: string, data: UpdateDailyPulseLogInput) =>
      updatePulseMutation.mutate({ logId, data }),
    deletePulse: deletePulseMutation.mutate,

    // Mutation loading states
    isCreating: createPulseMutation.isPending,
    isUpdating: updatePulseMutation.isPending,
    isDeleting: deletePulseMutation.isPending,

    // Utilities
    refetchLogs: pulseLogsQuery.refetch,
    refetchToday: todaysPulseQuery.refetch,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for pulse analytics (trends, correlations, heatmap)
 */
export function usePulseAnalytics(period: "week" | "month" | "quarter" = "month") {
  return useQuery({
    queryKey: queryKeys.wellness.pulse.analytics(period),
    queryFn: async (): Promise<PulseAnalytics> => {
      const params = new URLSearchParams({ period });
      return await apiClient.get<PulseAnalytics>(
        `/api/omni-momentum/pulse/analytics?${params.toString()}`,
      );
    },
    staleTime: 60 * 60 * 1000, // 1 hour (analytics change slowly)
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}

/**
 * Hook for pulse log by specific date
 */
export function usePulseByDate(date: string) {
  return useQuery({
    queryKey: queryKeys.wellness.pulse.byDate(date),
    queryFn: async (): Promise<DailyPulseLog | null> => {
      const params = new URLSearchParams({ date });
      return await apiClient.get<DailyPulseLog | null>(
        `/api/omni-momentum/pulse/by-date?${params.toString()}`,
      );
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}
