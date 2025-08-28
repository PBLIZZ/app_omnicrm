"use client";

import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";

interface UrgencyIndicatorProps {
  urgency: "overdue" | "due_today" | "due_soon" | "future";
  size?: "sm" | "default";
  showIcon?: boolean;
  variant?: "badge" | "inline";
}

const urgencyConfig = {
  overdue: {
    label: "Overdue",
    color: "text-red-600 dark:text-red-400",
    bgColor: "bg-red-50 dark:bg-red-900/20",
    borderColor: "border-red-200 dark:border-red-800",
    icon: AlertTriangle,
  },
  due_today: {
    label: "Due Today",
    color: "text-orange-600 dark:text-orange-400",
    bgColor: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-orange-200 dark:border-orange-800",
    icon: Clock,
  },
  due_soon: {
    label: "Due Soon",
    color: "text-yellow-600 dark:text-yellow-400",
    bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
    borderColor: "border-yellow-200 dark:border-yellow-800",
    icon: Clock,
  },
  future: {
    label: "Future",
    color: "text-gray-600 dark:text-gray-400",
    bgColor: "bg-gray-50 dark:bg-gray-900/20",
    borderColor: "border-gray-200 dark:border-gray-800",
    icon: Clock,
  },
} as const;

export function UrgencyIndicator({
  urgency,
  size = "default",
  showIcon = true,
  variant = "badge",
}: UrgencyIndicatorProps) {
  const config = urgencyConfig[urgency];
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
        <Icon className={`${isSmall ? "h-2 w-2" : "h-3 w-3"}`} />
      )}
      {config.label}
    </Badge>
  );
}