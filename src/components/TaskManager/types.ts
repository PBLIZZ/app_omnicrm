// Re-export Task from the enhanced hook
import type { Task } from "@/hooks/use-tasks-enhanced";
export type { Task } from "@/hooks/use-tasks-enhanced";

export interface TaskManagerProps {
  className?: string;
  onTaskCreate?: (task: Task) => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
}

export interface TaskFormData {
  title: string;
  description: string;
  dueDate: string;
  category: string;
  workspaceId: string;
  projectId: string;
  priority: string;
}

export interface TaskFilters {
  searchQuery: string;
  selectedCategory: string;
  selectedStatus: "all" | "pending" | "completed";
  selectedWorkspace: string;
  selectedProject: string;
  selectedClient: string;
}

export const TASK_CATEGORIES = [
  { value: "client-care", label: "🫶 Client Care", icon: "fas fa-heart" },
  { value: "business-development", label: "📈 Business Development", icon: "fas fa-chart-line" },
  { value: "administrative", label: "📋 Administrative", icon: "fas fa-clipboard-list" },
  { value: "content-creation", label: "✍️ Content Creation", icon: "fas fa-brain" },
  { value: "personal-wellness", label: "🧘 Personal Wellness", icon: "fas fa-leaf" },
] as const;

export const getCategoryIcon = (category: string): string => {
  const categoryData = TASK_CATEGORIES.find((cat) => cat.value === category);
  return categoryData?.icon || "fas fa-circle";
};

export const getCategoryLabel = (category: string): string => {
  const categoryData = TASK_CATEGORIES.find((cat) => cat.value === category);
  return categoryData?.label || category;
};

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    "client-care": "bg-green-100 text-green-800",
    "business-development": "bg-blue-100 text-blue-800",
    administrative: "bg-orange-100 text-orange-800",
    "content-creation": "bg-purple-100 text-purple-800",
    "personal-wellness": "bg-pink-100 text-pink-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
};
