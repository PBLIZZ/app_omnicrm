"use client";

import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Pause, XCircle, Circle } from "lucide-react";

interface StatusBadgeProps {
  status: string;
  size?: "sm" | "default";
  showIcon?: boolean;
  variant?: "badge" | "inline";
}

const statusConfig = {
  todo: {
    label: "To Do",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    borderColor: "border-gray-200 dark:border-gray-800",
    icon: Circle,
  },
  in_progress: {
    label: "In Progress",
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
    icon: Clock,
  },
  waiting: {
    label: "Waiting",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: Pause,
  },
  done: {
    label: "Done",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
    icon: CheckCircle,
  },
  cancelled: {
    label: "Cancelled",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: XCircle,
  },
} as const;

export function StatusBadge({
  status,
  size = "default",
  showIcon = true,
  variant = "badge",
}: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.todo;
  const isSmall = size === "sm";
  const Icon = config.icon;

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        {showIcon && (
          <Icon className={`${isSmall ? "h-3 w-3" : "h-4 w-4"}`} />
        )}
        <span className={`${isSmall ? "text-xs" : "text-sm"}`}>
          {config.label}
        </span>
      </div>
    );
  }

  return (
    <Badge
      variant="outline"
      className={`
        ${config.color}
        ${config.bgColor}
        ${config.borderColor}
        ${isSmall ? "text-xs px-2 py-0" : "text-sm"}
        flex items-center gap-1
      `}
    >
      {showIcon && (
        <Icon className={`${isSmall ? "h-2 w-2" : "h-3 w-3"} fill-current`} />
      )}
      {config.label}
    </Badge>
  );
}