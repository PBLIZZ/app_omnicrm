"use client";

import { Badge } from "@/components/ui/badge";
import { Flag } from "lucide-react";

interface PriorityBadgeProps {
  priority: string;
  size?: "sm" | "default";
  showIcon?: boolean;
  variant?: "badge" | "inline";
}

const priorityConfig = {
  low: {
    label: "Low",
    color: "text-green-600 dark:text-green-400",
    bgColor: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-green-200 dark:border-green-800",
  },
  medium: {
    label: "Medium", 
    color: "text-blue-600 dark:text-blue-400",
    bgColor: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-blue-200 dark:border-blue-800",
  },
  high: {
    label: "High",
    color: "text-orange-600 dark:text-orange-400", 
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
  },
  urgent: {
    label: "Urgent",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20", 
    borderColor: "border-red-200 dark:border-red-800",
  },
} as const;

export function PriorityBadge({
  priority,
  size = "default",
  showIcon = true,
  variant = "badge",
}: PriorityBadgeProps) {
  const config = priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.medium;
  const isSmall = size === "sm";

  if (variant === "inline") {
    return (
      <div className={`flex items-center gap-1 ${config.color}`}>
        {showIcon && (
          <Flag className={`${isSmall ? "h-3 w-3" : "h-4 w-4"}`} />
        )}
        <span className={`${isSmall ? "text-xs" : "text-sm"} capitalize`}>
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
        <Flag className={`${isSmall ? "h-2 w-2" : "h-3 w-3"}`} />
      )}
      {config.label}
    </Badge>
  );
}