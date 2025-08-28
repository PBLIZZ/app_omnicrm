import { useMemo } from "react";
import { useTasks, Task, Workspace, Project, Contact } from "@/hooks/use-tasks-enhanced";
import { EnhancedTask, enhanceTask, filterTasksForView, sortTasksForView } from "@/lib/task-utils";

export interface TaskFiltersEnhanced {
  searchQuery: string;
  selectedStatus: string;
  selectedPriority: string;
  selectedUrgency: string;
  selectedQuadrant: number | null;
  selectedWorkspace: string;
  selectedProject: string;
  selectedCategory: string;
}

export interface TaskViewConfig {
  view: "list" | "kanban" | "eisenhower";
  sortBy: "dueDate" | "priority" | "status" | "created" | "urgency" | "quadrant";
  sortOrder: "asc" | "desc";
  filters: TaskFiltersEnhanced;
}

export const useTasksInbox = () => {
  const {
    tasks: rawTasks,
    workspaces,
    projects,
    contacts,
    isLoading,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    isCreating,
    isUpdating,
    isDeleting,
    error,
  } = useTasks();

  // Transform raw tasks to enhanced tasks with computed fields
  const enhancedTasks: EnhancedTask[] = useMemo(() => {
    if (!rawTasks.length) return [];

    return rawTasks.map((task) =>
      enhanceTask(
        task,
        contacts,
        workspaces.map((w) => ({ id: w.id, name: w.name })),
        projects.map((p) => ({ id: p.id, name: p.name })),
      ),
    );
  }, [rawTasks, contacts, workspaces, projects]);

  // Get tasks for specific views with filtering and sorting
  const getTasksForView = (config: TaskViewConfig): EnhancedTask[] => {
    const filtered = filterTasksForView(enhancedTasks, config.view, {
      status: config.filters.selectedStatus !== "all" ? config.filters.selectedStatus : undefined,
      priority:
        config.filters.selectedPriority !== "all" ? config.filters.selectedPriority : undefined,
      urgency:
        config.filters.selectedUrgency !== "all" ? config.filters.selectedUrgency : undefined,
      quadrant: config.filters.selectedQuadrant || undefined,
      workspace:
        config.filters.selectedWorkspace !== "all" ? config.filters.selectedWorkspace : undefined,
      project:
        config.filters.selectedProject !== "all" ? config.filters.selectedProject : undefined,
      search: config.filters.searchQuery || undefined,
    });

    return sortTasksForView(filtered, config.sortBy, config.sortOrder);
  };

  // Get tasks grouped by status for Kanban view
  const getTasksByStatus = (filters?: Partial<TaskFiltersEnhanced>) => {
    const filtered = filterTasksForView(enhancedTasks, "kanban", filters);

    return {
      todo: filtered.filter((task) => task.status === "todo"),
      in_progress: filtered.filter((task) => task.status === "in_progress"),
      waiting: filtered.filter((task) => task.status === "waiting"),
      done: filtered.filter((task) => task.status === "done"),
      cancelled: filtered.filter((task) => task.status === "cancelled"),
    };
  };

  // Get tasks grouped by Eisenhower quadrants
  const getTasksByQuadrant = (filters?: Partial<TaskFiltersEnhanced>) => {
    const filtered = filterTasksForView(enhancedTasks, "eisenhower", filters);

    return {
      quadrant1: filtered.filter((task) => task.eisenhowerQuadrant === 1), // Do First
      quadrant2: filtered.filter((task) => task.eisenhowerQuadrant === 2), // Schedule
      quadrant3: filtered.filter((task) => task.eisenhowerQuadrant === 3), // Delegate
      quadrant4: filtered.filter((task) => task.eisenhowerQuadrant === 4), // Eliminate
    };
  };

  // Analytics and stats
  const getTaskStats = () => {
    const total = enhancedTasks.length;
    const completed = enhancedTasks.filter((task) => task.status === "done").length;
    const overdue = enhancedTasks.filter(
      (task) => task.urgency === "overdue" && task.status !== "done",
    ).length;
    const dueToday = enhancedTasks.filter(
      (task) => task.urgency === "due_today" && task.status !== "done",
    ).length;
    const highPriority = enhancedTasks.filter(
      (task) => (task.priority === "high" || task.priority === "urgent") && task.status !== "done",
    ).length;

    // Quadrant distribution
    const quadrantCounts = {
      quadrant1: enhancedTasks.filter(
        (task) => task.eisenhowerQuadrant === 1 && task.status !== "done",
      ).length,
      quadrant2: enhancedTasks.filter(
        (task) => task.eisenhowerQuadrant === 2 && task.status !== "done",
      ).length,
      quadrant3: enhancedTasks.filter(
        (task) => task.eisenhowerQuadrant === 3 && task.status !== "done",
      ).length,
      quadrant4: enhancedTasks.filter(
        (task) => task.eisenhowerQuadrant === 4 && task.status !== "done",
      ).length,
    };

    return {
      total,
      completed,
      pending: total - completed,
      overdue,
      dueToday,
      highPriority,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      quadrantCounts,
    };
  };

  // Get unique values for filters
  const getFilterOptions = () => {
    const categories = [...new Set(enhancedTasks.map((task) => task.category).filter(Boolean))];
    const tags = [...new Set(enhancedTasks.flatMap((task) => task.tags || []))];
    const owners = [...new Set(enhancedTasks.map((task) => task.owner).filter(Boolean))];

    return {
      categories,
      tags,
      owners,
      statuses: ["todo", "in_progress", "waiting", "done", "cancelled"],
      priorities: ["low", "medium", "high", "urgent"],
      urgencies: ["overdue", "due_today", "due_soon", "future"],
    };
  };

  // Task operations with enhanced data
  const createEnhancedTask = (
    taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => {
    return createTask(taskData);
  };

  const updateEnhancedTask = ({ id, updates }: { id: string; updates: Partial<Task> }) => {
    return updateTask({ id, updates });
  };

  const deleteEnhancedTask = (taskId: string) => {
    return deleteTask(taskId);
  };

  const toggleEnhancedTaskCompletion = (task: EnhancedTask) => {
    return toggleTaskCompletion(task);
  };

  return {
    // Data
    tasks: enhancedTasks,
    rawTasks,
    workspaces,
    projects,
    contacts,

    // Loading states
    isLoading,
    isCreating,
    isUpdating,
    isDeleting,
    error,

    // View methods
    getTasksForView,
    getTasksByStatus,
    getTasksByQuadrant,

    // Analytics
    getTaskStats,
    getFilterOptions,

    // Operations
    createTask: createEnhancedTask,
    updateTask: updateEnhancedTask,
    deleteTask: deleteEnhancedTask,
    toggleTaskCompletion: toggleEnhancedTaskCompletion,
  };
};
