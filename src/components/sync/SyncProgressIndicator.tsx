"use client";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Download, Cog, CheckCircle } from "lucide-react";

interface ProgressData {
  percentage: number;
  currentStep: string;
  totalItems: number;
  importedItems: number;
  processedItems: number;
  failedItems: number;
}

interface TimeEstimate {
  remainingSeconds: number;
  eta?: string;
}

interface SyncProgressIndicatorProps {
  progress: ProgressData;
  timeEstimate?: TimeEstimate | undefined;
  service: "gmail" | "calendar";
}

export function SyncProgressIndicator({
  progress,
  timeEstimate,
  service,
}: SyncProgressIndicatorProps): JSX.Element {
  const formatTimeRemaining = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const getProgressPhase = (): string => {
    if (progress.percentage <= 10) return "Initializing";
    if (progress.percentage <= 70) return "Importing";
    if (progress.percentage <= 95) return "Processing";
    return "Finalizing";
  };

  const getPhaseIcon = (): JSX.Element => {
    const phase = getProgressPhase();
    switch (phase) {
      case "Importing":
        return <Download className="h-4 w-4 text-blue-500" />;
      case "Processing":
        return <Cog className="h-4 w-4 text-orange-500 animate-spin" />;
      case "Finalizing":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const serviceLabel = service === "gmail" ? "emails" : "events";

  return (
    <div className="space-y-4">
      {/* Main progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            {getPhaseIcon()}
            <span className="font-medium">{getProgressPhase()}</span>
            <Badge variant="outline" className="text-xs">
              {progress.percentage}%
            </Badge>
          </div>
          {timeEstimate && (
            <div className="flex items-center gap-1 text-gray-500">
              <Clock className="h-3 w-3" />
              <span className="text-xs">
                {formatTimeRemaining(timeEstimate.remainingSeconds)} remaining
              </span>
            </div>
          )}
        </div>

        <Progress value={progress.percentage} className="h-2" />

        <p className="text-sm text-gray-600">{progress.currentStep}</p>
      </div>

      {/* Statistics */}
      {progress.totalItems > 0 && (
        <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {progress.importedItems.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              Imported {serviceLabel}
            </div>
          </div>

          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {progress.processedItems.toLocaleString()}
            </div>
            <div className="text-xs text-gray-600">
              Processed {serviceLabel}
            </div>
          </div>

          {progress.totalItems > 0 && (
            <>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-600">
                  {progress.totalItems.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">
                  Total found
                </div>
              </div>

              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  progress.failedItems > 0 ? "text-red-600" : "text-gray-400"
                }`}>
                  {progress.failedItems.toLocaleString()}
                </div>
                <div className="text-xs text-gray-600">
                  Failed
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Progress phases visualization */}
      <div className="flex items-center gap-2 text-xs">
        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
          progress.percentage > 10 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          <div className={`h-2 w-2 rounded-full ${
            progress.percentage > 10 ? "bg-green-500" : "bg-gray-300"
          }`} />
          Discovery
        </div>

        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
          progress.percentage > 70 ? "bg-green-100 text-green-700" :
          progress.percentage > 10 ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500"
        }`}>
          <div className={`h-2 w-2 rounded-full ${
            progress.percentage > 70 ? "bg-green-500" :
            progress.percentage > 10 ? "bg-blue-500" : "bg-gray-300"
          }`} />
          Import
        </div>

        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
          progress.percentage > 95 ? "bg-green-100 text-green-700" :
          progress.percentage > 70 ? "bg-orange-100 text-orange-700" : "bg-gray-100 text-gray-500"
        }`}>
          <div className={`h-2 w-2 rounded-full ${
            progress.percentage > 95 ? "bg-green-500" :
            progress.percentage > 70 ? "bg-orange-500" : "bg-gray-300"
          }`} />
          Process
        </div>

        <div className={`flex items-center gap-1 px-2 py-1 rounded ${
          progress.percentage >= 100 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
        }`}>
          <div className={`h-2 w-2 rounded-full ${
            progress.percentage >= 100 ? "bg-green-500" : "bg-gray-300"
          }`} />
          Complete
        </div>
      </div>
    </div>
  );
}