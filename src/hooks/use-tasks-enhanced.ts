import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export interface Workspace {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  color: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  workspaceId: string;
  name: string;
  description?: string | null;
  color: string;
  status: string;
  dueDate?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  userId: string;
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  source?: string | null;
  notes?: string | null;
  stage?: string | null;
  tags?: string[] | null;
  confidenceScore?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  userId: string;
  workspaceId: string;
  projectId?: string | null;
  parentTaskId?: string | null;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignee: string;
  source: string;
  approvalStatus: string;
  taggedContacts?: string[] | null;
  dueDate?: Date | null;
  completedAt?: Date | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  aiContext?: unknown | null;
  createdAt: Date;
  updatedAt: Date;

  // Computed properties for compatibility
  completed: boolean;
  category?: string;
  aiSuggestedCategory?: string | null;
  color?: string;
}

export interface TaskFilters {
  searchQuery: string;
  selectedCategory: string;
  selectedStatus: "all" | "pending" | "completed";
}

interface TaskCreateData {
  workspaceId: string;
  projectId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assignee?: string;
  source?: string;
  taggedContacts?: string[];
  dueDate?: Date;
  estimatedMinutes?: number;
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
}

// Transform API response to component-friendly format
const transformTask = (apiTask: any): Task => ({
  id: apiTask.id,
  userId: apiTask.userId,
  workspaceId: apiTask.workspaceId,
  projectId: apiTask.projectId,
  parentTaskId: apiTask.parentTaskId,
  title: apiTask.title,
  description: apiTask.description,
  status: apiTask.status || "todo",
  priority: apiTask.priority || "medium",
  assignee: apiTask.assignee || "user",
  source: apiTask.source || "user",
  approvalStatus: apiTask.approvalStatus || "approved",
  taggedContacts: apiTask.taggedContacts,
  dueDate: apiTask.dueDate ? new Date(apiTask.dueDate) : null,
  completedAt: apiTask.completedAt ? new Date(apiTask.completedAt) : null,
  estimatedMinutes: apiTask.estimatedMinutes,
  actualMinutes: apiTask.actualMinutes,
  aiContext: apiTask.aiContext,
  createdAt: new Date(apiTask.createdAt),
  updatedAt: new Date(apiTask.updatedAt),

  // Computed properties
  completed: apiTask.status === "done" || !!apiTask.completedAt,
  category: mapStatusToCategory(apiTask.status),
  aiSuggestedCategory: null, // TODO: implement when AI categorization is ready
  color: apiTask.color || "#8B5CF6",
});

const mapStatusToCategory = (status: string): string => {
  // Map task status to wellness categories
  const statusMap: Record<string, string> = {
    todo: "administrative",
    in_progress: "administrative",
    waiting: "administrative",
    done: "administrative",
    cancelled: "administrative",
  };
  return statusMap[status] || "administrative";
};

export const useTasks = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all tasks
  const {
    data: tasksResponse,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/tasks"],
    queryFn: async () => {
      return apiRequest("/api/tasks");
    },
  });

  const tasks: Task[] = tasksResponse?.tasks?.map(transformTask) || [];

  // Get all workspaces
  const { data: workspacesResponse, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ["/api/workspaces"],
    queryFn: async () => {
      return apiRequest("/api/workspaces");
    },
  });

  const workspaces: Workspace[] = workspacesResponse?.workspaces || [];

  // Get all projects
  const { data: projectsResponse, isLoading: isLoadingProjects } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: async () => {
      return apiRequest("/api/projects");
    },
  });

  const projects: Project[] = projectsResponse?.projects || [];

  // Get all contacts
  const { data: contactsResponse, isLoading: isLoadingContacts } = useQuery({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      return apiRequest("/api/contacts");
    },
  });

  const contacts: Contact[] = contactsResponse?.contacts || [];

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: TaskCreateData) => {
      return apiRequest("/api/tasks", {
        method: "POST",
        body: JSON.stringify(taskData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task created successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: TaskUpdateData }) => {
      return apiRequest(`/api/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task updated successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Delete task mutation
  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Success",
        description: "Task deleted successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleTaskCompletion = (task: Task) => {
    const newStatus = task.completed ? "todo" : "done";
    updateTaskMutation.mutate({
      id: task.id,
      updates: {
        status: newStatus,
        ...(!task.completed && task.estimatedMinutes
          ? { actualMinutes: task.estimatedMinutes }
          : {}),
      },
    });
  };

  const createTask = (taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">) => {
    // Get default workspace ID - TODO: get from user's default workspace
    const defaultWorkspaceId = taskData.workspaceId || "b47ac10b-58cc-4372-a567-0e02b2c3d479"; // temporary default

    createTaskMutation.mutate({
      workspaceId: defaultWorkspaceId,
      projectId: taskData.projectId || undefined,
      title: taskData.title,
      description: taskData.description || undefined,
      status: taskData.status || "todo",
      priority: taskData.priority || "medium",
      assignee: taskData.assignee || "user",
      source: taskData.source || "user",
      taggedContacts: taskData.taggedContacts || undefined,
      dueDate: taskData.dueDate || undefined,
      estimatedMinutes: taskData.estimatedMinutes || undefined,
    });
  };

  const updateTask = ({ id, updates }: { id: string; updates: Partial<Task> }) => {
    const updateData: TaskUpdateData = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
    if (updates.taggedContacts !== undefined) updateData.taggedContacts = updates.taggedContacts;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
    if (updates.estimatedMinutes !== undefined)
      updateData.estimatedMinutes = updates.estimatedMinutes;
    if (updates.actualMinutes !== undefined) updateData.actualMinutes = updates.actualMinutes;

    updateTaskMutation.mutate({ id, updates: updateData });
  };

  const deleteTask = (taskId: string) => {
    deleteTaskMutation.mutate(taskId);
  };

  return {
    tasks,
    workspaces,
    projects,
    contacts,
    isLoading: isLoading || isLoadingWorkspaces || isLoadingProjects || isLoadingContacts,
    isLoadingTasks: isLoading,
    isLoadingWorkspaces,
    isLoadingProjects,
    isLoadingContacts,
    error,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
};
