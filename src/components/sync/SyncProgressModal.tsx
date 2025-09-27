"use client";

import { useEffect, useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle, Clock, X } from "lucide-react";
import { SyncProgressIndicator } from "./SyncProgressIndicator";
import { SyncResultsSummary } from "./SyncResultsSummary";
import { NavigationBlocker } from "./NavigationBlocker";
import { get, delete as deleteApi } from "@/lib/api";
import { toast } from "sonner";

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
  timeEstimate?: {
    remainingSeconds: number;
    eta?: string;
  };
  timestamps: {
    startedAt: string;
    completedAt?: string;
    lastUpdate: string;
  };
  errorDetails?: Record<string, unknown>;
  preferences: Record<string, unknown>;
}

interface SyncProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  service: "gmail" | "calendar";
  onComplete?: (result: {
    success: boolean;
    stats?: Record<string, unknown>;
    error?: string;
  }) => void;
}

export function SyncProgressModal({
  isOpen,
  onClose,
  sessionId,
  service,
  onComplete,
}: SyncProgressModalProps): JSX.Element {
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const hasCompletedRef = useRef(false);

  // Poll for progress updates
  useEffect(() => {
    if (!sessionId || !isOpen) return;

    const pollProgress = async (): Promise<void> => {
      try {
        const result = await get<SyncProgress>(`/api/sync-progress/${sessionId}`);

        setProgress(result);
        setError(null);
        setIsLoading(false);

        // Check if sync is complete
        if (["completed", "failed", "cancelled"].includes(result.status)) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }

          // Only call onComplete once
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true;

            const success = result.status === "completed";
            onComplete?.({
              success,
              ...(success && {
                stats: {
                  totalItems: result.progress.totalItems,
                  importedItems: result.progress.importedItems,
                  processedItems: result.progress.processedItems,
                  failedItems: result.progress.failedItems,
                  service: result.service,
                },
              }),
              ...(!success && {
                error: (result.errorDetails?.["error"] as string) ?? "Sync failed",
              }),
            });
          }
        }
      } catch (err: unknown) {
        console.error("Error polling sync progress:", err);
        setError("Connection error while checking sync progress");
        setIsLoading(false);
      }
    };

    // Initial poll
    pollProgress();

    // Set up polling interval for active syncs
    intervalRef.current = setInterval(pollProgress, 2000); // Poll every 2 seconds

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sessionId, isOpen, onComplete]);

  // Cancel sync operation
  const handleCancel = async (): Promise<void> => {
    if (!sessionId || isCancelling) return;

    setIsCancelling(true);
    try {
      await deleteApi(`/api/sync-progress/${sessionId}`);

      toast.success("Sync cancelled");
      // Update progress immediately to show cancelled state
      setProgress((prev) => (prev ? { ...prev, status: "cancelled" } : null));
    } catch (error) {
      console.error("Error cancelling sync:", error);
      toast.error("Failed to cancel sync");
    } finally {
      setIsCancelling(false);
    }
  };

  const isActive =
    progress?.status && ["started", "importing", "processing"].includes(progress.status);
  const isCompleted =
    progress?.status && ["completed", "failed", "cancelled"].includes(progress.status);

  return (
    <>
      {/* Block navigation during active sync */}
      {isActive && <NavigationBlocker />}

      <Dialog open={isOpen} onOpenChange={isCompleted ? onClose : () => {}}>
        <DialogContent
          className="max-w-md"
          // Prevent closing during active sync
          showCloseButton={!isActive}
          onPointerDownOutside={(e: PointerEvent) => {
            if (isActive) e.preventDefault();
          }}
          onEscapeKeyDown={(e: KeyboardEvent) => {
            if (isActive) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isLoading && <Clock className="h-5 w-5 animate-spin" />}
              {progress?.status === "completed" && (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              {progress?.status === "failed" && <XCircle className="h-5 w-5 text-red-500" />}
              {progress?.status === "cancelled" && (
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              )}
              {isActive && <Clock className="h-5 w-5 text-blue-500" />}
              Syncing {service === "gmail" ? "Gmail" : "Calendar"}
              {isCompleted && (
                <Button variant="ghost" size="sm" onClick={onClose} className="ml-auto p-1 h-6 w-6">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Error</span>
                </div>
                <p className="text-sm text-red-600 mt-1">{error}</p>
              </div>
            )}

            {isLoading && !progress && (
              <div className="text-center py-8">
                <Clock className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-2" />
                <p className="text-sm text-gray-600">Initializing sync...</p>
              </div>
            )}

            {progress && (
              <>
                {isActive && (
                  <SyncProgressIndicator
                    progress={progress.progress}
                    timeEstimate={progress.timeEstimate || undefined}
                    service={progress.service}
                  />
                )}

                {isCompleted && (
                  <SyncResultsSummary
                    progress={progress}
                    onRetry={() => {
                      // Retry functionality could be implemented here
                      // For now, just close the modal
                      onClose();
                    }}
                  />
                )}

                {/* Cancel button for active syncs */}
                {isActive && (
                  <div className="flex justify-end pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void handleCancel()}
                      disabled={isCancelling}
                    >
                      {isCancelling ? "Cancelling..." : "Cancel Sync"}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
