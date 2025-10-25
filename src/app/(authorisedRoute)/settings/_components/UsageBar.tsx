"use client";

import { Progress } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

interface UsageBarProps {
  label: string;
  current: number;
  limit?: number;
  unlimited?: boolean;
  unit?: string;
}

/**
 * UsageBar - Visual usage indicator for subscription limits
 *
 * Features:
 * - Progress bar visualization
 * - Warning state when approaching limit
 * - Support for unlimited resources
 * - Custom units (GB, emails, etc.)
 * - Wellness-friendly display
 */
export function UsageBar({
  label,
  current,
  limit,
  unlimited = false,
  unit = "",
}: UsageBarProps): JSX.Element {
  const percentage = unlimited || !limit ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !unlimited && limit && current > limit * 0.8;
  const isOverLimit = !unlimited && limit && current >= limit;

  return (
    <div className="space-y-2">
      {/* Label and Value */}
      <div className="flex justify-between items-center text-sm">
        <span className="text-gray-700">{label}</span>
        <span className="font-medium">
          {current.toLocaleString()}
          {unit && ` ${unit}`}
          {!unlimited && limit && (
            <>
              {" / "}
              {limit.toLocaleString()}
              {unit && ` ${unit}`}
            </>
          )}
          {unlimited && " / ∞"}
        </span>
      </div>

      {/* Progress Bar - only show if not unlimited */}
      {!unlimited && limit && (
        <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              isOverLimit
                ? "bg-red-500"
                : isNearLimit
                  ? "bg-amber-500"
                  : "bg-gradient-to-r from-green-400 to-emerald-500"
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      )}

      {/* Warning Message */}
      {isNearLimit && !isOverLimit && (
        <div className="flex items-center gap-1.5 text-xs text-amber-600">
          <AlertCircle className="h-3 w-3" />
          <span>Approaching your limit</span>
        </div>
      )}

      {isOverLimit && (
        <div className="flex items-center gap-1.5 text-xs text-red-600">
          <AlertCircle className="h-3 w-3" />
          <span>You've reached your limit - consider upgrading</span>
        </div>
      )}
    </div>
  );
}
