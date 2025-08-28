import { Task, Contact } from "@/hooks/use-tasks-enhanced";

// Enhanced task interface with computed fields
export interface EnhancedTask extends Task {
  // Computed fields
  urgency: "overdue" | "due_today" | "due_soon" | "future";
  eisenhowerQuadrant: 1 | 2 | 3 | 4; // Eisenhower Matrix quadrant
  completionPercentage: number;

  // Extracted from JSON fields
  category?: string;
  tags?: string[];
  owner?: string;
  subtasks?: Array<{ id: string; title: string; completed: boolean }>;

  // Enhanced contact data
  taggedContactsData?: Contact[];

  // Workspace/Project names
  workspaceName?: string;
  projectName?: string;
}

// AI Context JSON schema interface
export interface TaskAIContext {
  category?: string;
  tags?: string[];
  owner?: string;
  assignee?: string;
  insights?: string;
  suggestedActions?: string[];
  subtasks?: Array<{
    id: string;
    title: string;
    completed: boolean;
    estimatedMinutes?: number;
  }>;
  metadata?: Record<string, any>;
}

// Utility functions for JSON data extraction
export const extractAIContext = (aiContext: unknown): TaskAIContext => {
  if (!aiContext || typeof aiContext !== "object") {
    return {};
  }

  const context = aiContext as Record<string, any>;
  return {
    category: typeof context.category === "string" ? context.category : undefined,
    tags: Array.isArray(context.tags)
      ? context.tags.filter((tag) => typeof tag === "string")
      : undefined,
    owner: typeof context.owner === "string" ? context.owner : undefined,
    assignee: typeof context.assignee === "string" ? context.assignee : undefined,
    insights: typeof context.insights === "string" ? context.insights : undefined,
    suggestedActions: Array.isArray(context.suggestedActions)
      ? context.suggestedActions.filter((action) => typeof action === "string")
      : undefined,
    subtasks: Array.isArray(context.subtasks)
      ? context.subtasks
          .filter(
            (subtask) =>
              typeof subtask === "object" &&
              subtask !== null &&
              typeof subtask.id === "string" &&
              typeof subtask.title === "string",
          )
          .map((subtask) => ({
            id: subtask.id,
            title: subtask.title,
            completed: Boolean(subtask.completed),
            estimatedMinutes:
              typeof subtask.estimatedMinutes === "number" ? subtask.estimatedMinutes : undefined,
          }))
      : undefined,
    metadata:
      typeof context.metadata === "object" && context.metadata !== null
        ? context.metadata
        : undefined,
  };
};

