import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  Plus,
  CheckSquare,
  AlertTriangle,
  Tag,
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { EnhancedTask } from "@/lib/task-utils";
import { getPriorityColor, getUrgencyColor, getEisenhowerQuadrantInfo } from "@/lib/task-utils";

interface TasksKanbanViewEnhancedProps {
  tasks: EnhancedTask[];
  isLoading: boolean;
  onEditTask: (task: EnhancedTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: EnhancedTask) => void;
  onCreateTask?: () => void;
}

const statusColumns = [
  { id: "todo", title: "To Do", color: "bg-slate-100 dark:bg-slate-800", icon: "⭕" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100 dark:bg-blue-900", icon: "🔄" },
  { id: "waiting", title: "Waiting", color: "bg-yellow-100 dark:bg-yellow-900", icon: "⏳" },
  { id: "done", title: "Done", color: "bg-green-100 dark:bg-green-900", icon: "✅" },
  { id: "cancelled", title: "Cancelled", color: "bg-gray-100 dark:bg-gray-800", icon: "❌" },
];

// Enhanced Task Card Component
function TaskCard({
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
  const quadrantInfo = getEisenhowerQuadrantInfo(task.eisenhowerQuadrant);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      data-testid={`task-card-${task.id}`}
    >
      <Card
        className={`mb-3 hover:shadow-md transition-shadow border-l-4 ${getPriorityColor(task.priority)} ${
          isOverdue ? "bg-red-50 border-red-200" : ""
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-sm leading-tight line-clamp-2 mb-1">{task.title}</h4>
              {task.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {task.description}
                </p>
              )}
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0">
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

          {/* Priority and Urgency Badges */}
          <div className="flex items-center gap-2 mb-2">
            <Badge
              className={
                task.priority === "urgent"
                  ? "bg-red-100 text-red-800"
                  : task.priority === "high"
                    ? "bg-orange-100 text-orange-800"
                    : task.priority === "medium"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-green-100 text-green-800"
              }
            >
              {task.priority.toUpperCase()}
            </Badge>

            <Badge className={getUrgencyColor(task.urgency)}>
              {task.urgency.replace("_", " ").toUpperCase()}
            </Badge>

            <Badge className={quadrantInfo.color} title={quadrantInfo.description}>
              Q{task.eisenhowerQuadrant}
            </Badge>
          </div>

          {/* Progress Bar */}
          {task.completionPercentage > 0 && (
            <div className="space-y-1 mb-2">
              <Progress value={task.completionPercentage} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {task.completionPercentage}% complete
                {task.subtasks && (
                  <span className="ml-2">
                    ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}{" "}
                    subtasks)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  <Tag className="h-2 w-2 mr-1" />
                  {tag}
                </Badge>
              ))}
              {task.tags.length > 3 && (
                <Badge variant="secondary" className="text-xs">
                  +{task.tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-2">
            {/* Due Date */}
            {task.dueDate && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                }`}
              >
                <Calendar className="h-3 w-3" />
                <span>
                  {format(new Date(task.dueDate), "MMM d, yyyy")}
                  {isOverdue && " (Overdue)"}
                </span>
                {isOverdue && <AlertTriangle className="h-3 w-3 text-red-600" />}
              </div>
            )}

            {/* Time Estimation */}
            {task.estimatedMinutes && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  Est: {Math.round(task.estimatedMinutes / 60)}h
                  {task.actualMinutes && (
                    <span className="ml-1">| Actual: {Math.round(task.actualMinutes / 60)}h</span>
                  )}
                </span>
              </div>
            )}

            {/* Assignee */}
            {task.owner && task.owner !== "user" && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {task.assignee === "ai" ? (
                  <Bot className="h-3 w-3" />
                ) : (
                  <User className="h-3 w-3" />
                )}
                <span>{task.owner}</span>
              </div>
            )}

            {/* Tagged Contacts */}
            {contacts.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex -space-x-1">
                  {contacts.slice(0, 3).map((contact) => (
                    <Avatar key={contact.id} className="h-5 w-5 border border-background">
                      <AvatarFallback className="text-xs">
                        {contact.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                </div>
                {contacts.length > 3 && (
                  <span className="text-xs text-muted-foreground">+{contacts.length - 3} more</span>
                )}
              </div>
            )}

            {/* Workspace & Project Context */}
            <div className="text-xs text-muted-foreground space-y-1">
              {task.workspaceName && <div>📁 {task.workspaceName}</div>}
              {task.projectName && <div>📋 {task.projectName}</div>}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Enhanced Kanban Column Component
function KanbanColumn({
  column,
  tasks,
  isLoading,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onCreateTask,
}: {
  column: (typeof statusColumns)[0];
  tasks: EnhancedTask[];
  isLoading: boolean;
  onEditTask: (task: EnhancedTask) => void;
  onDeleteTask: (taskId: string) => void;
  onToggleComplete: (task: EnhancedTask) => void;
  onCreateTask?: () => void;
}) {
  const columnTasks = tasks.filter((task) => task.status === column.id);

  // Calculate column stats
  const overdueCount = columnTasks.filter((task) => task.urgency === "overdue").length;
  const highPriorityCount = columnTasks.filter(
    (task) => task.priority === "high" || task.priority === "urgent",
  ).length;

  return (
    <div
      className={`flex-1 min-w-80 rounded-lg p-4 ${column.color}`}
      data-testid={`kanban-column-${column.id}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="text-lg">{column.icon}</span>
          <h3 className="font-semibold">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {columnTasks.length}
          </Badge>
          {overdueCount > 0 && (
            <Badge className="bg-red-100 text-red-800 text-xs">{overdueCount} overdue</Badge>
          )}
          {highPriorityCount > 0 && (
            <Badge className="bg-orange-100 text-orange-800 text-xs">
              {highPriorityCount} high priority
            </Badge>
          )}
        </div>

        {onCreateTask && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 hover:bg-background/50"
            onClick={onCreateTask}
            data-testid={`button-add-task-${column.id}`}
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-0 min-h-32">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-32" />
            ))}
          </div>
        ) : (
          <SortableContext
            items={columnTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="group">
              {columnTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onToggleComplete={onToggleComplete}
                />
              ))}
            </div>
          </SortableContext>
        )}

        {!isLoading && columnTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CheckSquare className="mx-auto h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">No {column.title.toLowerCase()} tasks</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function TasksKanbanViewEnhanced({
  tasks,
  isLoading,
  onEditTask,
  onDeleteTask,
  onToggleComplete,
  onCreateTask,
}: TasksKanbanViewEnhancedProps): JSX.Element {
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
    mutationFn: async ({ taskId, data }: { taskId: string; data: { status: string } }) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task Updated",
        description: "Task status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast({
        title: "Error",
        description: "Failed to update task status. Please try again.",
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

    // Determine the new status based on which column it was dropped in
    const overColumn = statusColumns.find((col) => {
      const columnTasks = tasks.filter((task) => task.status === col.id);
      return columnTasks.some((task) => task.id === over.id) || over.id === col.id;
    });

    // If dropped in a different column, update the task status
    if (overColumn && overColumn.id !== draggedTask.status) {
      updateTaskMutation.mutate({
        taskId: draggedTask.id,
        data: { status: overColumn.id },
      });
    }

    setActiveId(null);
  }

  const draggedTask = activeId ? tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 overflow-x-auto pb-4" data-testid="kanban-board">
        {statusColumns.map((column) => (
          <SortableContext
            key={column.id}
            items={tasks.filter((t) => t.status === column.id).map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn
              column={column}
              tasks={tasks}
              isLoading={isLoading}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onToggleComplete={onToggleComplete}
              {...(onCreateTask && { onCreateTask })}
            />
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {draggedTask ? (
          <TaskCard
            task={draggedTask}
            isDragging
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onToggleComplete={onToggleComplete}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
