import { useQuery } from "@tanstack/react-query";
import { fetchPost, fetchGet } from "@/lib/api";

interface JobStatusResponse {
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

interface JobStatus {
  jobs: JobStatusResponse[];
  currentBatch: string | null;
  totalEmails?: number;
  processedEmails?: number;
}

export function useGmailJobStatus(isConnected: boolean, refreshTrigger?: number) {
  const {
    data: jobStatus,
    isLoading: isLoadingJobStatus,
    error,
    refetch: refreshJobStatus,
  } = useQuery({
    queryKey: ["job-status", refreshTrigger],
    queryFn: async (): Promise<JobStatus> => {
      return await fetchGet<JobStatus>("/api/jobs/status");
    },
    enabled: isConnected,
    refetchInterval: 5000, // Poll every 5 seconds
    retry: 2,
    staleTime: 0, // Always fetch fresh data
  });


  // Run job processor mutation
  const runJobProcessor = async (): Promise<void> => {
    try {
      await fetchPost("/api/jobs/runner", {});

      // Refresh job status after running processor
      await refreshJobStatus();
    } catch (error) {
      console.error("Error running job processor:", error);
      throw error;
    }
  };

  return {
    jobStatus: jobStatus || null,
    isLoadingJobStatus,
    error,
    refreshJobStatus,
    runJobProcessor,
  };
}
