import { format, formatDistanceToNow } from "date-fns";
import { Task, getCategoryIcon, getCategoryLabel, getCategoryColor } from "./types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Trash2, Calendar, Clock, Bot } from "lucide-react";

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleComplete: (task: Task) => void;
}

export function TaskItem({ task, onEdit, onDelete, onToggleComplete }: TaskItemProps) {
  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.completed;
  const isUrgent = task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && !task.completed;

  return (
    <div className={`p-4 hover:bg-gray-50 transition-colors group ${isUrgent ? "border-l-4 border-l-red-400" : ""} ${task.completed ? "opacity-75" : ""}`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={task.completed}
          onCheckedChange={() => onToggleComplete(task)}
          className="mt-1"
          data-testid={`button-toggle-complete-${task.id}`}
        />
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3
                  onClick={() => onEdit(task)}
                  className={`font-medium cursor-pointer transition-colors ${
                    task.completed
                      ? "text-gray-500 line-through"
                      : "text-gray-900 group-hover:text-primary"
                  }`}
                  data-testid={`text-task-title-${task.id}`}
                >
                  {task.title}
                </h3>
                {isUrgent && !task.completed && (
                  <Badge variant="destructive" className="text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {isOverdue ? "Overdue" : "Urgent"}
                  </Badge>
                )}
              </div>
              
              {task.description && (
                <p
                  className={`text-sm mt-1 ${
                    task.completed ? "text-gray-400 line-through" : "text-muted"
                  }`}
                  data-testid={`text-task-description-${task.id}`}
                >
                  {task.description}
                </p>
              )}
              
              {/* Task Meta */}
              <div className="flex flex-wrap items-center gap-3 mt-3">
                {/* Category Badge */}
                {task.category && (
                  <Badge
                    variant="secondary"
                    className={getCategoryColor(task.category)}
                    data-testid={`badge-category-${task.id}`}
                  >
                    <i className={`${getCategoryIcon(task.category)} mr-1`}></i>
                    {getCategoryLabel(task.category)}
                  </Badge>
                )}
                
                {/* AI Suggested Category */}
                {task.aiSuggestedCategory && task.aiSuggestedCategory !== task.category && (
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200 text-xs"
                    data-testid={`badge-ai-suggestion-${task.id}`}
                  >
                    <Bot className="w-3 h-3 mr-1" />
                    AI suggests: {getCategoryLabel(task.aiSuggestedCategory)}
                  </Badge>
                )}
                
                {/* Due Date */}
                {task.dueDate && (
                  <span
                    className={`text-xs flex items-center ${
                      isOverdue ? "text-red-600 font-medium" : "text-muted-foreground"
                    }`}
                    data-testid={`text-due-date-${task.id}`}
                  >
                    <Calendar className="w-3 h-3 mr-1" />
                    {task.completed ? "Completed" : "Due"} {format(new Date(task.dueDate), "MMM d, yyyy")}
                  </span>
                )}
                
                {/* Created Date */}
                <span className={`text-xs ${task.completed ? "text-gray-400" : "text-muted-foreground"}`} data-testid={`text-created-date-${task.id}`}>
                  Created {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => onEdit(task)}
                title="Edit task"
                data-testid={`button-edit-${task.id}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => onDelete(task.id)}
                title="Delete task"
                data-testid={`button-delete-${task.id}`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
