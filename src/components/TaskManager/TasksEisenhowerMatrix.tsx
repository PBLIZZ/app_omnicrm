import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  MoreHorizontal,
  Edit,
  Trash2,
  Calendar,
  Clock,
  User,
  Bot,
  Flag,
  Plus,
  CheckSquare,
  AlertTriangle,
  Tag,
  Target,
  Zap,
  Users,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EnhancedTask } from "@/lib/task-utils";
import {
  getPriorityColor,
  getUrgencyColor,
  getEisenhowerQuadrantInfo,
  calculateEisenhowerQuadrant,
} from "@/lib/task-utils";

interface TasksEisenhowerMatrixProps {
  tasks: EnhancedTask[];
  isLoading: boolean;
  onEditTask: (task: EnhancedTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: EnhancedTask) => void;
  onCreateTask?: () => void;
}

// Quadrant definitions
const quadrants = [
  {
    id: 1,
    title: "Do First",
    subtitle: "Important & Urgent",
    description: "Critical tasks that require immediate attention",
    icon: <Target className="h-5 w-5" />,
    color: "bg-red-50 border-red-200",
    headerColor: "bg-red-100 text-red-800",
    important: true,
    urgent: true,
  },
  {
    id: 2,
    title: "Schedule",
    subtitle: "Important & Not Urgent",
    description: "Important tasks to plan and schedule",
    icon: <Calendar className="h-5 w-5" />,
    color: "bg-blue-50 border-blue-200",
    headerColor: "bg-blue-100 text-blue-800",
    important: true,
    urgent: false,
  },
  {
    id: 3,
    title: "Delegate",
    subtitle: "Not Important & Urgent",
    description: "Tasks that can be delegated to others",
    icon: <Users className="h-5 w-5" />,
    color: "bg-yellow-50 border-yellow-200",
    headerColor: "bg-yellow-100 text-yellow-800",
    important: false,
    urgent: true,
  },
  {
    id: 4,
    title: "Eliminate",
    subtitle: "Not Important & Not Urgent",
    description: "Tasks to eliminate or minimize",
    icon: <X className="h-5 w-5" />,
    color: "bg-gray-50 border-gray-200",
    headerColor: "bg-gray-100 text-gray-800",
    important: false,
    urgent: false,
  },
];

