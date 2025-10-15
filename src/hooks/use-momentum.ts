import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { AppError } from "@/lib/errors/app-error";

// Retry logic using existing AppError system
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
import type {
  Project,
  CreateProjectInput,
  UpdateProjectInput,
  Task,
  CreateTaskInput,
  UpdateTaskInput,
} from "@/server/db/business-schemas";

// ============================================================================
// TYPES
// ============================================================================

interface UseMomentumOptions {
  projectId?: string;
  autoRefetch?: boolean;
}

interface MomentumStats {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  pendingApproval: number;
}

interface UseMomentumReturn {
  // Query data
  projects: Project[];
  tasks: Task[];
  stats: MomentumStats | undefined;
  pendingTasks: Task[];

  // Loading states
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isLoadingStats: boolean;
  isLoadingPending: boolean;

  // Error states
  projectsError: unknown;
  tasksError: unknown;

  // Project actions
  createProject: (data: CreateProjectInput) => void;
  updateProject: (projectId: string, data: UpdateProjectInput) => void;
  deleteProject: (projectId: string) => void;

  // Task actions
  createTask: (data: CreateTaskInput) => void;
  createSubtask: (parentTaskId: string, data: CreateTaskInput) => void;
  updateTask: (taskId: string, data: UpdateTaskInput) => void;
  deleteTask: (taskId: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, deleteTask?: boolean, reason?: string) => void;

  // Mutation loading states
  isCreatingProject: boolean;
  isCreatingTask: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isApproving: boolean;
  isRejecting: boolean;

  // Utilities
  refetchProjects: () => void;
  refetchTasks: () => void;
  refetchStats: () => void;
}

// ============================================================================
// MAIN HOOK
/**
 * Provides queries and mutations for Momentum projects, tasks, pending approvals, and statistics with cache updates and optional automatic refetching.
 *
 * @param options - Configuration for the hook.
 * @param options.projectId - If provided, scope task queries and task-related cache updates to this project.
 * @param options.autoRefetch - Whether queries should periodically refetch (defaults to `true`).
 * @returns An object exposing project and task data, pending tasks and stats, loading and error states, mutation actions (create/update/delete/approve/reject), aggregated mutation loading flags, and refetch utilities.
 */

