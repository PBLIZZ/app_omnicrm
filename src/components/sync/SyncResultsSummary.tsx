"use client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, AlertCircle, RefreshCw, ExternalLink } from "lucide-react";

interface SyncProgress {
  sessionId: string;
  service: "gmail" | "calendar";
  status: "started" | "importing" | "processing" | "completed" | "failed" | "cancelled";
  progress: {
    percentage: number;
    currentStep: string;
    totalItems: number;
    importedItems: number;
    processedItems: number;
    failedItems: number;
  };
  timestamps: {
    startedAt: string;
    completedAt?: string;
    lastUpdate: string;
  };
  errorDetails?: Record<string, unknown>;
  preferences: Record<string, unknown>;
}

interface SyncResultsSummaryProps {
  progress: SyncProgress;
  onRetry?: () => void;
  onViewDetails?: () => void;
}

export function SyncResultsSummary({
  progress,
  onRetry,
  onViewDetails,
}: SyncResultsSummaryProps): JSX.Element {
  const isSuccess = progress.status === "completed";
  const isFailed = progress.status === "failed";
  const isCancelled = progress.status === "cancelled";

  const serviceLabel = progress.service === "gmail" ? "Gmail" : "Calendar";
  const itemLabel = progress.service === "gmail" ? "emails" : "events";

  const formatDuration = (): string => {
    if (!progress.timestamps.completedAt) return "N/A";

    const start = new Date(progress.timestamps.startedAt);
    const end = new Date(progress.timestamps.completedAt);
    const durationMs = end.getTime() - start.getTime();
    const durationSeconds = Math.floor(durationMs / 1000);

    if (durationSeconds < 60) return `${durationSeconds}s`;
    if (durationSeconds < 3600) return `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
    return `${Math.floor(durationSeconds / 3600)}h ${Math.floor((durationSeconds % 3600) / 60)}m`;
  };

  const getStatusIcon = (): JSX.Element | null => {
    if (isSuccess) return <CheckCircle className="h-8 w-8 text-green-500" />;
    if (isFailed) return <XCircle className="h-8 w-8 text-red-500" />;
    if (isCancelled) return <AlertCircle className="h-8 w-8 text-yellow-500" />;
    return null;
  };

  const getStatusMessage = (): string => {
    if (isSuccess) {
      return `Successfully synced ${progress.progress.importedItems} ${itemLabel} and processed ${progress.progress.processedItems} items`;
    }
    if (isFailed) {
      return `Sync failed${
        progress.errorDetails?.["error"]
          ? `: ${
              typeof progress.errorDetails["error"] === "string"
                ? progress.errorDetails["error"]
                : JSON.stringify(progress.errorDetails["error"])
            }`
          : ""
      }`;
    }
    if (isCancelled) {
      return "Sync was cancelled by user";
    }
    return "Unknown status";
  };

  const getStatusColor = (): string => {
    if (isSuccess) return "text-green-700";
    if (isFailed) return "text-red-700";
    if (isCancelled) return "text-yellow-700";
    return "text-gray-700";
  };

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="text-center space-y-2">
        {getStatusIcon()}
        <h3 className={`font-semibold ${getStatusColor()}`}>
          {serviceLabel} Sync {isSuccess ? "Complete" : isFailed ? "Failed" : "Cancelled"}
        </h3>
        <p className="text-sm text-gray-600">
          {getStatusMessage()}
        </p>
      </div>

      {/* Statistics grid */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
        <div className="text-center">
          <div className="text-xl font-bold text-blue-600">
            {progress.progress.importedItems.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">
            Imported {itemLabel}
          </div>
        </div>

        <div className="text-center">
          <div className="text-xl font-bold text-green-600">
            {progress.progress.processedItems.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">
            Processed items
          </div>
        </div>

        <div className="text-center">
          <div className="text-lg font-semibold text-gray-600">
            {formatDuration()}
          </div>
          <div className="text-xs text-gray-600">
            Duration
          </div>
        </div>

        <div className="text-center">
          <div className={`text-lg font-semibold ${
            progress.progress.failedItems > 0 ? "text-red-600" : "text-gray-400"
          }`}>
            {progress.progress.failedItems.toLocaleString()}
          </div>
          <div className="text-xs text-gray-600">
            Failed items
          </div>
        </div>
      </div>

      {/* Status badges */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Badge
          variant={isSuccess ? "default" : "secondary"}
          className={isSuccess ? "bg-green-500" : ""}
        >
          {progress.status.charAt(0).toUpperCase() + progress.status.slice(1)}
        </Badge>

        {progress.progress.totalItems > 0 && (
          <Badge variant="outline">
            {progress.progress.totalItems.toLocaleString()} total found
          </Badge>
        )}

        <Badge variant="outline">
          Session {progress.sessionId.slice(0, 8)}
        </Badge>
      </div>

      {/* Error details for failed syncs */}
      {isFailed && progress.errorDetails && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm font-medium text-red-800 mb-1">Error Details</div>
          <div className="text-sm text-red-700">
            {typeof progress.errorDetails["error"] === "string"
              ? progress.errorDetails["error"]
              : JSON.stringify(progress.errorDetails["error"])}
          </div>
          {(() => {
            const ts = progress.errorDetails?.["timestamp"];
            if (ts instanceof Date || typeof ts === "string" || typeof ts === "number") {
              return (
                <div className="text-xs text-red-600 mt-1">
                  {new Date(ts).toLocaleString()}
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}

      {/* Partial success warning */}
      {isSuccess && progress.progress.failedItems > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <div className="text-sm font-medium text-yellow-800 mb-1">
            Partial Success
          </div>
          <div className="text-sm text-yellow-700">
            {progress.progress.failedItems} {itemLabel} failed to import.
            The sync completed successfully for all other items.
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-2">
        {isFailed && onRetry && (
          <Button onClick={onRetry} className="w-full" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry Sync
          </Button>
        )}

        {onViewDetails && (
          <Button variant="outline" onClick={onViewDetails} className="w-full" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Sync Details
          </Button>
        )}

        {/* Quick navigation to relevant sections */}
        {isSuccess && (
          <div className="text-center">
            <p className="text-xs text-gray-500 mb-2">
              Your synced data is now available in:
            </p>
            <div className="flex gap-2 justify-center">
              {progress.service === "gmail" && (
                <Button variant="ghost" size="sm" asChild>
                  <a href="/omni-connect">
                    View Contacts
                  </a>
                </Button>
              )}
              {progress.service === "calendar" && (
                <Button variant="ghost" size="sm" asChild>
                  <a href="/omni-rhythm">
                    View Calendar
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}