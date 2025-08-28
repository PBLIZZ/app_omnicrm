"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, Play, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchGet, fetchPost } from "@/lib/api";

// Job status tracking types
interface JobStatus {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "error";
  progress?: number;
  message?: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
  totalEmails?: number;
  processedEmails?: number;
  newEmails?: number;
  chunkSize?: number;
  chunksTotal?: number;
  chunksProcessed?: number;
}

interface SyncJobsResponse {
  jobs: JobStatus[];
  currentBatch?: string;
  totalEmails?: number;
  processedEmails?: number;
}

// Job flow status phases for Gmail sync
type SyncPhase =
  | "idle"
  | "starting"
  | "syncing_gmail"
  | "processing_data"
  | "structuring_data"
  | "embedding_data"
  | "completed"
  | "error";

interface SyncPhaseStatus {
  phase: SyncPhase;
  message: string;
  progress: number;
  isActive: boolean;
  isComplete: boolean;
  isError: boolean;
}

export function GmailSyncStatusPanel(): JSX.Element {
  const [isPolling, setIsPolling] = useState(false);
  const [currentBatchId, setCurrentBatchId] = useState<string | null>(null);
  const [syncPhase, setSyncPhase] = useState<SyncPhase>("idle");
  const [emailsProcessed, setEmailsProcessed] = useState(0);
  const [totalEmails, setTotalEmails] = useState(0);
  const [newEmails, setNewEmails] = useState(0);

  const queryClient = useQueryClient();

  // Poll for job status updates when sync is active
  const { data: jobsData, error: jobsError } = useQuery({
    queryKey: ["jobs", "status", currentBatchId],
    queryFn: async (): Promise<SyncJobsResponse> =>
      await fetchGet<SyncJobsResponse>("/api/jobs/status", { showErrorToast: false }),
    enabled: isPolling && !!currentBatchId,
    refetchInterval: 2000, // Poll every 2 seconds during sync
    staleTime: 1000,
  });

  // Mutation to start Gmail sync
  const startSyncMutation = useMutation({
    mutationFn: async () =>
      await fetchPost<{ batchId: string }>(
        "/api/sync/approve/gmail",
        {},
        {
          showErrorToast: false,
          errorToastTitle: "Failed to start Gmail sync",
        },
      ),
    onSuccess: (data) => {
      setCurrentBatchId(data.batchId);
      setIsPolling(true);
      setSyncPhase("starting");
      setEmailsProcessed(0);
      setTotalEmails(0);
      setNewEmails(0);

      // Invalidate sync status to refresh connection state
      void queryClient.invalidateQueries({ queryKey: ["sync", "status"] });
    },
    onError: (error) => {
      console.error("Failed to start Gmail sync:", error);
      setSyncPhase("error");
      setIsPolling(false);
    },
  });

  // Update sync phase based on job status
  useEffect(() => {
    if (!jobsData?.jobs.length) return;

    const jobs = jobsData.jobs;
    const gmailSyncJob = jobs.find((job) => job.kind === "google_gmail_sync");
    const normalizeJob = jobs.find((job) => job.kind === "normalize_google_email");
    const embedJob = jobs.find((job) => job.kind === "embed");
    const extractJob = jobs.find((job) => job.kind === "extract_contacts");

    // Update totals if available
    if (gmailSyncJob?.totalEmails) setTotalEmails(gmailSyncJob.totalEmails);
    if (gmailSyncJob?.processedEmails) setEmailsProcessed(gmailSyncJob.processedEmails);
    if (gmailSyncJob?.newEmails !== undefined) setNewEmails(gmailSyncJob.newEmails);

    // Determine current phase based on job statuses
    if (
      gmailSyncJob?.status === "error" ||
      normalizeJob?.status === "error" ||
      embedJob?.status === "error"
    ) {
      setSyncPhase("error");
      setIsPolling(false);
    } else if (gmailSyncJob?.status === "running") {
      setSyncPhase("syncing_gmail");
    } else if (gmailSyncJob?.status === "completed" && normalizeJob?.status === "running") {
      setSyncPhase("processing_data");
    } else if (normalizeJob?.status === "completed" && extractJob?.status === "running") {
      setSyncPhase("structuring_data");
    } else if (extractJob?.status === "completed" && embedJob?.status === "running") {
      setSyncPhase("embedding_data");
    } else if (embedJob?.status === "completed") {
      setSyncPhase("completed");
      setIsPolling(false);
      // Auto-clear after 10 seconds
      setTimeout(() => {
        setSyncPhase("idle");
        setCurrentBatchId(null);
      }, 10000);
    }
  }, [jobsData]);

  // Kick the job runner once when polling starts
  useEffect(() => {
    if (!isPolling) return;
    void fetchPost<{ message: string }>(
      "/api/jobs/runner",
      {},
      { showErrorToast: false, errorToastTitle: "Job runner failed" },
    );
  }, [isPolling]);

  const getSyncPhaseStatus = (phase: SyncPhase): SyncPhaseStatus => {
    const phases: Record<SyncPhase, SyncPhaseStatus> = {
      idle: {
        phase: "idle",
        message: "Ready to sync Gmail data",
        progress: 0,
        isActive: false,
        isComplete: false,
        isError: false,
      },
      starting: {
        phase: "starting",
        message: "Initializing Gmail sync...",
        progress: 5,
        isActive: true,
        isComplete: false,
        isError: false,
      },
      syncing_gmail: {
        phase: "syncing_gmail",
        message: totalEmails > 0 
          ? `Checking ${emailsProcessed}/${totalEmails} emails • ${newEmails} new found`
          : `Checking for new Gmail messages...`,
        progress: totalEmails > 0 ? Math.min((emailsProcessed / totalEmails) * 30, 30) + 10 : 15,
        isActive: true,
        isComplete: false,
        isError: false,
      },
      processing_data: {
        phase: "processing_data",
        message: "Processing Gmail data...",
        progress: 45,
        isActive: true,
        isComplete: false,
        isError: false,
      },
      structuring_data: {
        phase: "structuring_data",
        message: "Structuring data...",
        progress: 65,
        isActive: true,
        isComplete: false,
        isError: false,
      },
      embedding_data: {
        phase: "embedding_data",
        message: "Embedding data for AI analysis...",
        progress: 85,
        isActive: true,
        isComplete: false,
        isError: false,
      },
      completed: {
        phase: "completed",
        message: newEmails > 0 
          ? `Sync completed • ${newEmails} new emails processed`
          : `Sync completed • No new emails found`,
        progress: 100,
        isActive: false,
        isComplete: true,
        isError: false,
      },
      error: {
        phase: "error",
        message: "Sync failed - please try again",
        progress: 0,
        isActive: false,
        isComplete: false,
        isError: true,
      },
    };

    return phases[phase];
  };

  const phaseStatus = getSyncPhaseStatus(syncPhase);
  const isSyncing = isPolling || startSyncMutation.isPending;

  const getStatusIcon = (): JSX.Element => {
    if (phaseStatus.isError) return <XCircle className="h-5 w-5 text-red-500" />;
    if (phaseStatus.isComplete) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (phaseStatus.isActive) return <Clock className="h-5 w-5 text-blue-500 animate-pulse" />;
    return <Mail className="h-5 w-5 text-gray-500" />;
  };

  const getStatusBadge = (): JSX.Element => {
    if (phaseStatus.isError) return <Badge variant="destructive">Error</Badge>;
    if (phaseStatus.isComplete)
      return (
        <Badge variant="default" className="bg-green-500">
          Complete
        </Badge>
      );
    if (phaseStatus.isActive)
      return (
        <Badge variant="default" className="bg-blue-500">
          Processing
        </Badge>
      );
    return <Badge variant="secondary">Ready</Badge>;
  };

  return (
    <Card className="bg-teal-500/10 border-teal-500/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-teal-500">
            {getStatusIcon()}
            <CardTitle>Gmail Data Ingestion</CardTitle>
          </div>
          {getStatusBadge()}
        </div>
        <CardDescription>
          Sync and process Gmail data for AI analysis. We process up to 2,000 emails per batch in
          chunks of 50 to ensure optimal performance.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Status Message */}
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {phaseStatus.message}
          </p>
          {totalEmails > 0 && syncPhase === "syncing_gmail" && (
            <span className="text-xs text-gray-500">
              {emailsProcessed}/{totalEmails} checked • {newEmails} new
            </span>
          )}
        </div>

        {/* Progress Bar */}
        {phaseStatus.isActive && (
          <div className="space-y-2">
            <Progress
              value={phaseStatus.progress}
              className="h-3 transition-all duration-500 ease-in-out"
            />
            <p className="text-xs text-gray-500 text-center">
              {Math.round(phaseStatus.progress)}% complete
            </p>
          </div>
        )}

        {/* Error Alert */}
        {phaseStatus.isError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {jobsError?.message ??
                "An error occurred during sync. Please check your Gmail connection and try again."}
            </AlertDescription>
          </Alert>
        )}

        {/* Success Alert */}
        {phaseStatus.isComplete && (
          <Alert className="border-green-200 text-green-800 bg-green-50">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {newEmails > 0 
                ? `Successfully processed ${newEmails} new emails. Your data is now available for AI analysis.`
                : `Gmail sync completed. All your emails are up to date - no new messages found.`
              }
            </AlertDescription>
          </Alert>
        )}

        {/* Action Button */}
        <div className="flex justify-center pt-2">
          <Button
            onClick={() => startSyncMutation.mutate()}
            disabled={isSyncing || phaseStatus.isActive}
            variant={phaseStatus.isError ? "destructive" : "default"}
            className="gap-2"
          >
            <Play className="h-4 w-4" />
            {isSyncing ? "Syncing..." : phaseStatus.isError ? "Retry Sync" : "Start Gmail Sync"}
          </Button>
        </div>

        {/* Processing Details */}
        {phaseStatus.isActive && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-200 dark:border-gray-700 transition-all duration-300">
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Processing Steps:
            </h4>
            <div className="space-y-2 text-xs">
              <div
                className={`flex items-center gap-3 transition-all duration-300 ${syncPhase === "syncing_gmail" ? "text-blue-600 font-medium" : syncPhase === "processing_data" || syncPhase === "structuring_data" || syncPhase === "embedding_data" || syncPhase === "completed" ? "text-green-600" : "text-gray-600 dark:text-gray-400"}`}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${syncPhase === "syncing_gmail" ? "bg-blue-500 animate-pulse shadow-blue-500/50 shadow-lg" : syncPhase === "processing_data" || syncPhase === "structuring_data" || syncPhase === "embedding_data" || syncPhase === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className="flex-1">Gmail Sync</span>
                {(syncPhase === "processing_data" ||
                  syncPhase === "structuring_data" ||
                  syncPhase === "embedding_data" ||
                  syncPhase === "completed") && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div
                className={`flex items-center gap-3 transition-all duration-300 ${syncPhase === "processing_data" ? "text-blue-600 font-medium" : syncPhase === "structuring_data" || syncPhase === "embedding_data" || syncPhase === "completed" ? "text-green-600" : "text-gray-600 dark:text-gray-400"}`}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${syncPhase === "processing_data" ? "bg-blue-500 animate-pulse shadow-blue-500/50 shadow-lg" : syncPhase === "structuring_data" || syncPhase === "embedding_data" || syncPhase === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className="flex-1">Processing Gmail</span>
                {(syncPhase === "structuring_data" ||
                  syncPhase === "embedding_data" ||
                  syncPhase === "completed") && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
              <div
                className={`flex items-center gap-3 transition-all duration-300 ${syncPhase === "structuring_data" ? "text-blue-600 font-medium" : syncPhase === "embedding_data" || syncPhase === "completed" ? "text-green-600" : "text-gray-600 dark:text-gray-400"}`}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${syncPhase === "structuring_data" ? "bg-blue-500 animate-pulse shadow-blue-500/50 shadow-lg" : syncPhase === "embedding_data" || syncPhase === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className="flex-1">Structuring Data</span>
                {(syncPhase === "embedding_data" || syncPhase === "completed") && (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                )}
              </div>
              <div
                className={`flex items-center gap-3 transition-all duration-300 ${syncPhase === "embedding_data" ? "text-blue-600 font-medium" : syncPhase === "completed" ? "text-green-600" : "text-gray-600 dark:text-gray-400"}`}
              >
                <div
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${syncPhase === "embedding_data" ? "bg-blue-500 animate-pulse shadow-blue-500/50 shadow-lg" : syncPhase === "completed" ? "bg-green-500" : "bg-gray-300"}`}
                />
                <span className="flex-1">Embedding Data</span>
                {syncPhase === "completed" && <CheckCircle className="w-4 h-4 text-green-500" />}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
