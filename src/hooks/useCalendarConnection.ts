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
import { useState, useCallback } from "react";
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
  // Connection state
  isConnecting: boolean;
  isRefreshing: boolean;
  error: string | null;

  // Actions
  connect: () => void;
  refreshTokens: () => Promise<void>;
  clearError: () => void;
}

export function useCalendarConnection(): UseCalendarConnectionResult {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  // OAuth connection mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      // Redirect to Google Calendar OAuth
      window.location.href = "/api/google/calendar/oauth";
    },
    onError: (err) => {
      setError("Failed to start Google Calendar OAuth");
      createErrorHandler("Calendar OAuth")(err);
    },
  });

  // Token refresh mutation
  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post<{
        success: boolean;
        message?: string;
      }>("/api/google/calendar/refresh", {});

      if (!response.success) {
        throw new Error(response.message ?? "Failed to refresh tokens");
      }

      return response;
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
    onError: (err) => {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh tokens";
      setError(errorMessage);
      createErrorHandler("Token Refresh")(err);
    },
  });

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
