"use client";

import { Badge } from "@/components/ui/badge";
import { Calendar, Clock } from "lucide-react";
import { format, isAfter, isToday } from "date-fns";

interface TaskTimerProps {
  dueDate?: Date | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number | null;
  size?: "sm" | "default";
  variant?: "compact" | "detailed";
}

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

export function TaskTimer({
  dueDate,
  estimatedMinutes,
  actualMinutes,
  size = "default",
  variant = "compact",
}: TaskTimerProps) {
  const isSmall = size === "sm";
  const isDetailed = variant === "detailed";
  const now = new Date();
  const isOverdue = dueDate && isAfter(now, dueDate);
  const isDueToday = dueDate && isToday(dueDate);

  if (!dueDate && !estimatedMinutes && !actualMinutes) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 ${isSmall ? "text-xs" : "text-sm"}`}>
      {/* Due Date */}
      {dueDate && (
        <div className={`flex items-center gap-1 ${
          isOverdue ? 'text-red-600' : 
          isDueToday ? 'text-orange-600' : 
          'text-muted-foreground'
        }`}>
          <Calendar className={`${isSmall ? "h-3 w-3" : "h-4 w-4"}`} />
          <span>
            {isDetailed ? format(dueDate, "MMM dd, yyyy") : format(dueDate, "MMM dd")}
          </span>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs ml-1">
              Overdue
            </Badge>
          )}
          {isDueToday && !isOverdue && (
            <Badge variant="secondary" className="text-xs ml-1">
              Today
            </Badge>
          )}
        </div>
      )}

      {/* Time Estimates */}
      {(estimatedMinutes || actualMinutes) && (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className={`${isSmall ? "h-3 w-3" : "h-4 w-4"}`} />
          {actualMinutes ? (
            <div className="flex items-center gap-1">
              <span>{formatDuration(actualMinutes)}</span>
              {estimatedMinutes && estimatedMinutes !== actualMinutes && isDetailed && (
                <span className="text-xs opacity-75">
                  (est. {formatDuration(estimatedMinutes)})
                </span>
              )}
            </div>
          ) : estimatedMinutes ? (
            <span>{formatDuration(estimatedMinutes)}</span>
          ) : null}
        </div>
      )}
    </div>
  );
}