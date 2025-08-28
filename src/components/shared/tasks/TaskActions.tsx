"use client";

import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  Copy,
  Clock,
  User,
  Bot,
} from "lucide-react";
import type { Task } from "@/server/db/schema";

interface TaskActionsProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onDuplicate?: (task: Task) => void;
  onToggleComplete?: (taskId: string) => void;
  onChangeAssignee?: (taskId: string, assignee: "user" | "ai") => void;
  variant?: "dropdown" | "inline";
  size?: "sm" | "default";
}

export function TaskActions({
  task,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleComplete,
  onChangeAssignee,
  variant = "dropdown",
  size = "default",
}: TaskActionsProps) {
  const isSmall = size === "sm";
  const isCompleted = task.status === "done";

  const handleEdit = () => onEdit?.(task);
  const handleDelete = () => onDelete?.(task.id);
  const handleDuplicate = () => onDuplicate?.(task);
  const handleToggleComplete = () => onToggleComplete?.(task.id);
  const handleChangeToUser = () => onChangeAssignee?.(task.id, "user");
  const handleChangeToAI = () => onChangeAssignee?.(task.id, "ai");

  if (variant === "inline") {
    return (
      <div className="flex items-center gap-1">
        {onEdit && (
          <Button
            variant="ghost"
            size={isSmall ? "sm" : "default"}
            onClick={handleEdit}
            className="h-6 w-6 p-0"
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}
        
        {onToggleComplete && (
          <Button
            variant="ghost"
            size={isSmall ? "sm" : "default"}
            onClick={handleToggleComplete}
            className={`h-6 w-6 p-0 ${isCompleted ? 'text-green-600' : ''}`}
          >
            <CheckCircle className="h-3 w-3" />
          </Button>
        )}
        
        {onDuplicate && (
          <Button
            variant="ghost"
            size={isSmall ? "sm" : "default"}
            onClick={handleDuplicate}
            className="h-6 w-6 p-0"
          >
            <Copy className="h-3 w-3" />
          </Button>
        )}
        
        {onDelete && (
          <Button
            variant="ghost"
            size={isSmall ? "sm" : "default"}
            onClick={handleDelete}
            className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`${isSmall ? "h-6 w-6" : "h-8 w-8"} p-0`}
        >
          <span className="sr-only">Open menu</span>
          <MoreHorizontal className={`${isSmall ? "h-3 w-3" : "h-4 w-4"}`} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {onEdit && (
          <DropdownMenuItem onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Task
          </DropdownMenuItem>
        )}
        
        {onToggleComplete && (
          <DropdownMenuItem onClick={handleToggleComplete}>
            <CheckCircle className={`mr-2 h-4 w-4 ${isCompleted ? 'text-green-600' : ''}`} />
            {isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
          </DropdownMenuItem>
        )}
        
        {onDuplicate && (
          <DropdownMenuItem onClick={handleDuplicate}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Task
          </DropdownMenuItem>
        )}
        
        {onChangeAssignee && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleChangeToUser}
              disabled={task.assignee === "user"}
            >
              <User className="mr-2 h-4 w-4" />
              Assign to Me
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={handleChangeToAI}
              disabled={task.assignee === "ai"}
            >
              <Bot className="mr-2 h-4 w-4" />
              Assign to AI
            </DropdownMenuItem>
          </>
        )}
        
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Task
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}