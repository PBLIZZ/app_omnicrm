import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "../lib/drizzle";
import { tasks as tasksTable, type Task as DrizzleTask, type NewTask } from "../lib/schema";
import { eq, and, desc } from "drizzle-orm";
import { useToast } from "@/hooks/use-toast";

// Type mapping between Drizzle schema and component interface
export interface Task {
  id: string;
  userId: string;
  title: string; // Mapped from 'name' in DB
  description?: string;
  dueDate?: Date | null;
  completed: boolean; // Derived from status/completed_at
  category?: string; // Mapped from status for component compatibility
  aiSuggestedCategory?: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Additional fields from actual schema
  status: string;
  priority: string;
  color: string;
  workspaceId: string;
  projectId?: string | null;
  assignee?: string | null;
  completedAt?: Date | null;
}

// Transform Drizzle task to component Task interface
const transformTaskFromDb = (dbTask: DrizzleTask): Task => ({
  id: dbTask.id,
  userId: dbTask.user_id,
  title: dbTask.name, // Map 'name' to 'title'
  description: dbTask.description || undefined,
  dueDate: dbTask.due_date,
  completed: dbTask.status === 'completed' || !!dbTask.completed_at,
  category: mapStatusToCategory(dbTask.status), // Map status to category
  aiSuggestedCategory: null, // Not in schema
  createdAt: dbTask.created_at!,
  updatedAt: dbTask.updated_at!,
  status: dbTask.status || 'todo',
  priority: dbTask.priority || 'medium',
  color: dbTask.color || '#8B5CF6',
  workspaceId: dbTask.workspace_id,
  projectId: dbTask.project_id,
  assignee: dbTask.assignee,
  completedAt: dbTask.completed_at,
});

// Transform component Task to Drizzle insert/update
const transformTaskForDb = (
  task: Omit<Task, "id" | "createdAt" | "updatedAt">,
  workspaceId: string = 'default-workspace-id'
): Omit<NewTask, 'id' | 'created_at' | 'updated_at'> => ({
  name: task.title, // Map 'title' to 'name'
  description: task.description || null,
  status: task.completed ? 'completed' : mapCategoryToStatus(task.category),
  priority: task.priority || 'medium',
  color: task.color || '#8B5CF6',
  workspace_id: workspaceId,
  project_id: task.projectId || null,
  user_id: task.userId,
  assignee: task.assignee || null,
  due_date: task.dueDate,
  completed_at: task.completed ? new Date() : null,
});

// Map category to status for DB storage
const mapCategoryToStatus = (category?: string): string => {
  const categoryMap: Record<string, string> = {
    'client-care': 'todo',
    'business-development': 'todo',
    'administrative': 'todo',
    'content-creation': 'todo',
    'personal-wellness': 'todo',
  };
  return categoryMap[category || ''] || 'todo';
};

// Map status to category for component
const mapStatusToCategory = (status?: string | null): string => {
  // Default to 'administrative' - you can customize this mapping
  return 'administrative';
};

export const useTasks = (userId: string = "default-user") => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get all tasks for user
  const {
    data: tasks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["/api/tasks", userId],
    queryFn: async () => {
      const result = await db
        .select()
        .from(tasksTable)
        .where(eq(tasksTable.user_id, userId))
        .orderBy(desc(tasksTable.created_at));
      
      return result.map(transformTaskFromDb);
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (taskData: Omit<Task, "id" | "createdAt" | "updatedAt">) => {
      const taskForDb = transformTaskForDb({ ...taskData, userId }, 'default-workspace-id');
      
      const [newTask] = await db
        .insert(tasksTable)
        .values(taskForDb)
        .returning();
      
      return transformTaskFromDb(newTask);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", userId] });
      toast({
        title: "Success",
        description: "Task created successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to create task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Update task mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      const updateData: Partial<DrizzleTask> = {};
      
      if (updates.title !== undefined) updateData.name = updates.title;
      if (updates.description !== undefined) updateData.description = updates.description;
      if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate;
      if (updates.completed !== undefined) {
        updateData.status = updates.completed ? 'completed' : 'todo';
        updateData.completed_at = updates.completed ? new Date() : null;
      }
      if (updates.category !== undefined) {
        updateData.status = mapCategoryToStatus(updates.category);
      }
      if (updates.priority !== undefined) updateData.priority = updates.priority;
      if (updates.color !== undefined) updateData.color = updates.color;
      if (updates.assignee !== undefined) updateData.assignee = updates.assignee;
      
      updateData.updated_at = new Date();

      const [updatedTask] = await db
        .update(tasksTable)
        .set(updateData)
        .where(and(eq(tasksTable.id, id), eq(tasksTable.user_id, userId)))
        .returning();

      return transformTaskFromDb(updatedTask);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", userId] });
      toast({
        title: "Success",
        description: "Task updated successfully!",
      });
    },
    onError: (error: Error) => {
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
      await db
        .delete(tasksTable)
        .where(and(eq(tasksTable.id, taskId), eq(tasksTable.user_id, userId)));
      
      return taskId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", userId] });
      toast({
        title: "Success",
        description: "Task deleted successfully!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Failed to delete task: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const toggleTaskCompletion = (task: Task) => {
    updateTaskMutation.mutate({
      id: task.id,
      updates: { completed: !task.completed },
    });
  };

  return {
    tasks,
    isLoading,
    error,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    toggleTaskCompletion,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
};