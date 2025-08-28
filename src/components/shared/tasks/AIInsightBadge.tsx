"use client";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Bot, Sparkles } from "lucide-react";

interface AIInsightBadgeProps {
  confidence?: number;
  size?: "sm" | "default";
  showTooltip?: boolean;
  variant?: "bot" | "sparkles";
}

export function AIInsightBadge({
  confidence,
  size = "default",
  showTooltip = true,
  variant = "bot",
}: AIInsightBadgeProps) {
  const isSmall = size === "sm";
  const Icon = variant === "bot" ? Bot : Sparkles;
  
  const getConfidenceColor = (conf: number) => {
    if (conf >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (conf >= 0.6) return "text-blue-600 bg-blue-50 border-blue-200";
    return "text-yellow-600 bg-yellow-50 border-yellow-200";
  };

  const badge = (
    <Badge
      variant="outline"
      className={`
        flex items-center gap-1
        ${confidence ? getConfidenceColor(confidence) : "text-blue-600 bg-blue-50 border-blue-200"}
        ${isSmall ? "text-xs px-2 py-0" : "text-sm"}
      `}
    >
      <Icon className={`${isSmall ? "h-2 w-2" : "h-3 w-3"}`} />
      AI
    </Badge>
  );

  if (!showTooltip || !confidence) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p>AI Generated (Confidence: {Math.round(confidence * 100)}%)</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}