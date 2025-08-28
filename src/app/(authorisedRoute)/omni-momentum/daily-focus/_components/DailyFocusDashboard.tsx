"use client";

import { useState, useMemo } from "react";
import { DailyFocusHeader } from "./DailyFocusHeader";
import { PriorityList } from "@/components/omni-momentum/PriorityList";
import { AIInsightsPanel } from "@/components/omni-momentum/AIInsightsPanel";
import { QuickActionsBar } from "@/components/omni-momentum/QuickActionsBar";
import { TaskCaptureInput } from "@/components/omni-momentum/TaskCaptureInput";
import { TaskCaptureModal } from "@/components/omni-momentum/TaskCaptureModal";
import { useTaskOperations } from "@/hooks/use-task-operations";
import { useTaskMetrics } from "@/hooks/use-task-metrics";
import { useZoneMapping } from "@/hooks/use-zone-mapping";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Settings, MoreHorizontal } from "lucide-react";
import type { Task } from "@/server/db/schema";

interface DailyFocusDashboardProps {
  energyLevel?: number; // 1-5 from Daily Pulse widget
  userId: string;
  onNavigateToCalendar?: () => void;
  onNavigateToContacts?: () => void;
  onNavigateToChat?: () => void;
  onNavigateToAnalytics?: () => void;
  className?: string;
}

export function DailyFocusDashboard({
  energyLevel = 3,
  userId,
  onNavigateToCalendar,
  onNavigateToContacts,
  onNavigateToChat,
  onNavigateToAnalytics,
  className = "",
}: DailyFocusDashboardProps) {
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

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
    workspacesWithZones, 
    isLoading: isLoadingWorkspaces 
  } = useZoneMapping();

  const { 
    enhancedTasks, 
    todaysFocus, 
    metrics 
  } = useTaskMetrics(tasks);

  // Get today's priority tasks (incomplete ones first)
  const priorityTasks = useMemo(() => {
    return todaysFocus
      .filter(task => task.status !== "cancelled")
      .sort((a, b) => {
        // Incomplete tasks first
        if (a.status === "done" && b.status !== "done") return 1;
        if (a.status !== "done" && b.status === "done") return -1;
        return 0;
      });
  }, [todaysFocus]);

  // Current schedule context (mock - would come from calendar integration)
  const currentSchedule = useMemo(() => ({
    nextEvent: "Client Session - Sarah M.",
    timeUntilNext: 45, // minutes
    availability: "limited" as const,
  }), []);

  // Task context for AI insights
  const taskContext = useMemo(() => ({
    completedToday: metrics.completedTasks,
    pendingCount: metrics.pendingTasks,
    overdueCount: metrics.overdueTasks,
  }), [metrics]);

  // Event handlers
  const handleCreateTaskFromCapture = async (taskData: {
    title: string;
    description?: string;
    category?: string;
    priority?: string;
    estimatedMinutes?: number;
    suggestedTags?: string[];
  }) => {
    const defaultWorkspace = workspaces.find(w => w.isDefault) || workspaces[0];
    if (!defaultWorkspace) return;

    await createTask({
      workspaceId: defaultWorkspace.id,
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority || "medium",
      estimatedMinutes: taskData.estimatedMinutes || 30,
      source: "user",
    });
  };

  const handleSaveTaskFromModal = async (taskData: {
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
    if (editingTask) {
      await updateTask(editingTask.id, {
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        estimatedMinutes: taskData.estimatedMinutes,
        taggedContacts: taskData.taggedContacts,
        dueDate: taskData.dueDate,
        aiContext: taskData.aiContext,
      });
      setEditingTask(null);
    } else {
      await createTask({
        workspaceId: taskData.workspaceId,
        projectId: taskData.projectId,
        title: taskData.title,
        description: taskData.description,
        priority: taskData.priority,
        estimatedMinutes: taskData.estimatedMinutes,
        taggedContacts: taskData.taggedContacts,
        dueDate: taskData.dueDate,
        aiContext: taskData.aiContext,
        source: "user",
      });
    }
  };

  const handleTaskComplete = async (taskId: string) => {
    await toggleTaskStatus(taskId, "todo"); // Will toggle to "done"
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

  const handleRefresh = () => {
    refetch();
  };

  const isDataLoading = isLoading || isLoadingWorkspaces;

  return (
    <div className={`max-w-7xl mx-auto p-6 space-y-8 ${className}`}>
      {/* Header */}
      <DailyFocusHeader
        energyLevel={energyLevel}
        completedTasks={metrics.completedTasks}
        totalTasks={priorityTasks.length}
        greeting={`Let's make today meaningful, one mindful step at a time! 🌱`}
      />

      {/* Quick Capture */}
      <Card className="border-dashed border-2 border-primary/20">
        <CardContent className="p-6">
          <TaskCaptureInput
            onTaskCreate={handleCreateTaskFromCapture}
            placeholder="What needs your attention today?"
            showEnhancement={true}
            size="lg"
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Priority Area */}
        <div className="lg:col-span-2 space-y-6">
          <PriorityList
            tasks={priorityTasks}
            onTaskComplete={handleTaskComplete}
            onTaskEdit={handleTaskEdit}
            onTaskDelete={handleTaskDelete}
            isLoading={isDataLoading}
            maxTasks={3}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* AI Insights */}
          <AIInsightsPanel
            currentSchedule={currentSchedule}
            taskContext={taskContext}
            energyLevel={energyLevel}
          />

          <Separator />

          {/* Quick Actions */}
          <QuickActionsBar
            onCreateTask={() => setIsTaskModalOpen(true)}
            onQuickCapture={() => {}} // Handled by input above
            onViewCalendar={onNavigateToCalendar}
            onViewContacts={onNavigateToContacts}
            onOpenChat={onNavigateToChat}
            onViewAnalytics={onNavigateToAnalytics}
            pendingTasks={metrics.pendingTasks}
            todayEvents={currentSchedule.nextEvent ? 1 : 0}
            variant="vertical"
          />

          {/* Dashboard Controls */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Dashboard</h3>
              
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isDataLoading}
                  className="w-full justify-start h-8"
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${isDataLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8"
                >
                  <Settings className="h-3 w-3 mr-2" />
                  Settings
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start h-8"
                >
                  <MoreHorizontal className="h-3 w-3 mr-2" />
                  More Options
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task Creation Modal */}
      <TaskCaptureModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTaskFromModal}
        workspaces={workspaces}
        projects={[]} // Would be populated from projects API
        existingTags={[]} // Would be populated from tags API
      />
    </div>
  );
}