// Enhanced Task Card for Matrix View
function MatrixTaskCard({
  task,
  isDragging = false,
  onEdit,
  onDelete,
  onToggleComplete,
}: {
  task: EnhancedTask;
  isDragging?: boolean;
  onEdit: (task: EnhancedTask) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (task: EnhancedTask) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contacts = task.taggedContactsData || [];
  const isOverdue = task.urgency === "overdue";

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      data-testid={`matrix-task-card-${task.id}`}
    >
      <Card
        className={`mb-2 hover:shadow-md transition-all duration-200 border-l-4 ${getPriorityColor(task.priority)} ${
          isOverdue ? "bg-red-50 border-red-200" : ""
        } ${task.completed ? "opacity-60" : ""}`}
      >
        <CardContent className="p-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h5 className="font-medium text-sm leading-tight line-clamp-2 mb-1">{task.title}</h5>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                  {task.description}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-5 w-5 p-0 shrink-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(task)}>
                  <Edit className="mr-2 h-3 w-3" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleComplete(task)}>
                  <CheckSquare className="mr-2 h-3 w-3" />
                  {task.completed ? "Mark Incomplete" : "Mark Complete"}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onDelete(task.id)} className="text-destructive">
                  <Trash2 className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Priority and Status Indicators */}
          <div className="flex items-center gap-1 mb-2">
            <Badge
              className={
                task.priority === "urgent"
                  ? "bg-red-100 text-red-800 text-xs"
                  : task.priority === "high"
                    ? "bg-orange-100 text-orange-800 text-xs"
                    : task.priority === "medium"
                      ? "bg-blue-100 text-blue-800 text-xs"
                      : "bg-green-100 text-green-800 text-xs"
              }
            >
              {task.priority.charAt(0).toUpperCase()}
            </Badge>

            {isOverdue && (
              <Badge className="bg-red-100 text-red-800 text-xs">
                <AlertTriangle className="h-2 w-2 mr-1" />
                Overdue
              </Badge>
            )}

            {task.completed && (
              <Badge className="bg-green-100 text-green-800 text-xs">✓ Done</Badge>
            )}
          </div>

          {/* Progress Bar */}
          {task.completionPercentage > 0 && task.completionPercentage < 100 && (
            <div className="mb-2">
              <Progress value={task.completionPercentage} className="h-1" />
              <div className="text-xs text-muted-foreground mt-1">{task.completionPercentage}%</div>
            </div>
          )}

          {/* Due Date and Time */}
          <div className="space-y-1 mb-2">
            {task.dueDate && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(task.dueDate), "MMM d")}</span>
              </div>
            )}

            {task.estimatedMinutes && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{Math.round(task.estimatedMinutes / 60)}h</span>
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 2 && (
                <Badge variant="secondary" className="text-xs">
                  +{task.tags.length - 2}
                </Badge>
              )}
            </div>
          )}

          {/* Contacts */}
          {contacts.length > 0 && (
            <div className="flex items-center gap-1">
              <div className="flex -space-x-1">
                {contacts.slice(0, 2).map((contact) => (
                  <Avatar key={contact.id} className="h-4 w-4 border border-background">
                    <AvatarFallback className="text-xs">
                      {contact.displayName.slice(0, 1).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
              </div>
              {contacts.length > 2 && (
                <span className="text-xs text-muted-foreground">+{contacts.length - 2}</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Matrix Quadrant Component
function MatrixQuadrant({
  quadrant,
  tasks,
  isLoading,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onCreateTask,
}: {
  quadrant: (typeof quadrants)[0];
  tasks: EnhancedTask[];
  isLoading: boolean;
  onEditTask: (task: EnhancedTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: EnhancedTask) => void;
  onCreateTask?: () => void;
}) {
  const quadrantTasks = tasks.filter((task) => task.eisenhowerQuadrant === quadrant.id);

  // Calculate quadrant stats
  const completedCount = quadrantTasks.filter((task) => task.completed).length;
  const overdueCount = quadrantTasks.filter(
    (task) => task.urgency === "overdue" && !task.completed,
  ).length;
  const totalEstimatedHours =
    quadrantTasks.reduce((sum, task) => sum + (task.estimatedMinutes || 0), 0) / 60;

  return (
    <Card
      className={`h-full ${quadrant.color} border-2`}
      data-testid={`matrix-quadrant-${quadrant.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {quadrant.icon}
            <div>
              <CardTitle className="text-sm font-semibold">{quadrant.title}</CardTitle>
              <p className="text-xs text-muted-foreground">{quadrant.subtitle}</p>
            </div>
          </div>

          {onCreateTask && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-background/50"
              onClick={onCreateTask}
              data-testid={`button-add-task-q${quadrant.id}`}
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Quadrant Stats */}
        <div className="flex items-center gap-2 mt-2">
          <Badge variant="secondary" className="text-xs">
            {quadrantTasks.length} tasks
          </Badge>

          {completedCount > 0 && (
            <Badge className="bg-green-100 text-green-800 text-xs">{completedCount} done</Badge>
          )}

          {overdueCount > 0 && (
            <Badge className="bg-red-100 text-red-800 text-xs">{overdueCount} overdue</Badge>
          )}

          {totalEstimatedHours > 0 && (
            <Badge variant="outline" className="text-xs">
              {Math.round(totalEstimatedHours)}h est.
            </Badge>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-1">{quadrant.description}</p>
      </CardHeader>

      <CardContent className="pt-0 h-96 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-20" />
            ))}
          </div>
        ) : (
          <SortableContext
            items={quadrantTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-0">
              {quadrantTasks.map((task) => (
                <MatrixTaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onToggleComplete={onToggleComplete}
                />
              ))}

              {quadrantTasks.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="opacity-50 mb-2">{quadrant.icon}</div>
                  <p className="text-xs">No {quadrant.title.toLowerCase()} tasks</p>
                </div>
              )}
            </div>
          </SortableContext>
        )}
      </CardContent>
    </Card>
  );
}

export function TasksEisenhowerMatrix({
  tasks,
  isLoading,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onCreateTask,
}: TasksEisenhowerMatrixProps): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const updateTaskMutation = useMutation({
    mutationFn: async ({
      taskId,
      data,
    }: {
      taskId: string;
      data: { priority?: string; urgency?: string };
    }) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Updated",
        description: "Task has been moved to a different quadrant.",
      });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to move task. Please try again.",
        variant: "destructive",
      });
    },
  });

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    // Find the task that was dragged
    const draggedTask = tasks.find((t) => t.id === active.id);
    if (!draggedTask) {
      setActiveId(null);
      return;
    }

    // Determine which quadrant it was dropped in
    const targetQuadrant = quadrants.find((q) => {
      const quadrantTasks = tasks.filter((task) => task.eisenhowerQuadrant === q.id);
      return quadrantTasks.some((task) => task.id === over.id) || over.id === `quadrant-${q.id}`;
    });

    if (targetQuadrant && targetQuadrant.id !== draggedTask.eisenhowerQuadrant) {
      // Calculate new priority and urgency based on quadrant
      let newPriority = draggedTask.priority;

      // Adjust priority based on importance (quadrant 1 & 2 are important)
      if (
        targetQuadrant.important &&
        (draggedTask.priority === "low" || draggedTask.priority === "medium")
      ) {
        newPriority = "high";
      } else if (
        !targetQuadrant.important &&
        (draggedTask.priority === "high" || draggedTask.priority === "urgent")
      ) {
        newPriority = "medium";
      }

      // Update the task with new priority
      updateTaskMutation.mutate({
        taskId: draggedTask.id,
        data: { priority: newPriority },
      });
    }

    setActiveId(null);
  }

  const draggedTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  // Calculate matrix stats
  const matrixStats = {
    totalTasks: tasks.length,
    completedTasks: tasks.filter((t) => t.completed).length,
    overdueTasks: tasks.filter((t) => t.urgency === "overdue" && !t.completed).length,
    highPriorityTasks: tasks.filter(
      (t) => (t.priority === "high" || t.priority === "urgent") && !t.completed,
    ).length,
  };

  return (
    <div className="space-y-4">
      {/* Matrix Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Eisenhower Matrix
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Prioritize tasks by importance and urgency
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{matrixStats.totalTasks}</span> total tasks
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{matrixStats.completedTasks}</span> completed
              </div>
              {matrixStats.overdueTasks > 0 && (
                <div className="text-sm text-red-600">
                  <span className="font-medium">{matrixStats.overdueTasks}</span> overdue
                </div>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Matrix Grid */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="eisenhower-matrix">
          {/* Important & Urgent (Q1) */}
          <div className="relative">
            <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
              URGENT
            </div>
            <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
              IMPORTANT
            </div>
            <SortableContext
              items={tasks.filter((t) => t.eisenhowerQuadrant === 1).map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <MatrixQuadrant
                quadrant={quadrants[0]}
                tasks={tasks}
                isLoading={isLoading}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onToggleComplete={onToggleComplete}
                onCreateTask={onCreateTask}
              />
            </SortableContext>
          </div>

          {/* Important & Not Urgent (Q2) */}
          <div className="relative">
            <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
              IMPORTANT
            </div>
            <SortableContext
              items={tasks.filter((t) => t.eisenhowerQuadrant === 2).map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <MatrixQuadrant
                quadrant={quadrants[1]}
                tasks={tasks}
                isLoading={isLoading}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onToggleComplete={onToggleComplete}
                onCreateTask={onCreateTask}
              />
            </SortableContext>
          </div>

          {/* Not Important & Urgent (Q3) */}
          <div className="relative">
            <div className="absolute -top-2 -left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium z-10">
              URGENT
            </div>
            <SortableContext
              items={tasks.filter((t) => t.eisenhowerQuadrant === 3).map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <MatrixQuadrant
                quadrant={quadrants[2]}
                tasks={tasks}
                isLoading={isLoading}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onToggleComplete={onToggleComplete}
                onCreateTask={onCreateTask}
              />
            </SortableContext>
          </div>

          {/* Not Important & Not Urgent (Q4) */}
          <div className="relative">
            <SortableContext
              items={tasks.filter((t) => t.eisenhowerQuadrant === 4).map((t) => t.id)}
              strategy={verticalListSortingStrategy}
            >
              <MatrixQuadrant
                quadrant={quadrants[3]}
                tasks={tasks}
                isLoading={isLoading}
                onEditTask={onEditTask}
                onDeleteTask={onDeleteTask}
                onToggleComplete={onToggleComplete}
                onCreateTask={onCreateTask}
              />
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {draggedTask ? (
            <MatrixTaskCard
              task={draggedTask}
              isDragging
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onToggleComplete={onToggleComplete}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
