import React, { useState } from "react";
import { TaskManagerProps, TaskFilters } from "./types";
import { TaskSidebar } from "./TaskSidebar";
import { TaskList } from "./TaskList";
import { TaskForm } from "./TaskForm";
import { TaskCreateModal } from "./TaskCreateModal";
import { ProjectTemplateDialog } from "./ProjectTemplateDialog";
import { TasksInboxView } from "./TasksInboxView";
import { useTasks, Task } from "@/hooks/use-tasks-enhanced";
import { useWorkspacesEnhanced } from "@/hooks/use-workspaces-enhanced";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Loader2, AlertTriangle, Sparkles, LayoutGrid } from "lucide-react";

export function TaskManager({
  className,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
}: TaskManagerProps) {
  const [filters, setFilters] = useState<TaskFilters>({
    searchQuery: "",
    selectedCategory: "all",
    selectedStatus: "all",
    selectedWorkspace: "all",
    selectedProject: "all",
    selectedClient: "all",
  });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | undefined>();
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [useInboxView, setUseInboxView] = useState(false);
  const [showProgressiveModal, setShowProgressiveModal] = useState(false);

  const {
    tasks,
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
  } = useTasks();

  const {
    workspaces: enhancedWorkspaces,
    hasWorkspaces,
    initializeDefaultWorkspaces,
    isInitializing,
  } = useWorkspacesEnhanced();

  // Get existing tags
  const { data: tagsResponse } = useQuery({
    queryKey: ["/api/tasks/tags"],
    queryFn: async () => {
      return apiRequest("/api/tasks/tags");
    },
  });

  const existingTags = tagsResponse?.tags || [];

  // Initialize default workspace if user has none
  React.useEffect(() => {
    if (!hasWorkspaces && !isInitializing) {
      initializeDefaultWorkspaces();
    }
  }, [hasWorkspaces, isInitializing, initializeDefaultWorkspaces]);

  // Use enhanced workspaces if available, fallback to tasks hook workspaces
  const finalWorkspaces = enhancedWorkspaces.length > 0 ? enhancedWorkspaces : workspaces;

  // Calculate stats
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((task: Task) => task.completed).length;
  const pendingTasks = totalTasks - completedTasks;

  const handleCreateTask = () => {
    setEditingTask(undefined);
    setShowProgressiveModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsFormOpen(true);
  };

  const handleSaveTask = (taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">) => {
    if (editingTask) {
      updateTask({
        id: editingTask.id,
        updates: taskData,
      });
      onTaskUpdate?.(editingTask);
    } else {
      createTask(taskData);
      onTaskCreate?.(taskData as Task);
    }
    setIsFormOpen(false);
    setEditingTask(undefined);
  };

  const handleSaveProgressiveTask = (
    taskData: Omit<Task, "id" | "userId" | "createdAt" | "updatedAt">,
  ) => {
    createTask(taskData);
    onTaskCreate?.(taskData as Task);
    setShowProgressiveModal(false);
  };

  const handleDeleteTask = (taskId: string) => {
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      deleteTask(taskToDelete);
      onTaskDelete?.(taskToDelete);
      setTaskToDelete(null);
    }
  };

  const cancelDeleteTask = () => {
    setTaskToDelete(null);
  };

  const taskToDeleteData = taskToDelete ? tasks.find((t: Task) => t.id === taskToDelete) : null;

  return (
    <div className={`min-h-screen p-4 max-w-6xl mx-auto ${className || ""}`}>
      {/* Header Section */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-3xl font-bold">Wellness Task Manager</CardTitle>
              <CardDescription className="text-base">
                Organize your wellness business tasks with AI-powered categorization
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              {isLoading && (
                <div className="flex items-center text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span className="text-sm">Loading...</span>
                </div>
              )}
              <Button
                variant="outline"
                onClick={() => setUseInboxView(!useInboxView)}
                data-testid="button-inbox-view"
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                {useInboxView ? "Classic View" : "Inbox View"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsTemplateDialogOpen(true)}
                data-testid="button-templates"
              >
                <Sparkles className="mr-2 h-4 w-4" />
                Templates
              </Button>
              <Button onClick={handleCreateTask} data-testid="button-add-task">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {useInboxView ? (
        <TasksInboxView
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onCreateTask={handleCreateTask}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar - Filters & Search */}
          <div className="lg:col-span-1">
            <TaskSidebar
              filters={filters}
              onFiltersChange={setFilters}
              workspaces={finalWorkspaces}
              projects={projects}
              contacts={contacts}
              totalTasks={totalTasks}
              completedTasks={completedTasks}
              pendingTasks={pendingTasks}
            />
          </div>

          {/* Main Content - Task List */}
          <div className="lg:col-span-3">
            <TaskList
              tasks={tasks}
              filters={filters}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              onToggleComplete={toggleTaskCompletion}
              onCreateTask={handleCreateTask}
            />
          </div>
        </div>
      )}

      {/* Task Form Modal */}
      <TaskForm
        isOpen={isFormOpen}
        task={editingTask}
        workspaces={finalWorkspaces}
        projects={projects}
        onSave={handleSaveTask}
        onCancel={() => {
          setIsFormOpen(false);
          setEditingTask(undefined);
        }}
        isLoading={isCreating || isUpdating}
      />

      {/* Progressive Task Creation Modal */}
      <TaskCreateModal
        isOpen={showProgressiveModal}
        onClose={() => setShowProgressiveModal(false)}
        onSave={handleSaveProgressiveTask}
        workspaces={finalWorkspaces}
        projects={projects}
        existingTags={existingTags}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!taskToDelete} onOpenChange={() => setTaskToDelete(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-destructive" />
              Delete Task
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{taskToDeleteData?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteTask} data-testid="button-cancel-delete">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isDeleting}
              data-testid="button-confirm-delete"
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isDeleting ? "Deleting..." : "Delete Task"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Project Template Dialog */}
      <ProjectTemplateDialog
        open={isTemplateDialogOpen}
        onOpenChange={setIsTemplateDialogOpen}
        workspaces={finalWorkspaces}
      />
    </div>
  );
}
