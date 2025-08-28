"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, Edit, Trash2, Bot, User } from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { UrgencyIndicator } from "./UrgencyIndicator";
import { StatusBadge } from "./StatusBadge";
import { TaskTimer } from "./TaskTimer";
import { ContactAvatarGroup } from "./ContactAvatarGroup";
import { AIInsightBadge } from "./AIInsightBadge";
import type { Task } from "@/server/db/schema";

interface TaskCardProps {
  task: Task & { 
    taggedContactsData?: Array<{ id: string; displayName: string; }>;
    urgency?: "overdue" | "due_today" | "due_soon" | "future";
    eisenhowerQuadrant?: 1 | 2 | 3 | 4;
  };
  variant?: "default" | "compact" | "matrix";
  showActions?: boolean;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onStatusChange?: (taskId: string, status: string) => void;
  className?: string;
}

export function TaskCard({
  task,
  variant = "default",
  showActions = true,
  onEdit,
  onDelete,
  onStatusChange,
  className = "",
}: TaskCardProps) {
  const isCompact = variant === "compact";
  const isMatrix = variant === "matrix";
  
  const cardClass = `
    ${className} 
    ${isMatrix ? "cursor-grab hover:shadow-md transition-shadow" : ""}
    ${task.source === "ai_generated" ? "border-l-4 border-l-blue-500" : ""}
  `;

  const handleEdit = () => onEdit?.(task);
  const handleDelete = () => onDelete?.(task.id);

  return (
    <Card className={cardClass}>
      <CardHeader className={`${isCompact ? "pb-2" : "pb-3"}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {task.source === "ai_generated" && (
              <Bot className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <h4 className={`font-medium leading-tight ${isCompact ? "text-sm" : ""}`}>
                {task.title}
              </h4>
              {task.description && !isCompact && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
          </div>
          
          {showActions && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-6 w-6 p-0">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleEdit}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Task
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {/* Status and Priority Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} size={isCompact ? "sm" : "default"} />
            <PriorityBadge priority={task.priority} size={isCompact ? "sm" : "default"} />
          </div>
          
          {task.urgency && (
            <UrgencyIndicator urgency={task.urgency} size={isCompact ? "sm" : "default"} />
          )}
        </div>

        {/* Assignee and AI Insights */}
        <div className="flex items-center justify-between">
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
          
          {task.source === "ai_generated" && (
            <AIInsightBadge size={isCompact ? "sm" : "default"} />
          )}
        </div>

        {/* Time and Contacts */}
        {!isCompact && (
          <>
            {(task.dueDate || task.estimatedMinutes) && (
              <TaskTimer
                dueDate={task.dueDate}
                estimatedMinutes={task.estimatedMinutes}
                actualMinutes={task.actualMinutes}
                size="sm"
              />
            )}

            {task.taggedContactsData && task.taggedContactsData.length > 0 && (
              <ContactAvatarGroup
                contacts={task.taggedContactsData}
                maxDisplay={3}
                size="sm"
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}