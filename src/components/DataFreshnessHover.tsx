/**
 * DataFreshnessHover Component
 *
 * Smart hover card system that detects when displayed data depends on
 * normalization and provides contextual guidance about job processing.
 *
 * Key Features:
 * - Automatic data freshness detection
 * - Context-aware messaging
 * - Direct action links to trigger processing
 * - Intelligent display logic (only shows when needed)
 */

"use client";

import React, { useState, useEffect } from "react";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Zap, AlertTriangle, TrendingUp, Database } from "lucide-react";
import { cn } from "@/lib/utils";

interface DataFreshnessHoverProps {
  children: React.ReactNode;
  dataInfo: DataFreshnessInfo;
  onProcessJobs?: () => void;
  onViewJobStatus?: () => void;
  disabled?: boolean; // Disable the hover when data is fresh
  className?: string;
}

export function DataFreshnessHover({
  children,
  dataInfo,
  onProcessJobs,
  onViewJobStatus,
  disabled = false,
  className,
}: DataFreshnessHoverProps) {
  const [showHover, setShowHover] = useState(false);

  // Only show hover if data needs processing and we're not disabled
  const shouldShowHover = !disabled && dataInfo.needsProcessing && dataInfo.processingRate < 100;

  if (!shouldShowHover) {
    return <>{children}</>;
  }

  const getDataTypeDescription = (dataType: string) => {
    const descriptions = {
      contacts: "contact information and relationships",
      interactions: "email and meeting data",
      insights: "AI-generated insights and summaries",
      dashboard: "dashboard metrics and analytics",
      calendar: "calendar events and scheduling data",
      general: "application data",
    };
    return descriptions[dataType as keyof typeof descriptions] || descriptions.general;
  };

  const getUrgencyLevel = (processingRate: number, pendingJobs: number) => {
    if (processingRate < 50 && pendingJobs > 20) return "high";
    if (processingRate < 80 && pendingJobs > 10) return "medium";
    return "low";
  };

  const urgency = getUrgencyLevel(dataInfo.processingRate, dataInfo.pendingJobs);
  const dataTypeDesc = getDataTypeDescription(dataInfo.dataType);
  const lastProcessed = dataInfo.lastProcessedAt
    ? new Date(dataInfo.lastProcessedAt).toLocaleString()
    : "Never";

  return (
    <HoverCard open={showHover} onOpenChange={setShowHover}>
      <HoverCardTrigger asChild>
        <div
          className={cn("relative", shouldShowHover && "cursor-help", className)}
          onMouseEnter={() => setShowHover(true)}
          onMouseLeave={() => setShowHover(false)}
        >
          {children}
          {shouldShowHover && (
            <div className="absolute -top-1 -right-1 z-10">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse border-2 border-white shadow-sm" />
            </div>
          )}
        </div>
      </HoverCardTrigger>
      <HoverCardContent className="w-80 p-0" side="top" align="center" sideOffset={8}>
        <div className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start space-x-3">
            <div className="p-2 rounded-md bg-yellow-100">
              <Clock className="h-4 w-4 text-yellow-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-sm">Data Processing Required</h4>
              <p className="text-xs text-muted-foreground">
                This {dataTypeDesc} may not reflect the latest changes
              </p>
            </div>
          </div>

          {/* Processing Status */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm">Processing Progress</span>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  urgency === "high" && "border-red-200 text-red-700",
                  urgency === "medium" && "border-yellow-200 text-yellow-700",
                  urgency === "low" && "border-blue-200 text-blue-700",
                )}
              >
                {dataInfo.processingRate}%
              </Badge>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  urgency === "high" && "bg-red-500",
                  urgency === "medium" && "bg-yellow-500",
                  urgency === "low" && "bg-blue-500",
                )}
                style={{ width: `${dataInfo.processingRate}%` }}
              />
            </div>
          </div>

          {/* Pending Jobs */}
          {dataInfo.pendingJobs > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Pending jobs:</span>
              <span className="font-medium">{dataInfo.pendingJobs}</span>
            </div>
          )}

          {/* Last Processed */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Last processed:</span>
            <span className="font-medium text-xs">{lastProcessed}</span>
          </div>

          {/* Affected Metrics */}
          {dataInfo.affectedMetrics && dataInfo.affectedMetrics.length > 0 && (
            <div className="space-y-2">
              <span className="text-sm text-muted-foreground">May affect:</span>
              <div className="flex flex-wrap gap-1">
                {dataInfo.affectedMetrics.map((metric, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {metric}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Urgency Alert */}
          {urgency === "high" && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-700 text-sm">
                Processing is significantly behind. Consider processing jobs now for accurate data.
              </AlertDescription>
            </Alert>
          )}

          {/* Estimated Update Time */}
          {dataInfo.estimatedUpdateTime && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>
                Updates in ~{dataInfo.estimatedUpdateTime} minute
                {dataInfo.estimatedUpdateTime !== 1 ? "s" : ""} after processing
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 pt-2 border-t">
            {onProcessJobs && (
              <Button
                size="sm"
                onClick={() => {
                  onProcessJobs();
                  setShowHover(false);
                }}
                className="flex-1"
              >
                <Zap className="h-4 w-4 mr-2" />
                Process Jobs
              </Button>
            )}
            {onViewJobStatus && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  onViewJobStatus();
                  setShowHover(false);
                }}
                className="flex-1"
              >
                <Database className="h-4 w-4 mr-2" />
                View Status
              </Button>
            )}
          </div>

          {/* Helpful Tip */}
          <div className="text-xs text-muted-foreground bg-blue-50 p-2 rounded-md">
            💡 <strong>Tip:</strong> Processing converts raw sync data into the structured
            information shown here.
            {dataInfo.processingRate < 90 && " Complete processing for the most accurate view."}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

/**
 * Hook to determine data freshness for components
 */
export function useDataFreshness(
  dataType: DataFreshnessInfo["dataType"],
  dependencies: {
    processingRate?: number;
    pendingJobs?: number;
    lastProcessedAt?: string | null;
    affectedMetrics?: string[];
  },
): DataFreshnessInfo {
  const [freshnessInfo, setFreshnessInfo] = useState<DataFreshnessInfo>({
    needsProcessing: false,
    processingRate: 100,
    pendingJobs: 0,
    lastProcessedAt: null,
    dataType,
    affectedMetrics: dependencies.affectedMetrics || [],
  });

  useEffect(() => {
    const processingRate = dependencies.processingRate ?? 100;
    const pendingJobs = dependencies.pendingJobs ?? 0;
    const needsProcessing = processingRate < 100 || pendingJobs > 0;

    // Estimate update time based on data type and processing requirements
    let estimatedUpdateTime = 1; // Default 1 minute
    if (dataType === "insights") estimatedUpdateTime = 3;
    if (dataType === "dashboard") estimatedUpdateTime = 2;
    if (pendingJobs > 20) estimatedUpdateTime += 2;

    const next: DataFreshnessInfo = {
      needsProcessing,
      processingRate,
      pendingJobs,
      lastProcessedAt: dependencies.lastProcessedAt || null,
      dataType,
      affectedMetrics: dependencies.affectedMetrics || [],
    };

    // Only add estimatedUpdateTime if it's actually needed
    if (needsProcessing) {
      next.estimatedUpdateTime = estimatedUpdateTime;
    }

    setFreshnessInfo(next);
  }, [
    dataType,
    dependencies.processingRate,
    dependencies.pendingJobs,
    dependencies.lastProcessedAt,
    dependencies.affectedMetrics,
  ]);

  return freshnessInfo;
}

/**
 * Higher-order component to wrap any component with data freshness detection
 */
export function withDataFreshness<P extends object>(
  Component: React.ComponentType<P>,
  dataType: DataFreshnessInfo["dataType"],
  getFreshnessProps?: (props: P) => Partial<DataFreshnessInfo>,
) {
  return function WrappedComponent(
    props: P & {
      onProcessJobs?: () => void;
      onViewJobStatus?: () => void;
      dataFreshnessDisabled?: boolean;
    },
  ) {
    const { onProcessJobs, onViewJobStatus, dataFreshnessDisabled, ...componentProps } = props;

    // Get additional freshness info from props if provided
    const additionalInfo = getFreshnessProps ? getFreshnessProps(props) : {};

    const freshnessInfo = useDataFreshness(dataType, {
      affectedMetrics: [],
      ...additionalInfo,
    });

    const hoverProps: Omit<DataFreshnessHoverProps, 'children'> = {
      dataInfo: freshnessInfo,
      ...(dataFreshnessDisabled !== undefined && { disabled: dataFreshnessDisabled }),
    };

    // Only add callbacks if they're defined
    if (onProcessJobs) {
      hoverProps.onProcessJobs = onProcessJobs;
    }
    if (onViewJobStatus) {
      hoverProps.onViewJobStatus = onViewJobStatus;
    }

    return (
      <DataFreshnessHover {...hoverProps}>
        <Component {...(componentProps as P)} />
      </DataFreshnessHover>
    );
  };
}
