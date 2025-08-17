"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { GmailSyncButtonProps, OAuthError, SyncStatus } from "./types";
import { getSyncStatus, previewGmailSync, approveGmailSync, runJobs } from "@/lib/api/sync";

/**
 * GmailSyncButton - Handles Gmail sync operations with proper error handling
 *
 * Features:
 * - Checks Gmail authorization status before sync
 * - Comprehensive error handling and logging
 * - Loading states with visual feedback
 * - Automatic status refresh after operations
 * - Follows existing design system patterns
 */
export function GmailSyncButton({
  onSyncStart,
  onSyncError,
  disabled,
  className,
  variant = "default",
  size = "default",
}: GmailSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);

  const checkSyncStatus = async (): Promise<SyncStatus | null> => {
    try {
      logger.debug(
        "Checking sync status",
        { timestamp: new Date().toISOString() },
        "GmailSyncButton",
      );

      const status = await getSyncStatus();

      logger.debug(
        "Sync status retrieved",
        { status, timestamp: new Date().toISOString() },
        "GmailSyncButton",
      );

      setSyncStatus(status as SyncStatus);
      return status;
    } catch (error: unknown) {
      logger.error("Failed to check sync status", error, "GmailSyncButton");

      const oauthError: OAuthError = {
        code: "status_check_failed",
        message: error instanceof Error ? error.message : "Failed to check sync status",
        details: { originalError: error instanceof Error ? error.message : String(error) },
        timestamp: new Date(),
      };

      // Note: Error toast already shown by fetchJson
      onSyncError?.(oauthError);
      return null;
    }
  };

  const handlePreviewSync = async () => {
    setIsLoading(true);

    try {
      logger.debug(
        "Starting Gmail preview",
        { timestamp: new Date().toISOString() },
        "GmailSyncButton",
      );

      toast.info("Previewing Gmail sync...", {
        description: "Fetching sample data from your Gmail account",
      });

      const previewData = await previewGmailSync();

      logger.debug(
        "Gmail preview completed",
        { previewData, timestamp: new Date().toISOString() },
        "GmailSyncButton",
      );

      const totalEmails = Object.values(previewData.countByLabel || {}).reduce(
        (a: number, b: unknown) => {
          const count = typeof b === "number" ? b : 0;
          return a + count;
        },
        0,
      );

      toast.success("Gmail preview ready", {
        description: `Found ${totalEmails} emails across ${Object.keys(previewData.countByLabel || {}).length} labels`,
      });

      return previewData;
    } catch (error: unknown) {
      const oauthError: OAuthError = {
        code: "gmail_preview_failed",
        message: error instanceof Error ? error.message : "Failed to preview Gmail sync",
        details: { originalError: error instanceof Error ? error.message : String(error) },
        timestamp: new Date(),
      };

      logger.error("Gmail preview failed", oauthError, "GmailSyncButton");

      toast.error("Preview failed", {
        description: oauthError.message,
      });

      onSyncError?.(oauthError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveSync = async () => {
    setIsLoading(true);

    try {
      logger.debug(
        "Starting Gmail sync approval",
        { timestamp: new Date().toISOString() },
        "GmailSyncButton",
      );

      // First check if we have proper authorization
      const status = await checkSyncStatus();
      if (!status?.googleConnected) {
        throw new Error("Google account not connected. Please connect your Google account first.");
      }

      if (!status.flags?.gmail) {
        throw new Error("Gmail access not authorized. Please authorize Gmail access first.");
      }

      toast.info("Approving Gmail sync...", {
        description: "Starting background sync process",
      });

      const syncData = await approveGmailSync();
      const batchId = syncData.batchId;

      logger.info(
        "Gmail sync approved",
        { batchId, syncData, timestamp: new Date().toISOString() },
        "GmailSyncButton",
      );

      toast.success("Gmail sync approved!", {
        description: `Batch ID: ${batchId}. Check the jobs section for progress.`,
      });

      onSyncStart?.(batchId);

      // Refresh status after sync
      setTimeout(() => {
        checkSyncStatus();
      }, 1000);

      return syncData;
    } catch (error: unknown) {
      const oauthError: OAuthError = {
        code: "gmail_sync_failed",
        message: error instanceof Error ? error.message : "Failed to approve Gmail sync",
        details: { originalError: error instanceof Error ? error.message : String(error) },
        timestamp: new Date(),
      };

      logger.error("Gmail sync approval failed", oauthError, "GmailSyncButton");

      toast.error("Sync approval failed", {
        description: oauthError.message,
      });

      onSyncError?.(oauthError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunJobs = async () => {
    setIsLoading(true);

    try {
      logger.debug("Running jobs", { timestamp: new Date().toISOString() }, "GmailSyncButton");

      toast.info("Running background jobs...", {
        description: "Processing queued sync operations",
      });

      const jobData = await runJobs();

      logger.info(
        "Jobs executed",
        { jobData, timestamp: new Date().toISOString() },
        "GmailSyncButton",
      );

      toast.success("Jobs completed!", {
        description: `Processed: ${jobData.processed} jobs`,
      });

      // Refresh status after jobs run
      setTimeout(() => {
        checkSyncStatus();
      }, 1000);

      return jobData;
    } catch (error: unknown) {
      const oauthError: OAuthError = {
        code: "job_execution_failed",
        message: error instanceof Error ? error.message : "Failed to run background jobs",
        details: { originalError: error instanceof Error ? error.message : String(error) },
        timestamp: new Date(),
      };

      logger.error("Job execution failed", oauthError, "GmailSyncButton");

      toast.error("Job execution failed", {
        description: oauthError.message,
      });

      onSyncError?.(oauthError);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshStatus = async () => {
    setIsCheckingStatus(true);
    await checkSyncStatus();
    setIsCheckingStatus(false);
  };

  return (
    <div className="space-y-4">
      {/* Status Section */}
      <div className="rounded-lg border p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-medium">Gmail Sync Status</h3>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshStatus}
            disabled={isCheckingStatus}
            className="h-8"
          >
            {isCheckingStatus ? (
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>

        {syncStatus && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">Google Connected:</span>
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  syncStatus.googleConnected
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
                )}
              >
                {syncStatus.googleConnected ? "Yes" : "No"}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium">Gmail Access:</span>
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium",
                  syncStatus.flags?.gmail
                    ? "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
                )}
              >
                {syncStatus.flags?.gmail ? "Authorized" : "Not Authorized"}
              </span>
            </div>

            {syncStatus.lastSync?.gmail && (
              <div className="flex items-center gap-2">
                <span className="font-medium">Last Sync:</span>
                <span className="text-muted-foreground">{syncStatus.lastSync.gmail}</span>
              </div>
            )}

            {syncStatus.jobs && (
              <div className="flex items-center gap-4">
                <span className="font-medium">Jobs:</span>
                <span className="text-muted-foreground">
                  Queued: {syncStatus.jobs.queued}, Done: {syncStatus.jobs.done}, Errors:{" "}
                  {syncStatus.jobs.error}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button
          onClick={handlePreviewSync}
          disabled={disabled || isLoading}
          variant="outline"
          size={size}
          className={cn(className)}
        >
          {isLoading && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          Preview Gmail
        </Button>

        <Button
          onClick={handleApproveSync}
          disabled={disabled || isLoading || !syncStatus?.flags?.gmail}
          variant={variant}
          size={size}
          className={cn(className)}
        >
          {isLoading && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          Sync Gmail
        </Button>

        <Button
          onClick={handleRunJobs}
          disabled={disabled || isLoading}
          variant="secondary"
          size={size}
          className={cn(className)}
        >
          {isLoading && (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          Run Jobs
        </Button>
      </div>

      {!syncStatus?.googleConnected && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-800 dark:bg-yellow-900/20">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 h-4 w-4 text-yellow-600 dark:text-yellow-400"
              aria-label="warning"
            >
              ⚠️
            </div>
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Google Account Not Connected
              </p>
              <p className="mt-1 text-yellow-700 dark:text-yellow-300">
                You need to connect your Google account and authorize Gmail access before you can
                sync emails.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
