// Unified task operations hook - consolidates 4 existing task hooks
// Handles CRUD operations, filtering, and basic task management
// Max 300 lines as per architecture rules

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Task } from "@/server/db/schema";

// Core interfaces
interface TaskCreateData {
  workspaceId: string;
  projectId?: string;
  parentTaskId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  source?: string;
  taggedContacts?: string[];
  dueDate?: Date;
  estimatedMinutes?: number;
  aiContext?: unknown;
}

interface TaskUpdateData {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  taggedContacts?: string[];
  dueDate?: Date;
  estimatedMinutes?: number;
  actualMinutes?: number;
  aiContext?: unknown;
}

interface TaskFilters {
  workspaceId?: string;
  projectId?: string;
  status?: string;
  assignee?: string;
  approvalStatus?: string;
  parentTaskId?: string | null;
}

// Main hook for task operations
export function useTaskOperations(filters?: TaskFilters) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build query key based on filters
  const queryKey = ["/api/tasks", filters || {}];

  // Fetch tasks with optional filters
  const {
    data: tasksResponse,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters?.workspaceId) params.append("workspaceId", filters.workspaceId);
      if (filters?.projectId) params.append("projectId", filters.projectId);
      if (filters?.status) params.append("status", filters.status);
      if (filters?.assignee) params.append("assignee", filters.assignee);
      if (filters?.approvalStatus) params.append("approvalStatus", filters.approvalStatus);
      if (filters?.parentTaskId !== undefined) {
        params.append("parentTaskId", filters.parentTaskId || "");
      }

      const url = params.toString() ? `/api/tasks?${params.toString()}` : "/api/tasks";
      return apiRequest(url);
    },
  });

  const tasks: Task[] = tasksResponse?.tasks || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskCreateData) => {
      return apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate?.toISOString(),
        }),
      });
    },
    onSuccess: (response) => {
      // Invalidate all task queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      toast({
        title: "Task Created",
        description: "Your task has been created successfully.",
      });

      return response.task;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TaskUpdateData }) => {
      return apiRequest(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...data,
          dueDate: data.dueDate?.toISOString(),
        }),
      });
    },
    onSuccess: (response, { id }) => {
      // Update specific task in cache
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      toast({
        title: "Task Updated",
        description: "Your task has been updated successfully.",
      });

      return response.task;
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
    },
    onSuccess: (_, taskId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      toast({
        title: "Task Deleted",
        description: "The task has been deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
      throw error;
    },
  });

  // Bulk operations
  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ taskIds, data }: { taskIds: string[]; data: Partial<TaskUpdateData> }) => {
      const promises = taskIds.map(id => 
        apiRequest(`/api/tasks/${id}`, {
          method: "PUT",
          body: JSON.stringify(data),
        })
      );
      return Promise.all(promises);
    },
    onSuccess: (_, { taskIds }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      
      toast({
        title: "Tasks Updated",
        description: `${taskIds.length} tasks have been updated successfully.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update tasks: ${error.message || "Unknown error"}`,
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const createTask = (data: TaskCreateData) => {
    return createTaskMutation.mutateAsync(data);
  };

  const updateTask = (id: string, data: TaskUpdateData) => {
    return updateTaskMutation.mutateAsync({ id, data });
  };

  const deleteTask = (taskId: string) => {
    return deleteTaskMutation.mutateAsync(taskId);
  };

  const bulkUpdateTasks = (taskIds: string[], data: Partial<TaskUpdateData>) => {
    return bulkUpdateMutation.mutateAsync({ taskIds, data });
  };

  const toggleTaskStatus = (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === "done" ? "todo" : "done";
    const updateData: TaskUpdateData = { 
      status: newStatus,
      ...(newStatus === "done" && { actualMinutes: tasks.find(t => t.id === taskId)?.estimatedMinutes || undefined })
    };
    return updateTask(taskId, updateData);
  };

  // Get task by ID helper
  const getTaskById = (taskId: string): Task | undefined => {
    return tasks.find(task => task.id === taskId);
  };

  // Get subtasks helper
  const getSubtasks = (parentTaskId: string): Task[] => {
    return tasks.filter(task => task.parentTaskId === parentTaskId);
  };

  return {
    // Data
    tasks,
    isLoading,
    error,
    
    // Actions
    createTask,
    updateTask,
    deleteTask,
    bulkUpdateTasks,
    toggleTaskStatus,
    refetch,
    
    // Helpers
    getTaskById,
    getSubtasks,
    
    // Loading states
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
    isBulkUpdating: bulkUpdateMutation.isPending,
    
    // Mutation objects for advanced usage
    createTaskMutation,
    updateTaskMutation,
    deleteTaskMutation,
    bulkUpdateMutation,
  };
}