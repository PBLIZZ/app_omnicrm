import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { AppError } from "@/lib/errors/app-error";
import type {
  Habit,
  HabitCompletion,
  HabitStreak,
  HabitAnalytics,
  HabitsSummary,
  HabitFilters,
  HabitCompletionFilters,
} from "@repo";
import type {
  CreateHabitInput,
  UpdateHabitInput,
  CreateHabitCompletionInput,
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

interface UseHabitsOptions {
  filters?: HabitFilters;
  autoRefetch?: boolean;
}

interface UseHabitsReturn {
  // Query data
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  summary: HabitsSummary | undefined;

  // Loading states
  isLoadingHabits: boolean;
  isLoadingCompletions: boolean;
  isLoadingSummary: boolean;

  // Error states
  habitsError: unknown;
  completionsError: unknown;

  // Habit actions
  createHabit: (data: CreateHabitInput) => void;
  updateHabit: (habitId: string, data: UpdateHabitInput) => void;
  deleteHabit: (habitId: string) => void;

  // Completion actions
  completeHabit: (habitId: string, valueCompleted?: number, completedDate?: string, notes?: string) => void;
  deleteCompletion: (completionId: string) => void;

  // Mutation loading states
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isCompleting: boolean;

  // Utilities
  refetchHabits: () => void;
  refetchCompletions: () => void;
  refetchSummary: () => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Provides queries and mutations for habit tracking with streak calculation,
 * completions, and wellness summary statistics.
 *
 * @param options - Configuration for the hook
 * @param options.filters - Optional filters for habit queries
 * @param options.autoRefetch - Whether queries should periodically refetch (defaults to true)
 * @returns An object exposing habit data, completions, summary stats, loading and error states,
 *          mutation actions (create/update/delete/complete), and refetch utilities
 */
export function useHabits(options: UseHabitsOptions = {}): UseHabitsReturn {
  const { filters, autoRefetch = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch habits
  const habitsQuery = useQuery({
    queryKey: queryKeys.wellness.habits.list(filters),
    queryFn: async (): Promise<Habit[]> => {
      const params = new URLSearchParams();
      if (filters?.isActive !== undefined) params.append("isActive", String(filters.isActive));

      const url = `/api/omni-momentum/habits${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await apiClient.get<{ items: Habit[]; total: number }>(url);
      return response.items;
    },
    refetchInterval: autoRefetch ? 60000 : false, // Refresh every 60 seconds
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch habit completions (today's completions)
  const completionsQuery = useQuery({
    queryKey: queryKeys.wellness.habits.completions(),
    queryFn: async (): Promise<HabitCompletion[]> => {
      // Get today's date in YYYY-MM-DD format
      const today = new Date().toISOString().split("T")[0];
      if (!today) {
        throw new AppError("Failed to format today's date", "INTERNAL_ERROR", "system", false, 500);
      }

      const params = new URLSearchParams({
        startDate: today,
        endDate: today,
      });

      const response = await apiClient.get<{ items: HabitCompletion[]; total: number }>(
        `/api/omni-momentum/habits/completions?${params.toString()}`,
      );
      return response.items;
    },
    refetchInterval: autoRefetch ? 60000 : false,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch habits summary (disabled - endpoint not implemented yet)
  const summaryQuery = useQuery({
    queryKey: queryKeys.wellness.summary(),
    queryFn: async (): Promise<HabitsSummary> => {
      return await apiClient.get<HabitsSummary>("/api/omni-momentum/habits/summary");
    },
    enabled: false, // Disabled until endpoint is implemented
    refetchInterval: autoRefetch ? 120000 : false, // Refresh every 2 minutes
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // ============================================================================
  // MUTATIONS - HABITS
  // ============================================================================

  const createHabitMutation = useMutation({
    mutationFn: async (data: CreateHabitInput): Promise<Habit> => {
      return await apiClient.post<Habit>("/api/omni-momentum/habits", data);
    },
    onSuccess: (newHabit) => {
      queryClient.setQueryData<Habit[]>(
        queryKeys.wellness.habits.list(filters),
        (old) => [newHabit, ...(old ?? [])],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.summary() });
      toast({
        title: "Habit created",
        description: `"${newHabit.name}" has been added to your wellness routine.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create habit",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateHabitMutation = useMutation({
    mutationFn: async ({
      habitId,
      data,
    }: {
      habitId: string;
      data: UpdateHabitInput;
    }): Promise<Habit> => {
      return await apiClient.put<Habit>(`/api/omni-momentum/habits/${habitId}`, data);
    },
    onSuccess: (updatedHabit) => {
      queryClient.setQueryData<Habit[]>(
        queryKeys.wellness.habits.list(filters),
        (old) =>
          old?.map((habit) => (habit.id === updatedHabit.id ? updatedHabit : habit)) ?? [
            updatedHabit,
          ],
      );
      toast({
        title: "Habit updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update habit",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (habitId: string): Promise<void> => {
      await apiClient.delete(`/api/omni-momentum/habits/${habitId}`);
    },
    onSuccess: (...[, habitId]) => {
      queryClient.setQueryData<Habit[]>(
        queryKeys.wellness.habits.list(filters),
        (old) => old?.filter((habit) => habit.id !== habitId) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.summary() });
      toast({
        title: "Habit deleted",
        description: "The habit has been removed from your routine.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete habit",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ============================================================================
  // MUTATIONS - COMPLETIONS
  // ============================================================================

  const completeHabitMutation = useMutation({
    mutationFn: async ({
      habitId,
      completedDate,
      notes,
      valueCompleted,
    }: {
      habitId: string;
      completedDate?: string;
      notes?: string;
      valueCompleted?: number;
    }): Promise<HabitCompletion> => {
      const today = new Date().toISOString().split("T")[0];
      if (!today) {
        throw new AppError("Failed to format date", "INTERNAL_ERROR", "system", false, 500);
      }

      const payload: CreateHabitCompletionInput = {
        habitId,
        completedDate: completedDate ?? today,
        ...(notes && { notes }),
        ...(valueCompleted !== undefined && { valueCompleted }),
      };

      return await apiClient.post<HabitCompletion>(
        `/api/omni-momentum/habits/${habitId}/completions`,
        payload,
      );
    },
    // Optimistic update - update UI immediately
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.wellness.habits.completions() });

      // Snapshot previous values for rollback
      const previousCompletions = queryClient.getQueryData<HabitCompletion[]>(
        queryKeys.wellness.habits.completions(),
      );

      // Optimistically add completion (we don't have full data yet, so just invalidate)
      // The onSuccess will handle the real update

      // Return context for rollback
      return { previousCompletions };
    },
    onSuccess: async (newCompletion) => {
      // Add to completions list
      queryClient.setQueryData<HabitCompletion[]>(
        queryKeys.wellness.habits.completions(),
        (old) => [newCompletion, ...(old ?? [])],
      );

      // Invalidate streak and analytics for this habit
      await queryClient.invalidateQueries({
        queryKey: queryKeys.wellness.habits.streak(newCompletion.habitId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.summary() });

      // Find habit name for toast
      const habits = queryClient.getQueryData<Habit[]>(queryKeys.wellness.habits.list(filters));
      const habit = habits?.find((h) => h.id === newCompletion.habitId);

      // Fetch updated streak to check for milestones
      const streakData = queryClient.getQueryData<HabitStreak>(
        queryKeys.wellness.habits.streak(newCompletion.habitId),
      );

      // Check for streak milestones and show celebration messages
      if (streakData && streakData.currentStreak > 0) {
        const streak = streakData.currentStreak;
        const celebrationMessages: Record<number, { title: string; description: string }> = {
          5: {
            title: "🔥 5-Day Streak!",
            description: habit
              ? `Amazing! You've completed "${habit.name}" for 5 days in a row!`
              : "You're building momentum!",
          },
          10: {
            title: "🌟 10-Day Streak!",
            description: habit
              ? `Incredible! "${habit.name}" is becoming a solid habit!`
              : "You're unstoppable!",
          },
          30: {
            title: "💎 30-Day Streak!",
            description: habit
              ? `Legendary! "${habit.name}" is now part of who you are!`
              : "This habit is locked in!",
          },
          90: {
            title: "👑 90-Day Streak!",
            description: habit
              ? `Masterful! "${habit.name}" - 90 days of pure dedication!`
              : "You're a wellness champion!",
          },
          100: {
            title: "💯 100-Day Streak!",
            description: habit
              ? `Phenomenal! "${habit.name}" - 100 days of excellence!`
              : "You've reached the 100-day milestone!",
          },
          365: {
            title: "🏆 One Year Streak!",
            description: habit
              ? `Extraordinary! "${habit.name}" - a full year of commitment!`
              : "You've completed a full year!",
          },
        };

        // Show celebration if this is a milestone
        if (celebrationMessages[streak]) {
          const celebration = celebrationMessages[streak];
          if (celebration) {
            toast({
              title: celebration.title,
              description: celebration.description,
            });
          }
        } else {
          // Regular completion message
          toast({
            title: "Habit completed",
            description: habit
              ? `Great job completing "${habit.name}"! 🔥 ${streak} day streak`
              : "Keep up the great work!",
          });
        }
      } else {
        // First completion or no streak data
        toast({
          title: "Habit completed",
          description: habit ? `Great job completing "${habit.name}"!` : "Keep up the great work!",
        });
      }
    },
    onError: (_error, _variables, context) => {
      // Rollback on error
      if (context?.previousCompletions) {
        queryClient.setQueryData(
          queryKeys.wellness.habits.completions(),
          context.previousCompletions,
        );
      }
      toast({
        title: "Failed to mark habit as complete",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteCompletionMutation = useMutation({
    mutationFn: async (completionId: string): Promise<void> => {
      await apiClient.delete(`/api/omni-momentum/habits/completions/${completionId}`);
    },
    onSuccess: (...[, completionId]) => {
      queryClient.setQueryData<HabitCompletion[]>(
        queryKeys.wellness.habits.completions(),
        (old) => old?.filter((completion) => completion.id !== completionId) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.wellness.summary() });
      toast({
        title: "Completion removed",
        description: "The completion has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to remove completion",
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
    habits: habitsQuery.data ?? [],
    habitCompletions: completionsQuery.data ?? [],
    summary: summaryQuery.data,

    // Loading states
    isLoadingHabits: habitsQuery.isLoading,
    isLoadingCompletions: completionsQuery.isLoading,
    isLoadingSummary: summaryQuery.isLoading,

    // Error states
    habitsError: habitsQuery.error,
    completionsError: completionsQuery.error,

    // Habit actions
    createHabit: createHabitMutation.mutate,
    updateHabit: (habitId: string, data: UpdateHabitInput) =>
      updateHabitMutation.mutate({ habitId, data }),
    deleteHabit: deleteHabitMutation.mutate,

    // Completion actions
    completeHabit: (habitId: string, valueCompleted?: number, completedDate?: string, notes?: string) =>
      completeHabitMutation.mutate({
        habitId,
        ...(valueCompleted !== undefined && { valueCompleted }),
        ...(completedDate && { completedDate }),
        ...(notes && { notes }),
      }),
    deleteCompletion: deleteCompletionMutation.mutate,

    // Mutation loading states
    isCreating: createHabitMutation.isPending,
    isUpdating: updateHabitMutation.isPending,
    isDeleting: deleteHabitMutation.isPending || deleteCompletionMutation.isPending,
    isCompleting: completeHabitMutation.isPending,

    // Utilities
    refetchHabits: habitsQuery.refetch,
    refetchCompletions: completionsQuery.refetch,
    refetchSummary: summaryQuery.refetch,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for specific habit with its streak information
 */
export function useHabitStreak(habitId: string) {
  return useQuery({
    queryKey: queryKeys.wellness.habits.streak(habitId),
    queryFn: async (): Promise<HabitStreak> => {
      const response = await apiClient.get<{ streak: HabitStreak }>(
        `/api/omni-momentum/habits/${habitId}/streak`,
      );
      return response.streak;
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}

/**
 * Hook for habit analytics (heatmap, weekly pattern, stats)
 */
export function useHabitAnalytics(habitId: string, days: number = 90) {
  return useQuery({
    queryKey: queryKeys.wellness.habits.analytics(habitId, days),
    queryFn: async (): Promise<HabitAnalytics> => {
      const params = new URLSearchParams({ days: String(days) });
      return await apiClient.get<HabitAnalytics>(
        `/api/omni-momentum/habits/${habitId}/analytics?${params.toString()}`,
      );
    },
    staleTime: 60 * 60 * 1000, // 1 hour (analytics change slowly)
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}

/**
 * Hook for habit completions within a date range
 */
export function useHabitCompletions(filters: HabitCompletionFilters) {
  return useQuery({
    queryKey: queryKeys.wellness.habits.completions(
      filters.habitId,
      filters.startDate,
      filters.endDate,
    ),
    queryFn: async (): Promise<HabitCompletion[]> => {
      const params = new URLSearchParams();
      if (filters.habitId) params.append("habitId", filters.habitId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);
      if (filters.limit) params.append("limit", String(filters.limit));

      const url = `/api/omni-momentum/habits/completions${params.toString() ? `?${params.toString()}` : ""}`;
      const response = await apiClient.get<{ items: HabitCompletion[]; total: number }>(url);
      return response.items;
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}
