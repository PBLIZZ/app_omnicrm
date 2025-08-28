"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
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
} from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Task } from "@/server/db/schema";

interface TasksKanbanViewProps {
  tasks: Array<Task & { taggedContactsData?: Array<{ id: string; displayName: string; }> }>;
  isLoading: boolean;
}

const statusColumns = [
  { id: "todo", title: "To Do", color: "bg-slate-100 dark:bg-slate-800" },
  { id: "in_progress", title: "In Progress", color: "bg-blue-100 dark:bg-blue-900/20" },
  { id: "waiting", title: "Waiting", color: "bg-yellow-100 dark:bg-yellow-900/20" },
  { id: "done", title: "Done", color: "bg-green-100 dark:bg-green-900/20" },
];

// Helper functions for display
const getPriorityColor = (priority: string) => {
  const colors = {
    low: "text-green-600 dark:text-green-400 border-green-200 dark:border-green-800",
    medium: "text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800", 
    high: "text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800",
    urgent: "text-red-600 dark:text-red-400 border-red-200 dark:border-red-800",
  } as const;
  
  return colors[priority as keyof typeof colors] || colors.medium;
};

// Draggable Task Card Component
function TaskCard({ 
  task, 
  isDragging = false 
}: { 
  task: Task & { taggedContactsData?: Array<{ id: string; displayName: string; }> };
  isDragging?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const contacts = task.taggedContactsData || [];
  const isOverdue = task.dueDate && new Date() > new Date(task.dueDate);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-50" : ""}`}
      data-testid={`task-card-${task.id}`}
    >
      <Card className={`mb-3 hover:shadow-md transition-shadow border-l-4 ${getPriorityColor(task.priority)}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1">
              {task.source === "ai_generated" && (
                <Bot className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              )}
              <CardTitle className="text-sm font-medium leading-tight">
                {task.title}
              </CardTitle>
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button 
                  variant="ghost" 
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  data-testid={`button-task-actions-${task.id}`}
                >
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          {task.description && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-3">
              {task.description}
            </p>
          )}
        </CardHeader>
        
        <CardContent className="pt-0 space-y-3">
          {/* Priority and Assignee */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <Flag className={`h-3 w-3 ${getPriorityColor(task.priority)}`} />
              <span className="text-xs capitalize">{task.priority}</span>
            </div>
            
            <div className="flex items-center gap-1">
              {task.assignee === "ai" ? (
                <>
                  <Bot className="h-3 w-3 text-blue-500" />
                  <span className="text-xs">AI</span>
                </>
              ) : (
                <>
                  <User className="h-3 w-3 text-green-600" />
                  <span className="text-xs">Me</span>
                </>
              )}
            </div>
          </div>

          {/* Due Date */}
          {task.dueDate && (
            <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-600' : 'text-muted-foreground'}`}>
              <Calendar className="h-3 w-3" />
              {format(new Date(task.dueDate), "MMM dd")}
              {isOverdue && <Badge variant="destructive" className="text-xs ml-1">Overdue</Badge>}
            </div>
          )}

          {/* Estimated Time */}
          {task.estimatedMinutes && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {task.estimatedMinutes < 60 
                ? `${task.estimatedMinutes}m`
                : `${Math.floor(task.estimatedMinutes / 60)}h ${task.estimatedMinutes % 60}m`
              }
            </div>
          )}

          {/* Tagged Contacts */}
          {contacts.length > 0 && (
            <div className="flex items-center gap-1">
              {contacts.slice(0, 3).map((contact) => (
                <Avatar key={contact.id} className="h-5 w-5">
                  <AvatarFallback className="text-xs text-[10px]">
                    {contact.displayName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
              ))}
              {contacts.length > 3 && (
                <Badge variant="secondary" className="text-xs h-5">
                  +{contacts.length - 3}
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Kanban Column Component
function KanbanColumn({ 
  column, 
  tasks, 
  isLoading 
}: { 
  column: typeof statusColumns[0];
  tasks: Array<Task & { taggedContactsData?: Array<{ id: string; displayName: string; }> }>;
  isLoading: boolean;
}) {
  const columnTasks = tasks.filter(task => task.status === column.id);

  return (
    <div 
      className={`flex-1 min-w-80 rounded-lg p-4 ${column.color}`}
      data-testid={`kanban-column-${column.id}`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{column.title}</h3>
          <Badge variant="secondary" className="text-xs">
            {columnTasks.length}
          </Badge>
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0 hover:bg-background/50"
          data-testid={`button-add-task-${column.id}`}
        >
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      <div className="space-y-0 min-h-32">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="w-full h-32" />
            ))}
          </div>
        ) : (
          <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
            <div className="group">
              {columnTasks.map((task) => (
                <TaskCard key={task.id} task={task} />
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

export function TasksKanbanView({ tasks, isLoading }: TasksKanbanViewProps): JSX.Element {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, data }: { taskId: string; data: { status: string } }) => {
      return apiRequest(`/api/tasks/${taskId}`, {
        method: "PUT",
        body: data,
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
    const draggedTask = tasks.find(t => t.id === active.id);
    if (!draggedTask) {
      setActiveId(null);
      return;
    }

    // Determine the new status based on which column it was dropped in
    const overColumn = statusColumns.find(col => {
      const columnTasks = tasks.filter(task => task.status === col.id);
      return columnTasks.some(task => task.id === over.id) || over.id === col.id;
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

  const draggedTask = activeId ? tasks.find(t => t.id === activeId) : null;

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
            items={tasks.filter(t => t.status === column.id).map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn 
              column={column} 
              tasks={tasks} 
              isLoading={isLoading}
            />
          </SortableContext>
        ))}
      </div>

      <DragOverlay>
        {draggedTask ? (
          <TaskCard task={draggedTask} isDragging />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}