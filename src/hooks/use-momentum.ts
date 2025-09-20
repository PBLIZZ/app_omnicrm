import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { shouldRetry } from "@/lib/errors/error-handling";
import type {
  MomentumWorkspaceDTO,
  CreateMomentumWorkspaceDTO,
  UpdateMomentumWorkspaceDTO,
  MomentumProjectDTO,
  CreateMomentumProjectDTO,
  UpdateMomentumProjectDTO,
  MomentumDTO,
  CreateMomentumDTO,
  UpdateMomentumDTO,
} from "@omnicrm/contracts";

// ============================================================================
// TYPES
// ============================================================================

interface UseMomentumOptions {
  workspaceId?: string;
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

interface TaskFilters {
  status?: string;
  parentTaskId?: string | null;
  projectId?: string;
  workspaceId?: string;
}

interface UseMomentumReturn {
  // Query data
  workspaces: MomentumWorkspaceDTO[];
  projects: MomentumProjectDTO[];
  tasks: MomentumDTO[];
  stats: MomentumStats | undefined;
  pendingTasks: MomentumDTO[];

  // Loading states
  isLoadingWorkspaces: boolean;
  isLoadingProjects: boolean;
  isLoadingTasks: boolean;
  isLoadingStats: boolean;
  isLoadingPending: boolean;

  // Error states
  workspacesError: unknown;
  projectsError: unknown;
  tasksError: unknown;

  // Workspace actions
  createWorkspace: (data: CreateMomentumWorkspaceDTO) => void;
  updateWorkspace: (workspaceId: string, data: UpdateMomentumWorkspaceDTO) => void;
  deleteWorkspace: (workspaceId: string) => void;

  // Project actions
  createProject: (data: CreateMomentumProjectDTO) => void;
  updateProject: (projectId: string, data: UpdateMomentumProjectDTO) => void;
  deleteProject: (projectId: string) => void;

  // Task actions
  createTask: (data: CreateMomentumDTO) => void;
  createSubtask: (parentTaskId: string, data: CreateMomentumDTO) => void;
  updateTask: (taskId: string, data: UpdateMomentumDTO) => void;
  deleteTask: (taskId: string) => void;
  approveTask: (taskId: string) => void;
  rejectTask: (taskId: string, deleteTask?: boolean, reason?: string) => void;

  // Mutation loading states
  isCreatingWorkspace: boolean;
  isCreatingProject: boolean;
  isCreatingTask: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isApproving: boolean;
  isRejecting: boolean;

