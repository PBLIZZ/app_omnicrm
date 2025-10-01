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
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { Result, isErr, isOk } from "@/lib/utils/result";
// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (
    error instanceof Error &&
    (error.message.includes("fetch") || error.message.includes("network"))
  ) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};
import type {
  EmailPreview,
  ConnectConnectionStatus,
  ConnectDashboardState,
  Job,
} from "@/server/db/business-schemas";

export function useOmniConnect(): UseOmniConnectResult {
  // Main unified query
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.omniConnect.dashboard(),
    queryFn: async (): Promise<ConnectDashboardState> => {
      const result = await apiClient.get<
        Result<ConnectDashboardState, { message: string; code: string }>
      >("/api/omni-connect/dashboard");
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!isOk(result)) {
        throw new Error("Invalid result state");
      }
      return result.data;
    },
    staleTime: 30000, // 30 seconds - refetch in background after this
    retry: (failureCount, error) => shouldRetry(error, failureCount),
    // Initial data - assume disconnected until we know otherwise
    initialData: {
      connection: {
        isConnected: false,
        emailCount: 0,
        contactCount: 0,
      },
      emailPreview: {
        emails: [],
        range: null,
        previewRange: null,
      },
      jobs: {
        active: [],
        summary: {
          queued: 0,
          running: 0,
          completed: 0,
          failed: 0,
        },
        currentBatch: null,
      },
      syncStatus: {
        googleConnected: true,
        serviceTokens: {
          google: true,
          gmail: true,
          calendar: true,
          unified: true,
        },
        flags: {
          gmail: true,
          calendar: true,
        },
        lastSync: {
          gmail: null,
          calendar: null,
        },
        lastBatchId: null,
        grantedScopes: {
          gmail: null,
          calendar: null,
        },
        jobs: {
          queued: 0,
          done: 0,
          error: 0,
        },
        embedJobs: {
          queued: 0,
          done: 0,
          error: 0,
        },
      },
    },
  });

  // OAuth connection mutation
  const connectMutation = useMutation({
    mutationFn: async () => {
      // Redirect to connect endpoint (GET request - no CSRF needed)
      window.location.href = "/api/google/gmail/connect";
    },
  });

  // Backward compatibility: Convert unified data to old hook formats
  const connectionData = data?.connection;
  const connectionStatus: ConnectConnectionStatus = connectionData
    ? {
        isConnected: connectionData.isConnected,
        ...(connectionData.lastSync && { lastSync: connectionData.lastSync }),
        ...(connectionData.emailCount && { emailCount: connectionData.emailCount }),
        ...(connectionData.contactCount && { contactCount: connectionData.contactCount }),
        ...(connectionData.error && { error: connectionData.error }),
      }
    : { isConnected: false };

  const stats: ConnectConnectionStatus | undefined = connectionData
    ? {
        isConnected: connectionData.isConnected,
        emailCount: connectionData.emailCount,
        contactCount: connectionData.contactCount,
        lastSync: connectionData.lastSync,
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
      error: error instanceof Error ? error : null,
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
export function useOmniConnectConnection(): ConnectConnectionStatus | undefined {
  const { data } = useOmniConnect();
  return data?.connection;
}

export function useOmniConnectEmails(): EmailPreview[] | undefined {
  const { emails } = useOmniConnect();
  return emails.emails;
}

export function useOmniConnectJobs(): {
  jobs: Job[];
  currentBatch: string | null;
  totalEmails?: number;
  processedEmails?: number;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, error, refetch } = useOmniConnect();
  return {
    jobs: data?.jobs?.active ?? [],
    currentBatch: data?.jobs?.currentBatch ?? null,
    ...(data?.jobs?.totalEmails !== undefined && {
      totalEmails: data.jobs.totalEmails,
    }),
    ...(data?.jobs?.processedEmails !== undefined && {
      processedEmails: data.jobs.processedEmails,
    }),
    isLoading,
    error,
    refetch,
  };
}

export function useOmniConnectSyncStatus(): {
  syncStatus: NonNullable<ConnectDashboardState["syncStatus"]> | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { data, isLoading, error, refetch } = useOmniConnect();
  return {
    syncStatus: data?.syncStatus,
    isLoading,
    error,
    refetch,
  };
}
