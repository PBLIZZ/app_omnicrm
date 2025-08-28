import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  List,
  Kanban,
  Grid,
  Filter,
  Search,
  SortDesc,
  MoreVertical,
  Target,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
} from "lucide-react";
import { useTasksInbox, TaskFiltersEnhanced, TaskViewConfig } from "@/hooks/use-tasks-inbox";
import { TasksTableView } from "./TasksTableView";
import { TasksKanbanViewEnhanced } from "./TasksKanbanViewEnhanced";
import { TasksEisenhowerMatrix } from "./TasksEisenhowerMatrix";
import { TaskForm } from "./TaskForm";
import { TaskCreateModal } from "./TaskCreateModal";
import { EnhancedTask } from "@/lib/task-utils";

interface TasksInboxViewProps {
  onEditTask?: (task: EnhancedTask) => void;
  onDeleteTask?: (taskId: string) => void;
  onCreateTask?: () => void;
  className?: string;
}

export function TasksInboxView({
  onEditTask,
  onDeleteTask,
  onCreateTask,
  className,
}: TasksInboxViewProps) {
  const {
    tasks,
    workspaces,
    projects,
    isLoading,
    getTasksForView,
    getTaskStats,
    getFilterOptions,
    updateTask,
    toggleTaskCompletion,
  } = useTasksInbox();

  // View configuration state
  const [currentView, setCurrentView] = useState<"list" | "kanban" | "eisenhower">("list");
  const [sortBy, setSortBy] = useState<TaskViewConfig["sortBy"]>("urgency");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<TaskFiltersEnhanced>({
    searchQuery: "",
    selectedStatus: "all",
    selectedPriority: "all",
    selectedUrgency: "all",
    selectedQuadrant: null,
    selectedWorkspace: "all",
    selectedProject: "all",
    selectedCategory: "all",
  });

  // Get filtered and sorted tasks
  const viewConfig: TaskViewConfig = {
    view: currentView,
    sortBy,
    sortOrder,
    filters,
  };

  const filteredTasks = useMemo(() => {
    return getTasksForView(viewConfig);
  }, [getTasksForView, viewConfig]);

  // Get stats and filter options
  const stats = getTaskStats();
  const filterOptions = getFilterOptions();

  // Handle task operations
  const handleEditTask = (task: EnhancedTask) => {
    onEditTask?.(task);
  };

  const handleDeleteTask = (taskId: string) => {
    onDeleteTask?.(taskId);
  };

  const handleToggleComplete = (task: EnhancedTask) => {
    toggleTaskCompletion(task);
  };

  const handleCreateTask = () => {
    if (onCreateTask) {
      onCreateTask();
    } else {
      setShowCreateModal(true);
    }
  };

  const handleSaveNewTask = (taskData: any) => {
    // This would be handled by the parent component normally
    // For now, we'll just close the modal
    setShowCreateModal(false);
  };

  // Update filters
  const updateFilters = (updates: Partial<TaskFiltersEnhanced>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      searchQuery: "",
      selectedStatus: "all",
      selectedPriority: "all",
      selectedUrgency: "all",
      selectedQuadrant: null,
      selectedWorkspace: "all",
      selectedProject: "all",
      selectedCategory: "all",
    });
  };

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => {
    if (key === "selectedQuadrant") return value !== null;
    return value !== "" && value !== "all";
  });

  return (
    <div className={`space-y-6 ${className || ""}`}>
      {/* Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Tasks Inbox</CardTitle>
              <p className="text-muted-foreground mt-1">
                Manage your tasks across multiple views and priorities
              </p>
            </div>

            <div className="flex items-center gap-4">
              {/* Quick Stats */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span>{stats.completed} completed</span>
                </div>
                {stats.overdue > 0 && (
                  <div className="flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 font-medium">{stats.overdue} overdue</span>
                  </div>
                )}
                {stats.dueToday > 0 && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4 text-orange-600" />
                    <span className="text-orange-600">{stats.dueToday} due today</span>
                  </div>
                )}
                {stats.highPriority > 0 && (
                  <div className="flex items-center gap-1">
                    <Zap className="h-4 w-4 text-purple-600" />
                    <span className="text-purple-600">{stats.highPriority} high priority</span>
                  </div>
                )}
              </div>

              <Button onClick={handleCreateTask} size="sm">
                Add Task
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Filters and View Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={filters.searchQuery}
                  onChange={(e) => updateFilters({ searchQuery: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select
                value={filters.selectedStatus}
                onValueChange={(value) => updateFilters({ selectedStatus: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="waiting">Waiting</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.selectedPriority}
                onValueChange={(value) => updateFilters({ selectedPriority: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priority</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={filters.selectedUrgency}
                onValueChange={(value) => updateFilters({ selectedUrgency: value })}
              >
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="due_today">Due Today</SelectItem>
                  <SelectItem value="due_soon">Due Soon</SelectItem>
                  <SelectItem value="future">Future</SelectItem>
                </SelectContent>
              </Select>

              {workspaces.length > 1 && (
                <Select
                  value={filters.selectedWorkspace}
                  onValueChange={(value) => updateFilters({ selectedWorkspace: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Workspace" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Workspaces</SelectItem>
                    {workspaces.map((workspace) => (
                      <SelectItem key={workspace.id} value={workspace.id}>
                        {workspace.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {projects.length > 0 && (
                <Select
                  value={filters.selectedProject}
                  onValueChange={(value) => updateFilters({ selectedProject: value })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="text-xs">
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as TaskViewConfig["sortBy"])}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgency">Urgency</SelectItem>
                  <SelectItem value="priority">Priority</SelectItem>
                  <SelectItem value="dueDate">Due Date</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                  <SelectItem value="created">Created</SelectItem>
                  <SelectItem value="quadrant">Quadrant</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
              >
                <SortDesc className={`h-4 w-4 ${sortOrder === "asc" ? "rotate-180" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Active Filters Display */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">Active filters:</span>
              <div className="flex gap-1 flex-wrap">
                {filters.searchQuery && (
                  <Badge variant="secondary">Search: {filters.searchQuery}</Badge>
                )}
                {filters.selectedStatus !== "all" && (
                  <Badge variant="secondary">Status: {filters.selectedStatus}</Badge>
                )}
                {filters.selectedPriority !== "all" && (
                  <Badge variant="secondary">Priority: {filters.selectedPriority}</Badge>
                )}
                {filters.selectedUrgency !== "all" && (
                  <Badge variant="secondary">Urgency: {filters.selectedUrgency}</Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Tabs */}
      <Tabs
        value={currentView}
        onValueChange={(value) => setCurrentView(value as typeof currentView)}
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
            <Badge variant="secondary" className="ml-1">
              {filteredTasks.length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            Kanban
          </TabsTrigger>
          <TabsTrigger value="eisenhower" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Matrix
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <TasksTableView
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="kanban" className="space-y-4">
          <TasksKanbanViewEnhanced
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onCreateTask={handleCreateTask}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="eisenhower" className="space-y-4">
          <TasksEisenhowerMatrix
            tasks={filteredTasks}
            onEditTask={handleEditTask}
            onDeleteTask={handleDeleteTask}
            onToggleComplete={handleToggleComplete}
            onCreateTask={handleCreateTask}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Results Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Showing {filteredTasks.length} of {tasks.length} tasks
              {hasActiveFilters && " (filtered)"}
            </div>
            <div>Completion Rate: {stats.completionRate}%</div>
          </div>
        </CardContent>
      </Card>

      {/* Progressive Task Creation Modal */}
      <TaskCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleSaveNewTask}
        workspaces={workspaces}
        projects={projects}
        existingTags={filterOptions.tags}
      />
    </div>
  );
}