// Calculate urgency based on due date
export const calculateUrgency = (
  dueDate: Date | null,
): "overdue" | "due_today" | "due_soon" | "future" => {
  if (!dueDate) return "future";

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const taskDate = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const daysDiff = Math.floor((taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysDiff < 0) return "overdue";
  if (daysDiff === 0) return "due_today";
  if (daysDiff <= 3) return "due_soon";
  return "future";
};

// Calculate Eisenhower Matrix quadrant
export const calculateEisenhowerQuadrant = (
  priority: string,
  urgency: "overdue" | "due_today" | "due_soon" | "future",
): 1 | 2 | 3 | 4 => {
  const isImportant = priority === "high" || priority === "urgent";
  const isUrgent = urgency === "overdue" || urgency === "due_today";

  if (isImportant && isUrgent) return 1; // Do First
  if (isImportant && !isUrgent) return 2; // Schedule
  if (!isImportant && isUrgent) return 3; // Delegate
  return 4; // Eliminate
};

// Calculate completion percentage based on subtasks
export const calculateCompletionPercentage = (
  status: string,
  subtasks?: Array<{ completed: boolean }>,
): number => {
  if (status === "done") return 100;
  if (status === "cancelled") return 0;

  if (!subtasks || subtasks.length === 0) {
    // No subtasks, base on status
    switch (status) {
      case "in_progress":
        return 50;
      case "waiting":
        return 25;
      default:
        return 0;
    }
  }

  const completedSubtasks = subtasks.filter((subtask) => subtask.completed).length;
  return Math.round((completedSubtasks / subtasks.length) * 100);
};

// Enhanced task transformer
export const enhanceTask = (
  task: Task,
  contacts: Contact[] = [],
  workspaces: Array<{ id: string; name: string }> = [],
  projects: Array<{ id: string; name: string }> = [],
): EnhancedTask => {
  const aiContext = extractAIContext(task.aiContext);
  const urgency = calculateUrgency(task.dueDate);
  const eisenhowerQuadrant = calculateEisenhowerQuadrant(task.priority, urgency);
  const completionPercentage = calculateCompletionPercentage(task.status, aiContext.subtasks);

  // Find tagged contacts data
  const taggedContactsData = task.taggedContacts
    ? contacts.filter((contact) => task.taggedContacts!.includes(contact.id))
    : [];

  // Find workspace and project names
  const workspace = workspaces.find((w) => w.id === task.workspaceId);
  const project = projects.find((p) => p.id === task.projectId);

  return {
    ...task,
    urgency,
    eisenhowerQuadrant,
    completionPercentage,
    category: aiContext.category || task.category,
    tags: aiContext.tags,
    owner: aiContext.owner || task.assignee,
    subtasks: aiContext.subtasks,
    taggedContactsData,
    workspaceName: workspace?.name,
    projectName: project?.name,
  };
};

// Priority colors for UI
export const getPriorityColor = (priority: string): string => {
  const colors = {
    low: "border-l-green-500",
    medium: "border-l-blue-500",
    high: "border-l-orange-500",
    urgent: "border-l-red-500",
  } as const;

  return colors[priority as keyof typeof colors] || colors.medium;
};

// Urgency colors for UI
export const getUrgencyColor = (
  urgency: "overdue" | "due_today" | "due_soon" | "future",
): string => {
  const colors = {
    overdue: "text-red-600 bg-red-50",
    due_today: "text-orange-600 bg-orange-50",
    due_soon: "text-yellow-600 bg-yellow-50",
    future: "text-gray-600 bg-gray-50",
  } as const;

  return colors[urgency];
};

// Eisenhower quadrant labels and colors
export const getEisenhowerQuadrantInfo = (quadrant: 1 | 2 | 3 | 4) => {
  const quadrants = {
    1: { label: "Do First", color: "bg-red-100 text-red-800", description: "Important & Urgent" },
    2: {
      label: "Schedule",
      color: "bg-blue-100 text-blue-800",
      description: "Important & Not Urgent",
    },
    3: {
      label: "Delegate",
      color: "bg-yellow-100 text-yellow-800",
      description: "Not Important & Urgent",
    },
    4: {
      label: "Eliminate",
      color: "bg-gray-100 text-gray-800",
      description: "Not Important & Not Urgent",
    },
  } as const;

  return quadrants[quadrant];
};

// Status display helpers
export const getStatusIcon = (status: string): string => {
  const icons = {
    todo: "⭕",
    in_progress: "🔄",
    waiting: "⏳",
    done: "✅",
    cancelled: "❌",
  } as const;

  return icons[status as keyof typeof icons] || icons.todo;
};

// Filter tasks for different views
export const filterTasksForView = (
  tasks: EnhancedTask[],
  view: "list" | "kanban" | "eisenhower",
  filters?: {
    status?: string;
    priority?: string;
    urgency?: string;
    quadrant?: number;
    workspace?: string;
    project?: string;
    search?: string;
  },
): EnhancedTask[] => {
  let filtered = [...tasks];

  if (filters) {
    if (filters.status && filters.status !== "all") {
      filtered = filtered.filter((task) => task.status === filters.status);
    }

    if (filters.priority && filters.priority !== "all") {
      filtered = filtered.filter((task) => task.priority === filters.priority);
    }

    if (filters.urgency && filters.urgency !== "all") {
      filtered = filtered.filter((task) => task.urgency === filters.urgency);
    }

    if (filters.quadrant) {
      filtered = filtered.filter((task) => task.eisenhowerQuadrant === filters.quadrant);
    }

    if (filters.workspace && filters.workspace !== "all") {
      filtered = filtered.filter((task) => task.workspaceId === filters.workspace);
    }

    if (filters.project && filters.project !== "all") {
      filtered = filtered.filter((task) => task.projectId === filters.project);
    }

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description?.toLowerCase().includes(searchLower) ||
          task.tags?.some((tag) => tag.toLowerCase().includes(searchLower)) ||
          task.taggedContactsData?.some((contact) =>
            contact.displayName.toLowerCase().includes(searchLower),
          ),
      );
    }
  }

  return filtered;
};

// Sort tasks for different views
export const sortTasksForView = (
  tasks: EnhancedTask[],
  sortBy: "dueDate" | "priority" | "status" | "created" | "urgency" | "quadrant",
  sortOrder: "asc" | "desc" = "asc",
): EnhancedTask[] => {
  const sorted = [...tasks].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "dueDate":
        if (a.dueDate && b.dueDate) {
          comparison = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        } else if (a.dueDate) {
          comparison = -1;
        } else if (b.dueDate) {
          comparison = 1;
        }
        break;

      case "priority":
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        comparison =
          (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
        break;

      case "urgency":
        const urgencyOrder = { overdue: 4, due_today: 3, due_soon: 2, future: 1 };
        comparison = (urgencyOrder[a.urgency] || 1) - (urgencyOrder[b.urgency] || 1);
        break;

      case "quadrant":
        comparison = a.eisenhowerQuadrant - b.eisenhowerQuadrant;
        break;

      case "status":
        const statusOrder = { todo: 1, in_progress: 2, waiting: 3, done: 4, cancelled: 5 };
        comparison =
          (statusOrder[a.status as keyof typeof statusOrder] || 1) -
          (statusOrder[b.status as keyof typeof statusOrder] || 1);
        break;

      case "created":
        comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;

      default:
        comparison = a.title.localeCompare(b.title);
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });

  return sorted;
};
