import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/server/db/schema";

// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (
    error instanceof Error &&
    (error.message.includes("fetch") || error.message.includes("network"))
  ) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};

// ============================================================================
// TYPES
// ============================================================================

interface TasksResponse {
  items: Task[];
  total: number;
}

interface CreateTaskBody {
  name: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  zoneUuid?: string; // Changed from zoneId (number) to zoneUuid (string/UUID)
  projectId?: string;
  parentTaskId?: string;
}

interface UpdateTaskBody {
  name?: string;
  description?: string;
  status?: "todo" | "in_progress" | "done" | "canceled";
  priority?: "low" | "medium" | "high" | "urgent";
  dueDate?: string;
  zoneUuid?: string; // Changed from zoneId (number) to zoneUuid (string/UUID)
  projectId?: string;
  parentTaskId?: string;
}

interface UseTasksOptions {
  filters?: {
    status?: string[];
    priority?: string[];
    zoneId?: number[];
    projectId?: string[];
    dueDate?: "today" | "this_week" | "overdue";
  };
  sort?: {
    field: "name" | "priority" | "dueDate" | "createdAt" | "updatedAt";
    direction: "asc" | "desc";
  };
  search?: string;
}

// ============================================================================
// MAIN HOOKS
// ============================================================================

/**
 * Fetch tasks with filtering, sorting, and search capabilities
 */
export function useTasks(options: UseTasksOptions = {}) {
  const { filters = {}, sort = { field: "createdAt", direction: "desc" }, search } = options;

  // Memoize filters and sort to prevent infinite loops
  const memoizedFilters = useMemo(() => filters, [JSON.stringify(filters)]);
  const memoizedSort = useMemo(() => sort, [JSON.stringify(sort)]);

  // Build query parameters
  const queryParams = new URLSearchParams();

  if (filters.status?.length) {
    queryParams.set("status", filters.status.join(","));
  }
  if (filters.priority?.length) {
    queryParams.set("priority", filters.priority.join(","));
  }
  if (filters.zoneId?.length) {
    queryParams.set("zoneId", filters.zoneId.join(","));
  }
  if (filters.projectId?.length) {
    queryParams.set("projectId", filters.projectId.join(","));
  }
  if (filters.dueDate) {
    queryParams.set("dueDate", filters.dueDate);
  }
  if (sort.field) {
    queryParams.set("sort", sort.field);
  }
  if (sort.direction) {
    queryParams.set("order", sort.direction);
  }
  if (search) {
    queryParams.set("search", search);
  }

  const queryString = queryParams.toString();
  const apiUrl = `/api/omni-momentum/tasks${queryString ? `?${queryString}` : ""}`;

  return useQuery({
    queryKey: queryKeys.tasks.list(memoizedFilters, memoizedSort, search),
    queryFn: async (): Promise<Task[]> => {
      const result = await apiClient.get<{ success: boolean; data: TasksResponse }>(apiUrl);
      return result.data?.items ?? [];
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Create a new task
 */
export function useCreateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTaskBody): Promise<Task> => {
      const result = await apiClient.post<{ success: boolean; data: Task }>(
        "/api/omni-momentum/tasks",
        data,
      );
      return result.data;
    },
    onSuccess: (newTask) => {
      // Invalidate and refetch tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      toast({
        title: "Task Created",
        description: `"${newTask.name}" has been added to your tasks.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Task",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Update an existing task
 */
export function useUpdateTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskBody;
    }): Promise<Task> => {
      const result = await apiClient.patch<{ success: boolean; data: Task }>(
        `/api/omni-momentum/tasks/${taskId}`,
        data,
      );
      return result.data;
    },
    onSuccess: (updatedTask) => {
      // Invalidate and refetch tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      toast({
        title: "Task Updated",
        description: `"${updatedTask.name}" has been updated.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Task",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Delete a task
 */
export function useDeleteTask() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      await apiClient.delete(`/api/omni-momentum/tasks/${taskId}`);
    },
    onSuccess: (_, taskId) => {
      // Invalidate and refetch tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      toast({
        title: "Task Deleted",
        description: "The task has been removed from your list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete Task",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}

/**
 * Toggle task completion status
 */
export function useToggleTaskComplete() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (taskId: string): Promise<Task> => {
      // First get the current task to determine new status
      const currentTasks = queryClient.getQueryData<Task[]>(queryKeys.tasks.all);
      const currentTask = currentTasks?.find((t) => t.id === taskId);

      if (!currentTask) {
        throw new Error("Task not found");
      }

      const newStatus = currentTask.status === "done" ? "todo" : "done";

      const result = await apiClient.patch<{ success: boolean; data: Task }>(
        `/api/omni-momentum/tasks/${taskId}`,
        { status: newStatus },
      );
      return result.data;
    },
    onSuccess: (updatedTask) => {
      // Invalidate and refetch tasks
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });

      const action = updatedTask.status === "done" ? "completed" : "reopened";
      toast({
        title: `Task ${action}`,
        description: `"${updatedTask.name}" has been ${action}.`,
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Task",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Get tasks grouped by time of day (Morning, Afternoon, Evening, Night)
 */
export function useTasksGroupedByTime(options: UseTasksOptions = {}) {
  const { data: tasks, isLoading, error } = useTasks(options);

  const groupedTasks =
    tasks?.reduce(
      (acc, task) => {
        const hour = new Date(task.createdAt).getHours();
        let timeGroup: string;

        if (hour >= 6 && hour < 12) {
          timeGroup = "Morning";
        } else if (hour >= 12 && hour < 17) {
          timeGroup = "Afternoon";
        } else if (hour >= 17 && hour < 22) {
          timeGroup = "Evening";
        } else {
          timeGroup = "Night";
        }

        if (!acc[timeGroup]) {
          acc[timeGroup] = [];
        }
        acc[timeGroup].push(task);
        return acc;
      },
      {} as Record<string, Task[]>,
    ) ?? {};

  return {
    groupedTasks,
    isLoading,
    error,
  };
}

/**
 * Get today's tasks
 */
export function useTodaysTasks() {
  const today = new Date().toISOString().split("T")[0];

  return useTasks({
    filters: {
      dueDate: "today",
    },
    sort: {
      field: "priority",
      direction: "desc",
    },
  });
}

/**
 * Get high priority tasks
 */
export function useHighPriorityTasks() {
  return useTasks({
    filters: {
      priority: ["high", "urgent"],
    },
    sort: {
      field: "dueDate",
      direction: "asc",
    },
  });
}

/**
 * Get overdue tasks
 */
export function useOverdueTasks() {
  return useTasks({
    filters: {
      dueDate: "overdue",
    },
    sort: {
      field: "dueDate",
      direction: "asc",
    },
  });
}
