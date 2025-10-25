"use client";

import { useState } from "react";
import { Badge, Button } from "@/components/ui";
import { Check, Edit2, Trash2, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import type { Task } from "@/server/db/schema";
import type { Zone } from "@/server/db/business-schemas";

interface TaskItemProps {
  task: Task;
  zones: Zone[];
  onToggleComplete: (taskId: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetails: (task: Task) => void;
}

/**
 * TaskItem - Individual task row component
 *
 * Features:
 * - Checkbox for completion toggle
 * - Task title with description
 * - Colored zone badges
 * - Priority indicators
 * - Due date display
 * - Quick actions (edit, delete, view details)
 */
export function TaskItem({
  task,
  zones,
  onToggleComplete,
  onEdit,
  onDelete,
  onViewDetails,
}: TaskItemProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.name);

  const zone = zones.find((z) => z.id === task.zoneId);
  const isCompleted = task.status === "done";

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case "urgent":
        return "bg-red-100 text-red-800 border-red-200";
      case "high":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "low":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "done":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "todo":
        return "bg-gray-100 text-gray-800";
      case "canceled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSaveEdit = (): void => {
    if (editText.trim() && editText !== task.name) {
      // TODO: Implement task name update
      onEdit({ ...task, name: editText.trim() });
    }
    setIsEditing(false);
  };

  const handleCancelEdit = (): void => {
    setEditText(task.name);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "Enter") {
      handleSaveEdit();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border transition-all hover:shadow-sm ${
        isCompleted ? "bg-gray-50 opacity-75" : "bg-white"
      }`}
    >
      {/* Checkbox */}
      <button
        onClick={() => onToggleComplete(task.id)}
        className={`flex items-center justify-center w-5 h-5 rounded border-2 transition-colors ${
          isCompleted
            ? "bg-green-500 border-green-500 text-white"
            : "border-gray-300 hover:border-green-500"
        }`}
        aria-label={isCompleted ? "Mark as incomplete" : "Mark as complete"}
      >
        {isCompleted && <Check className="w-3 h-3" />}
      </button>

      {/* Task Content */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={handleSaveEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
          />
        ) : (
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setIsEditing(true)}
              className={`text-left text-sm font-medium transition-colors hover:text-blue-600 ${
                isCompleted ? "line-through text-gray-500" : "text-gray-900"
              }`}
            >
              {task.name}
            </button>

            {/* Description */}
            {task.details && typeof task.details === "object" && (
              <p className="text-xs text-gray-500 line-clamp-1">
                {(task.details as { description?: string }).description}
              </p>
            )}

            {/* Metadata Row */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Zone Badge */}
              {zone && (
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{
                    borderColor: zone.color || "#6366F1",
                    color: zone.color || "#6366F1",
                  }}
                >
                  {zone.name}
                </Badge>
              )}

              {/* Priority Badge */}
              <Badge className={`text-xs border ${getPriorityColor(task.priority)}`}>
                {task.priority}
              </Badge>

              {/* Status Badge */}
              <Badge className={`text-xs ${getStatusColor(task.status)}`}>
                {task.status.replace("_", " ")}
              </Badge>

              {/* Due Date */}
              {task.dueDate && (
                <span className="text-gray-500">Due {format(new Date(task.dueDate), "MMM d")}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onViewDetails(task)}
            className="h-8 w-8 p-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </Button>

          <Button size="sm" variant="ghost" onClick={() => onEdit(task)} className="h-8 w-8 p-0">
            <Edit2 className="w-4 h-4" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(task.id)}
            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
