/**
 * Calendar Connection Hook
 *
 * Manages Google Calendar OAuth flow and connection state following
 * the proven OmniConnect pattern for consistency.
 *
 * Responsibilities:
 * - OAuth flow handling
 * - Token refresh logic
 * - Connection status management
 * - Error handling and recovery
 */
import { useState, useCallback, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
// Direct error handling (no abstraction)
const createErrorHandler = (context: string) => (error: unknown) => {
  const message = error instanceof Error ? error.message : "An unknown error occurred";
  toast.error(`${context} Failed`, { description: message });

  // Log for debugging (development only)
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}] Error:`, error);
  }
};

export interface CalendarConnectionStatus {
  isConnected: boolean;
  upcomingEventsCount: number;
  reason?: string;
  hasRefreshToken?: boolean;
}

export interface UseCalendarConnectionResult {
  isConnecting: boolean;
  isRefreshing: boolean;
  error: string | null;
  connect: () => void;
  refreshTokens: () => Promise<void>;
  clearError: () => void;
}

interface CalendarRefreshResponse {
  success: boolean;
  message?: string;
}

/**
 * Manage Google Calendar OAuth connection, token refresh, and related connection state.
 *
 * Provides state flags for ongoing operations, an error surface, and actions to start the OAuth flow,
 * refresh tokens, and clear errors. Calling `connect` initiates the OAuth redirect; calling
 * `refreshTokens` attempts to refresh Calendar tokens and, on success, invalidates calendar-related
 * queries. On failure, the hook updates the `error` state and invokes the configured error handler.
 *
 * @returns An object containing:
 *  - `isConnecting`: whether the OAuth initiation is in progress
 *  - `isRefreshing`: whether a token refresh is in progress
 *  - `error`: current error message or `null`
 *  - `connect()`: starts the Google Calendar OAuth flow (redirect)
 *  - `refreshTokens()`: refreshes Calendar tokens and refreshes related queries on success
 *  - `clearError()`: clears the current error
 */
export function useCalendarConnection(): UseCalendarConnectionResult {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // Stable mutation configurations
  const connectMutationConfig = useMemo(
    () => ({
      mutationFn: async () => {
        // Redirect to new Calendar connect endpoint
        window.location.href = "/api/google/calendar/connect";
      },
      onError: (err: unknown) => {
        setError("Failed to start Google Calendar OAuth");
        createErrorHandler("Calendar OAuth")(err);
      },
    }),
    [],
  );

  const refreshMutationConfig = useMemo(
    () => ({
      mutationFn: async () => {
        const result = await apiClient.post<CalendarRefreshResponse>(
          "/api/google/calendar/refresh",
          {},
        );

        if (!result.success) {
          throw new Error(result.message ?? "Failed to refresh tokens");
        }

        return result;
      },
      onMutate: () => {
        toast.info("Refreshing Google Calendar tokens...");
      },
      onSuccess: () => {
        toast.success("Tokens refreshed", {
          description: "Google Calendar tokens have been refreshed successfully.",
        });
        setError(null);

        // Invalidate all calendar-related queries to refresh with new tokens
        void queryClient.invalidateQueries({ queryKey: queryKeys.google.calendar.all });
        void queryClient.invalidateQueries({ queryKey: queryKeys.google.status() });
        void queryClient.invalidateQueries({ queryKey: queryKeys.omniConnect.dashboard() });
      },
      onError: (err: unknown) => {
        const errorMessage = err instanceof Error ? err.message : "Failed to refresh tokens";
        setError(errorMessage);
        createErrorHandler("Token Refresh")(err);
      },
    }),
    [queryClient],
  );

  // OAuth connection mutation
  const connectMutation = useMutation(connectMutationConfig);

  // Token refresh mutation
  const refreshMutation = useMutation(refreshMutationConfig);

  // Actions
  const connect = useCallback(() => {
    setError(null);
    connectMutation.mutate();
  }, [connectMutation]);

  const refreshTokens = useCallback(async () => {
    setError(null);
    await refreshMutation.mutateAsync();
  }, [refreshMutation]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isConnecting: connectMutation.isPending,
    isRefreshing: refreshMutation.isPending,
    error,

    // Actions
    connect,
    refreshTokens,
    clearError,
  };
}