  // Utilities
  refetchWorkspaces: () => void;
  refetchProjects: () => void;
  refetchTasks: () => void;
  refetchStats: () => void;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useMomentum(options: UseMomentumOptions = {}): UseMomentumReturn {
  const { workspaceId, projectId, autoRefetch = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch workspaces
  const workspacesQuery = useQuery({
    queryKey: queryKeys.momentum.workspaces(),
    queryFn: async (): Promise<MomentumWorkspaceDTO[]> => {
      return await apiClient.get<MomentumWorkspaceDTO[]>("/api/omni-momentum/workspaces");
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch projects
  const projectsQuery = useQuery({
    queryKey: queryKeys.momentum.projects(workspaceId),
    queryFn: async (): Promise<MomentumProjectDTO[]> => {
      const url = workspaceId
        ? `/api/omni-momentum/projects?workspaceId=${workspaceId}`
        : "/api/omni-momentum/projects";
      return await apiClient.get<MomentumProjectDTO[]>(url);
    },
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch tasks
  const tasksQuery = useQuery({
    queryKey: queryKeys.momentum.tasks({ workspaceId, projectId }),
    queryFn: async (): Promise<MomentumDTO[]> => {
      const params = new URLSearchParams();
      if (workspaceId) params.append("workspaceId", workspaceId);
      if (projectId) params.append("projectId", projectId);

      const url = `/api/omni-momentum/tasks${params.toString() ? `?${params.toString()}` : ""}`;
      return await apiClient.get<MomentumDTO[]>(url);
    },
    refetchInterval: autoRefetch ? 30000 : false,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch pending approval tasks
  const pendingTasksQuery = useQuery({
    queryKey: queryKeys.momentum.pendingTasks(),
    queryFn: async (): Promise<MomentumDTO[]> => {
      return await apiClient.get<MomentumDTO[]>("/api/omni-momentum/tasks/pending-approval");
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
  // MUTATIONS - WORKSPACES
  // ============================================================================

  const createWorkspaceMutation = useMutation({
    mutationFn: async (data: CreateMomentumWorkspaceDTO): Promise<MomentumWorkspaceDTO> => {
      return await apiClient.post<MomentumWorkspaceDTO>("/api/omni-momentum/workspaces", data);
    },
    onSuccess: (newWorkspace) => {
      queryClient.setQueryData<MomentumWorkspaceDTO[]>(
        queryKeys.momentum.workspaces(),
        (old) => [newWorkspace, ...(old ?? [])]
      );
      toast({
        title: "Workspace created",
        description: `"${newWorkspace.name}" has been created successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Failed to create workspace",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateWorkspaceMutation = useMutation({
    mutationFn: async ({
      workspaceId,
      data
    }: {
      workspaceId: string;
      data: UpdateMomentumWorkspaceDTO;
    }): Promise<MomentumWorkspaceDTO> => {
      return await apiClient.put<MomentumWorkspaceDTO>(`/api/omni-momentum/workspaces/${workspaceId}`, data);
    },
    onSuccess: (updatedWorkspace) => {
      queryClient.setQueryData<MomentumWorkspaceDTO[]>(
        queryKeys.momentum.workspaces(),
        (old) => old?.map(workspace =>
          workspace.id === updatedWorkspace.id ? updatedWorkspace : workspace
        ) ?? [updatedWorkspace]
      );
      toast({
        title: "Workspace updated",
        description: "Your changes have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update workspace",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteWorkspaceMutation = useMutation({
    mutationFn: async (workspaceId: string): Promise<void> => {
      await fetchDelete(`/api/omni-momentum/workspaces/${workspaceId}`);
    },
    onSuccess: (_, workspaceId) => {
      queryClient.setQueryData<MomentumWorkspaceDTO[]>(
        queryKeys.momentum.workspaces(),
        (old) => old?.filter(workspace => workspace.id !== workspaceId) ?? []
      );
      toast({
        title: "Workspace deleted",
        description: "The workspace has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to delete workspace",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // ============================================================================
  // MUTATIONS - PROJECTS
  // ============================================================================

  const createProjectMutation = useMutation({
    mutationFn: async (data: CreateMomentumProjectDTO): Promise<MomentumProjectDTO> => {
      return await fetchPost<MomentumProjectDTO>("/api/omni-momentum/projects", data);
    },
    onSuccess: (newProject) => {
      queryClient.setQueryData<MomentumProjectDTO[]>(
        queryKeys.momentum.projects(workspaceId),
        (old) => [newProject, ...(old ?? [])]
      );
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
      data
    }: {
      projectId: string;
      data: UpdateMomentumProjectDTO;
    }): Promise<MomentumProjectDTO> => {
      return await fetchPut<MomentumProjectDTO>(`/api/omni-momentum/projects/${projectId}`, data);
    },
    onSuccess: (updatedProject) => {
      queryClient.setQueryData<MomentumProjectDTO[]>(
        queryKeys.momentum.projects(workspaceId),
        (old) => old?.map(project =>
          project.id === updatedProject.id ? updatedProject : project
        ) ?? [updatedProject]
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
      await fetchDelete(`/api/omni-momentum/projects/${projectId}`);
    },
    onSuccess: (_, projectId) => {
      queryClient.setQueryData<MomentumProjectDTO[]>(
        queryKeys.momentum.projects(workspaceId),
        (old) => old?.filter(project => project.id !== projectId) ?? []
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
    mutationFn: async (data: CreateMomentumDTO): Promise<MomentumDTO> => {
      return await fetchPost<MomentumDTO>("/api/omni-momentum/tasks", data);
    },
    onSuccess: (newTask) => {
      queryClient.setQueryData<MomentumDTO[]>(
        queryKeys.momentum.tasks({ workspaceId, projectId }),
        (old) => [newTask, ...(old ?? [])]
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      toast({
        title: "Task created",
        description: `"${newTask.title}" has been created successfully.`,
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
      data
    }: {
      parentTaskId: string;
      data: CreateMomentumDTO;
    }): Promise<MomentumDTO> => {
      return await fetchPost<MomentumDTO>(`/api/omni-momentum/tasks/${parentTaskId}/subtasks`, data);
    },
    onSuccess: (newSubtask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.tasks({ workspaceId, projectId }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      toast({
        title: "Subtask created",
        description: `"${newSubtask.title}" has been created successfully.`,
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
      data
    }: {
      taskId: string;
      data: UpdateMomentumDTO;
    }): Promise<MomentumDTO> => {
      return await fetchPut<MomentumDTO>(`/api/omni-momentum/tasks/${taskId}`, data);
    },
    onSuccess: (updatedTask) => {
      queryClient.setQueryData<MomentumDTO[]>(
        queryKeys.momentum.tasks({ workspaceId, projectId }),
        (old) => old?.map(task =>
          task.id === updatedTask.id ? updatedTask : task
        ) ?? [updatedTask]
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
      await fetchDelete(`/api/omni-momentum/tasks/${taskId}`);
    },
    onSuccess: (_, taskId) => {
      queryClient.setQueryData<MomentumDTO[]>(
        queryKeys.momentum.tasks({ workspaceId, projectId }),
        (old) => old?.filter(task => task.id !== taskId) ?? []
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
    mutationFn: async (taskId: string): Promise<MomentumDTO> => {
      return await fetchPost<MomentumDTO>(`/api/omni-momentum/tasks/${taskId}/approve`, {});
    },
    onSuccess: (approvedTask) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.tasks({ workspaceId, projectId }) });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.pendingTasks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.stats() });
      toast({
        title: "Task approved",
        description: `"${approvedTask.title}" has been approved and added to your tasks.`,
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
      reason = ""
    }: {
      taskId: string;
      deleteTask?: boolean;
      reason?: string;
    }): Promise<MomentumDTO | { success: boolean; deleted: boolean }> => {
      return await fetchPost(`/api/omni-momentum/tasks/${taskId}/reject`, {
        deleteTask,
        reason,
      });
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.momentum.tasks({ workspaceId, projectId }) });
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
    workspaces: workspacesQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    stats: statsQuery.data,
    pendingTasks: pendingTasksQuery.data ?? [],

    // Loading states
    isLoadingWorkspaces: workspacesQuery.isLoading,
    isLoadingProjects: projectsQuery.isLoading,
    isLoadingTasks: tasksQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    isLoadingPending: pendingTasksQuery.isLoading,

    // Error states
    workspacesError: workspacesQuery.error,
    projectsError: projectsQuery.error,
    tasksError: tasksQuery.error,

    // Workspace actions
    createWorkspace: createWorkspaceMutation.mutate,
    updateWorkspace: (workspaceId: string, data: UpdateMomentumWorkspaceDTO) =>
      updateWorkspaceMutation.mutate({ workspaceId, data }),
    deleteWorkspace: deleteWorkspaceMutation.mutate,

    // Project actions
    createProject: createProjectMutation.mutate,
    updateProject: (projectId: string, data: UpdateMomentumProjectDTO) =>
      updateProjectMutation.mutate({ projectId, data }),
    deleteProject: deleteProjectMutation.mutate,

    // Task actions
    createTask: createTaskMutation.mutate,
    createSubtask: (parentTaskId: string, data: CreateMomentumDTO) =>
      createSubtaskMutation.mutate({ parentTaskId, data }),
    updateTask: (taskId: string, data: UpdateMomentumDTO) =>
      updateTaskMutation.mutate({ taskId, data }),
    deleteTask: deleteTaskMutation.mutate,
    approveTask: approveTaskMutation.mutate,
    rejectTask: (taskId: string, deleteTask?: boolean, reason?: string) =>
      rejectTaskMutation.mutate({ taskId, deleteTask, reason }),

    // Mutation loading states
    isCreatingWorkspace: createWorkspaceMutation.isPending,
    isCreatingProject: createProjectMutation.isPending,
    isCreatingTask: createTaskMutation.isPending || createSubtaskMutation.isPending,
    isUpdating: updateWorkspaceMutation.isPending || updateProjectMutation.isPending || updateTaskMutation.isPending,
    isDeleting: deleteWorkspaceMutation.isPending || deleteProjectMutation.isPending || deleteTaskMutation.isPending,
    isApproving: approveTaskMutation.isPending,
    isRejecting: rejectTaskMutation.isPending,

    // Utilities
    refetchWorkspaces: workspacesQuery.refetch,
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
  const { toast } = useToast();

  return useQuery({
    queryKey: queryKeys.momentum.project(projectId),
    queryFn: async (): Promise<{ project: MomentumProjectDTO; tasks: MomentumDTO[] }> => {
      const [project, tasks] = await Promise.all([
        fetchGet<MomentumProjectDTO>(`/api/omni-momentum/projects/${projectId}`),
        fetchGet<MomentumDTO[]>(`/api/omni-momentum/projects/${projectId}/tasks`)
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
    queryFn: async (): Promise<{ task: MomentumDTO; subtasks: MomentumDTO[] }> => {
      const [task, subtasks] = await Promise.all([
        fetchGet<MomentumDTO>(`/api/omni-momentum/tasks/${taskId}`),
        fetchGet<MomentumDTO[]>(`/api/omni-momentum/tasks/${taskId}/subtasks`)
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
    queryFn: async (): Promise<MomentumDTO[]> => {
      const tasks = await fetchGet<MomentumDTO[]>("/api/omni-momentum/tasks?status=todo&parentTaskId=null");
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
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        })
        .slice(0, 3); // Max 3 items per research findings
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}