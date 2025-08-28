"use client";

import { useState, useMemo } from "react";
import { EisenhowerMatrix } from "./EisenhowerMatrix";
import { MatrixViewToggle } from "./MatrixViewToggle";
import { PriorityList } from "@/components/omni-momentum/PriorityList";
import { TaskCaptureModal } from "@/components/omni-momentum/TaskCaptureModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTaskOperations } from "@/hooks/use-task-operations";
import { useZoneMapping } from "@/hooks/use-zone-mapping";
import { useTaskMetrics } from "@/hooks/use-task-metrics";
import { RefreshCw, Plus, Target } from "lucide-react";
import type { Task } from "@/server/db/schema";

interface EisenhowerDashboardProps {
  className?: string;
}

type ViewMode = "matrix" | "list" | "analytics";
type SortMode = "priority" | "dueDate" | "created";

export function EisenhowerDashboard({
  className = "",
}: EisenhowerDashboardProps) {
  const [currentView, setCurrentView] = useState<ViewMode>("matrix");
  const [sortBy, setSortBy] = useState<SortMode>("priority");
  const [showFilters, setShowFilters] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedQuadrant, setSelectedQuadrant] = useState<string | null>(null);

  // Data hooks
  const {
    tasks,
    createTask,
    updateTask,
    deleteTask,
    toggleTaskStatus,
    isLoading,
    refetch
  } = useTaskOperations();

  const {
    workspaces,
    isLoading: isLoadingWorkspaces
  } = useZoneMapping();

  const { metrics } = useTaskMetrics(tasks);

  // Calculate quadrant distribution
  const taskCounts = useMemo(() => {
    const now = new Date();
    const twoDaysFromNow = new Date(now.getTime() + (2 * 24 * 60 * 60 * 1000));
    
    let urgentImportant = 0;
    let importantNotUrgent = 0;
    let urgentNotImportant = 0;
    let notUrgentNotImportant = 0;
    
    tasks
      .filter(task => task.status !== "done" && task.status !== "cancelled")
      .forEach(task => {
        const isImportant = task.priority === "high" || task.priority === "urgent";
        const isUrgent = task.dueDate ? new Date(task.dueDate) <= twoDaysFromNow : false;
        
        if (isUrgent && isImportant) urgentImportant++;
        else if (isImportant && !isUrgent) importantNotUrgent++;
        else if (isUrgent && !isImportant) urgentNotImportant++;
        else notUrgentNotImportant++;
      });
    
    return {
      urgentImportant,
      importantNotUrgent,
      urgentNotImportant,
      notUrgentNotImportant,
    };
  }, [tasks]);

  // Sort tasks for list view
  const sortedTasks = useMemo(() => {
    const activeTasks = tasks.filter(task => 
      task.status !== "done" && task.status !== "cancelled"
    );
    
    return [...activeTasks].sort((a, b) => {
      switch (sortBy) {
        case "priority":
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
          return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - 
                 (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
        case "dueDate":
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case "created":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          return 0;
      }
    });
  }, [tasks, sortBy]);

  // Event handlers
  const handleTaskComplete = async (taskId: string) => {
    await toggleTaskStatus(taskId, "todo");
  };

  const handleTaskEdit = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleTaskDelete = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      await deleteTask(taskId);
    }
  };

  const handleAddTask = (quadrant?: string) => {
    setSelectedQuadrant(quadrant || null);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = async (taskData: {
    workspaceId: string;
    projectId?: string;
    title: string;
    description?: string;
    priority: string;
    estimatedMinutes?: number;
    taggedContacts?: string[];
    dueDate?: Date;
    aiContext?: unknown;
  }) => {
    // Adjust priority based on selected quadrant
    let adjustedPriority = taskData.priority;
    if (selectedQuadrant) {
      switch (selectedQuadrant) {
        case "urgent-important":
          adjustedPriority = "urgent";
          break;
        case "important-not-urgent":
          adjustedPriority = "high";
          break;
        case "urgent-not-important":
          adjustedPriority = "medium";
          break;
        case "not-urgent-not-important":
          adjustedPriority = "low";
          break;
      }
    }

    if (editingTask) {
      await updateTask(editingTask.id, {
        ...taskData,
        priority: adjustedPriority,
      });
      setEditingTask(null);
    } else {
      await createTask({
        ...taskData,
        priority: adjustedPriority,
        source: "user",
      });
    }
    setSelectedQuadrant(null);
  };

  const handleRefresh = () => {
    refetch();
  };

  const isDataLoading = isLoading || isLoadingWorkspaces;

  return (
    <div className={`max-w-7xl mx-auto p-6 space-y-8 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            Strategic Task Organization
          </h1>
          <p className="text-muted-foreground mt-1">
            Use the Eisenhower Matrix to prioritize tasks by urgency and importance
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isDataLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isDataLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
          <Button onClick={() => handleAddTask()}>
            <Plus className="h-4 w-4 mr-2" />
            New Task
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {currentView === "matrix" && (
            <EisenhowerMatrix
              tasks={tasks}
              onTaskClick={handleTaskEdit}
              onTaskComplete={handleTaskComplete}
              onTaskEdit={handleTaskEdit}
              onTaskDelete={handleTaskDelete}
              onAddTask={handleAddTask}
              isLoading={isDataLoading}
              showInsights={true}
            />
          )}

          {currentView === "list" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  All Tasks (Sorted by {sortBy})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <PriorityList
                  tasks={sortedTasks}
                  onTaskComplete={handleTaskComplete}
                  onTaskEdit={handleTaskEdit}
                  onTaskDelete={handleTaskDelete}
                  isLoading={isDataLoading}
                  maxTasks={20}
                />
              </CardContent>
            </Card>
          )}

          {currentView === "analytics" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Matrix Analytics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-semibold mb-2">Analytics Coming Soon</h3>
                  <p className="text-muted-foreground">
                    Detailed task distribution and productivity insights will be available here.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <MatrixViewToggle
            currentView={currentView}
            onViewChange={setCurrentView}
            taskCounts={taskCounts}
            showFilters={showFilters}
            onFilterToggle={() => setShowFilters(!showFilters)}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />
        </div>
      </div>

      {/* Task Modal */}
      <TaskCaptureModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
          setSelectedQuadrant(null);
        }}
        onSave={handleSaveTask}
        workspaces={workspaces}
        projects={[]}
        existingTags={[]}
      />
    </div>
  );
}