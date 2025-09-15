/**
 * Unified OmniConnect Dashboard Hook
 *
 * This hook replaces the scattered use-gmail-* hooks with a single,
 * efficient hook that provides all necessary dashboard data.
 *
 * Replaces:
 * - use-gmail-connection.ts
 * - use-gmail-emails.ts
 * - Individual job status hooks
 */
import { useQuery, useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import type {
  OmniConnectDashboardState,
  GmailConnectionStatus,
  GmailStats,
  EmailPreview,
  PreviewRange,
  ConnectConnectionStatus,
  JobStatusResponse,
} from "@/app/(authorisedRoute)/omni-connect/_components/types";

export interface UseOmniConnectResult {
  // Main dashboard data
  data: OmniConnectDashboardState | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;

  // Backward compatibility methods for existing components
  connection: {
    status: GmailConnectionStatus;
    stats: GmailStats | undefined;
    isLoading: boolean;
    error: string | null;
    connect: () => void;
    isConnecting: boolean;
    refetch: () => void;
  };

  emails: {
    emails: EmailPreview[];
    previewRange: PreviewRange | null;
    isLoading: boolean;
    error: Error | null;
    refetch: () => void;
  };
}

export function useOmniConnect(refreshTrigger?: number): UseOmniConnectResult {
  // Main unified query
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ["omniConnectDashboard", refreshTrigger],
    queryFn: async (): Promise<OmniConnectDashboardState> => {
      return apiClient.get("/api/omni-connect/dashboard");
    },
    staleTime: 30000, // 30 seconds - refetch in background after this
    retry: 2,
  });

  // OAuth connection mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      // Redirect to Gmail OAuth
      window.location.href = "/api/google/gmail/oauth";
    },
    onError: () => {
      toast.error("Failed to start Gmail OAuth");
    },
  });

  // Backward compatibility: Convert unified data to old hook formats
  const connectionData = data?.connection;
  const connectionStatus: GmailConnectionStatus = connectionData
    ? {
        isConnected: connectionData.isConnected,
        ...(connectionData.lastSync && { lastSync: connectionData.lastSync }),
        ...(connectionData.emailCount && { emailCount: connectionData.emailCount }),
        ...(connectionData.contactCount && { contactCount: connectionData.contactCount }),
        ...(connectionData.error && { error: connectionData.error }),
      }
    : { isConnected: false };

  const stats: GmailStats | undefined = connectionData
    ? {
        emailsProcessed: connectionData.emailCount ?? 0,
        suggestedContacts: connectionData.contactCount ?? 0,
        lastSync: connectionData.lastSync ?? null,
        isConnected: connectionData.isConnected,
      }
    : undefined;

  return {
    // Main unified data
    data,
    isLoading,
    error,
    refetch,

    // Backward compatibility for use-gmail-connection.ts consumers
    connection: {
      status: connectionStatus,
      stats,
      isLoading,
      error: error ? "Failed to load Gmail statistics" : null,
      connect: connectMutation.mutate,
      isConnecting: connectMutation.isPending,
      refetch,
    },

    // Backward compatibility for use-gmail-emails.ts consumers
    emails: {
      emails: data?.emailPreview?.emails ?? [],
      previewRange: data?.emailPreview?.previewRange ?? null,
      isLoading,
      error,
      refetch,
    },
  };
}

// Convenience hooks for components that only need specific data slices
export function useOmniConnectConnection(
  refreshTrigger?: number,
): ConnectConnectionStatus | undefined {
  const { data } = useOmniConnect(refreshTrigger);
  return data?.connection;
}

export function useOmniConnectEmails(refreshTrigger?: number): EmailPreview[] | undefined {
  const { emails } = useOmniConnect(refreshTrigger);
  return emails.emails;
}

export function useOmniConnectJobs(refreshTrigger?: number): {
  jobs: JobStatusResponse[];
  currentBatch: string | null;
  totalEmails?: number;
  processedEmails?: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, error, refetch } = useOmniConnect(refreshTrigger);
  return {
    jobs: data?.activeJobs?.jobs ?? [],
    currentBatch: data?.activeJobs?.currentBatch ?? null,
    ...(data?.activeJobs?.totalEmails !== undefined && {
      totalEmails: data.activeJobs.totalEmails,
    }),
    ...(data?.activeJobs?.processedEmails !== undefined && {
      processedEmails: data.activeJobs.processedEmails,
    }),
    isLoading,
    error,
    refetch,
  };
}

export function useOmniConnectSyncStatus(refreshTrigger?: number): {
  syncStatus: NonNullable<OmniConnectDashboardState["syncStatus"]> | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, error, refetch } = useOmniConnect(refreshTrigger);
  return {
    syncStatus: data?.syncStatus,
    isLoading,
    error,
    refetch,
  };
}