export function useMomentum(options: UseMomentumOptions = {}): UseMomentumReturn {
  const { projectId, autoRefetch = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch projects
  const projectsQuery = useQuery({
    queryKey: queryKeys.momentum.all,
    queryFn: async (): Promise<Project[]> => {
      return await apiClient.get<Project[]>("/api/omni-momentum/projects");
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch tasks
  const tasksQuery = useQuery({
    queryKey: queryKeys.momentum.tasks(projectId ? { projectId } : {}),
    queryFn: async (): Promise<Task[]> => {
      const params = new URLSearchParams();
      if (projectId) params.append("projectId", projectId);

      const url = `/api/omni-momentum/tasks${params.toString() ? `?${params.toString()}` : ""}`;
      return await apiClient.get<Task[]>(url);
    },
    refetchInterval: autoRefetch ? 30000 : false,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch pending approval tasks
  const pendingTasksQuery = useQuery({
    queryKey: queryKeys.momentum.pendingTasks(),
    queryFn: async (): Promise<Task[]> => {
      return await apiClient.get<Task[]>("/api/omni-momentum/tasks/pending-approval");
    },
    refetchInterval: autoRefetch ? 60000 : false,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch momentum statistics
  const statsQuery = useQuery({
    queryKey: queryKeys.momentum.stats(),
    queryFn: async (): Promise<MomentumStats> => {
      return await apiClient.get<MomentumStats>("/api/omni-momentum/stats");
    },
    refetchInterval: autoRefetch ? 60000 : false,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // ============================================================================
  // MUTATIONS - PROJECTS
  // ============================================================================

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateProjectInput): Promise<Project> => {
      return await apiClient.post<Project>("/api/omni-momentum/projects", data);
    },
    onSuccess: (newProject) => {
      queryClient.setQueryData<Project[]>(queryKeys.momentum.all, (old) => [
        newProject,
        ...(old ?? []),
      ]);
      toast({
        title: "Project created",
        description: `"${newProject.name}" has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create project",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateProjectMutation = useMutation({
    mutationFn: async ({
      projectId,
      data,
    }: {
      projectId: string;
      data: UpdateProjectInput;
    }): Promise<Project> => {
      return await apiClient.put<Project>(`/api/omni-momentum/projects/${projectId}`, data);
    },
    onSuccess: (updatedProject) => {
      queryClient.setQueryData<Project[]>(
        queryKeys.momentum.all,
        (old) =>
          old?.map((project) => (project.id === updatedProject.id ? updatedProject : project)) ?? [
            updatedProject,
          ],
      );
      toast({
        title: "Project updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update project",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: async (projectId: string): Promise<void> => {
      await apiClient.delete(`/api/omni-momentum/projects/${projectId}`);
    },
    onSuccess: (...[, projectId]) => {
      queryClient.setQueryData<Project[]>(
        queryKeys.momentum.all,
        (old) => old?.filter((project) => project.id !== projectId) ?? [],
      );
      toast({
        title: "Project deleted",
        description: "The project has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete project",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ============================================================================
  // MUTATIONS - TASKS
  // ============================================================================

  const createTaskMutation = useMutation({
    mutationFn: async (data: CreateTaskInput): Promise<Task> => {
      return await apiClient.post<Task>("/api/omni-momentum/tasks", data);
    },
    onSuccess: (newTask) => {
      queryClient.setQueryData<Task[]>(
        queryKeys.momentum.tasks(projectId ? { projectId } : {}),
        (old) => [newTask, ...(old ?? [])],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      toast({
        title: "Task created",
        description: `"${newTask.name}" has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create task",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const createSubtaskMutation = useMutation({
    mutationFn: async ({
      parentTaskId,
      data,
    }: {
      parentTaskId: string;
      data: CreateTaskInput;
    }): Promise<Task> => {
      return await apiClient.post<Task>(`/api/omni-momentum/tasks/${parentTaskId}/subtasks`, data);
    },
    onSuccess: (newSubtask) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.momentum.tasks(projectId ? { projectId } : {}),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      toast({
        title: "Subtask created",
        description: `"${newSubtask.name}" has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create subtask",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: UpdateTaskInput;
    }): Promise<Task> => {
      return await apiClient.put<Task>(`/api/omni-momentum/tasks/${taskId}`, data);
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<Task[]>(
        queryKeys.momentum.tasks(projectId ? { projectId } : {}),
        (old) =>
          old?.map((task) => (task.id === updatedTask.id ? updatedTask : task)) ?? [updatedTask],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      toast({
        title: "Task updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update task",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      await apiClient.delete(`/api/omni-momentum/tasks/${taskId}`);
    },
    onSuccess: (...[, taskId]) => {
      queryClient.setQueryData<Task[]>(
        queryKeys.momentum.tasks(projectId ? { projectId } : {}),
        (old) => old?.filter((task) => task.id !== taskId) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.pendingTasks() });
      toast({
        title: "Task deleted",
        description: "The task has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete task",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const approveTaskMutation = useMutation({
    mutationFn: async (taskId: string): Promise<Task> => {
      return await apiClient.post<Task>(`/api/omni-momentum/tasks/${taskId}/approve`, {});
    },
    onSuccess: (approvedTask) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.momentum.tasks(projectId ? { projectId } : {}),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.pendingTasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      toast({
        title: "Task approved",
        description: `"${approvedTask.name}" has been approved and added to your tasks.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to approve task",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      deleteTask = false,
      reason = "",
    }: {
      taskId: string;
      deleteTask?: boolean;
      reason?: string;
    }): Promise<Task | { success: boolean; deleted: boolean }> => {
      return await apiClient.post(`/api/omni-momentum/tasks/${taskId}/reject`, {
        deleteTask,
        reason,
      });
    },
    onSuccess: (...[, variables]) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.momentum.tasks(projectId ? { projectId } : {}),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.pendingTasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });

      const message = variables.deleteTask ? "Task rejected and deleted" : "Task rejected";
      toast({
        title: message,
        description: "The AI suggestion has been rejected.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to reject task",
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
    projects: projectsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    stats: statsQuery.data,
    pendingTasks: pendingTasksQuery.data ?? [],

    // Loading states
    isLoadingProjects: projectsQuery.isLoading,
    isLoadingTasks: tasksQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingPending: pendingTasksQuery.isLoading,

    // Error states
    projectsError: projectsQuery.error,
    tasksError: tasksQuery.error,

    // Project actions
    createProject: createProjectMutation.mutate,
    updateProject: (projectId: string, data: UpdateProjectInput) =>
      updateProjectMutation.mutate({ projectId, data }),
    deleteProject: deleteProjectMutation.mutate,

    // Task actions
    createTask: createTaskMutation.mutate,
    createSubtask: (parentTaskId: string, data: CreateTaskInput) =>
      createSubtaskMutation.mutate({ parentTaskId, data }),
    updateTask: (taskId: string, data: UpdateTaskInput) =>
      updateTaskMutation.mutate({ taskId, data }),
    deleteTask: deleteTaskMutation.mutate,
    approveTask: approveTaskMutation.mutate,
    rejectTask: (taskId: string, deleteTask?: boolean, reason?: string) => {
      const payload: { taskId: string; deleteTask?: boolean; reason?: string } = { taskId };
      if (deleteTask !== undefined) payload.deleteTask = deleteTask;
      if (reason !== undefined) payload.reason = reason;
      rejectTaskMutation.mutate(payload);
    },

    // Mutation loading states
    isCreatingProject: createProjectMutation.isPending,
    isCreatingTask: createTaskMutation.isPending || createSubtaskMutation.isPending,
    isUpdating: updateProjectMutation.isPending || updateTaskMutation.isPending,
    isDeleting: deleteProjectMutation.isPending || deleteTaskMutation.isPending,
    isApproving: approveTaskMutation.isPending,
    isRejecting: rejectTaskMutation.isPending,

    // Utilities
    refetchProjects: projectsQuery.refetch,
    refetchTasks: tasksQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for specific project with its tasks
 */
export function useProject(projectId: string) {
  return useQuery({
    queryKey: queryKeys.momentum.project(projectId),
    queryFn: async (): Promise<{ project: Project; tasks: Task[] }> => {
      const [project, tasks] = await Promise.all([
        apiClient.get<Project>(`/api/omni-momentum/projects/${projectId}`),
        apiClient.get<Task[]>(`/api/omni-momentum/projects/${projectId}/tasks`),
      ]);
      return { project, tasks };
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}

/**
 * Hook for task with its subtasks
 */
export function useTaskWithSubtasks(taskId: string) {
  return useQuery({
    queryKey: queryKeys.momentum.taskWithSubtasks(taskId),
    queryFn: async (): Promise<{ task: Task; subtasks: Task[] }> => {
      const [task, subtasks] = await Promise.all([
        apiClient.get<Task>(`/api/omni-momentum/tasks/${taskId}`),
        apiClient.get<Task[]>(`/api/omni-momentum/tasks/${taskId}/subtasks`),
      ]);
      return { task, subtasks };
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}

/**
 * Hook for today's focus tasks (top 3 priorities)
 */
export function useTodaysFocus() {
  return useQuery({
    queryKey: queryKeys.momentum.todaysFocus(),
    queryFn: async (): Promise<Task[]> => {
      const tasks = await apiClient.get<Task[]>(
        "/api/omni-momentum/tasks?status=todo&parentTaskId=null",
      );
      // Return top 3 tasks sorted by priority and due date
      return tasks
        .sort((a, b) => {
          // Priority order: urgent > high > medium > low
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;

          if (aPriority !== bPriority) {
            return bPriority - aPriority; // Higher priority first
          }

          // If same priority, sort by due date (closest first)
          if (a.dueDate && b.dueDate) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          }
          if (a.dueDate) return -1; // Tasks with due dates come first
          if (b.dueDate) return 1;

          // Fall back to creation date
          const aCreated = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bCreated = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bCreated - aCreated;
        })
        .slice(0, 3); // Max 3 items per research findings
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}
