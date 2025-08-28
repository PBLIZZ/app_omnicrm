import { Task, TaskFilters } from "./types";
import { TaskItem } from "./TaskItem";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SortDesc, Grid3X3, List, Plus } from "lucide-react";

interface TaskListProps {
  tasks: Task[];
  filters: TaskFilters;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: Task) => void;
  onCreateTask: () => void;
}

export function TaskList({
  tasks,
  filters,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onCreateTask,
}: TaskListProps) {
  // Filter tasks based on current filters
  const filteredTasks = tasks.filter((task) => {
    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchesSearch =
        task.title.toLowerCase().includes(query) ||
        (task.description && task.description.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    // Category filter
    if (filters.selectedCategory !== "all" && task.category !== filters.selectedCategory) {
      return false;
    }

    // Workspace filter
    if (filters.selectedWorkspace !== "all" && task.workspaceId !== filters.selectedWorkspace) {
      return false;
    }

    // Project filter
    if (filters.selectedProject !== "all" && task.projectId !== filters.selectedProject) {
      return false;
    }

    // Client filter - check if the selected client is in the task's taggedContacts
    if (
      filters.selectedClient !== "all" &&
      (!task.taggedContacts || !task.taggedContacts.includes(filters.selectedClient))
    ) {
      return false;
    }

    // Status filter
    if (filters.selectedStatus === "completed" && !task.completed) {
      return false;
    }
    if (filters.selectedStatus === "pending" && task.completed) {
      return false;
    }

    return true;
  });

  // Sort tasks: pending first, then by due date, then by created date
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    // Completed tasks go to the bottom
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }

    // Sort by due date if both have due dates
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }

    // Tasks with due dates come before tasks without
    if (a.dueDate && !b.dueDate) return -1;
    if (!a.dueDate && b.dueDate) return 1;

    // Sort by created date (newest first)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold">Tasks</h2>
            <span className="text-sm text-muted-foreground" data-testid="text-filtered-tasks-count">
              {filteredTasks.length} task{filteredTasks.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              title="Sort by due date"
              data-testid="button-sort-by-due-date"
            >
              <SortDesc className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Grid view" data-testid="button-grid-view">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" title="List view" data-testid="button-list-view">
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Task Items */}
        {sortedTasks.length > 0 ? (
          <div className="divide-y">
            {sortedTasks.map((task) => (
              <TaskItem
                key={task.id}
                task={task}
                onEdit={onEditTask}
                onDelete={onDeleteTask}
                onToggleComplete={onToggleComplete}
              />
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="p-12 text-center">
            <List className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tasks found</h3>
            <p className="text-muted-foreground mb-4">
              {filters.searchQuery || filters.selectedCategory || filters.selectedStatus !== "all"
                ? "Try adjusting your filters or create a new task to get started."
                : "Create your first task to get started with your wellness business management."}
            </p>
            <Button onClick={onCreateTask} data-testid="button-create-first-task">
              <Plus className="mr-2 h-4 w-4" />
              Create {tasks.length === 0 ? "First" : "New"} Task
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
