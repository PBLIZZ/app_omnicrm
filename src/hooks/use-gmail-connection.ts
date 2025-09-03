import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchGet, fetchPost, buildUrl } from "@/lib/api";

interface GmailConnectionStatus {
  isConnected: boolean;
  lastSync?: string;
  emailCount?: number;
  contactCount?: number;
  error?: string;
}

interface GmailStats {
  emailsProcessed: number;
  suggestedContacts: number;
  lastSync: string | null;
  isConnected: boolean;
}

export function useGmailConnection(refreshTrigger?: number) {
  // const queryClient = useQueryClient();

  // Query for Gmail connection status and stats
  const {
    data: stats,
    error,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["gmail-stats", refreshTrigger],
    queryFn: async (): Promise<GmailStats> => {
      // Get sync status
      const syncData = await fetchGet<{
        lastSync?: { gmail?: string };
        serviceTokens?: { gmail?: boolean };
      }>("/api/settings/sync/status", { showErrorToast: false });

      // Get raw events count for emails processed
      const eventsUrl = buildUrl("/api/google/gmail/raw-events", {
        provider: "gmail",
        pageSize: 1,
      });
      const eventsData = await fetchGet<{ total: number }>(eventsUrl, { showErrorToast: false });
      const emailsProcessed = eventsData.total || 0;

      // Don't fetch suggested contacts - not needed for connection status
      const suggestedContacts = 0;

      return {
        emailsProcessed,
        suggestedContacts,
        lastSync: syncData.lastSync?.gmail || null,
        isConnected: syncData.serviceTokens?.gmail || false,
      };
    },
    retry: 2,
    staleTime: 30000, // 30 seconds
  });

  // Convert to the expected format for backward compatibility
  const status: GmailConnectionStatus = stats
    ? {
        isConnected: stats.isConnected,
        lastSync: stats.lastSync || undefined,
        emailCount: stats.emailsProcessed,
        contactCount: stats.suggestedContacts,
        error: error ? "Failed to load Gmail statistics" : undefined,
      }
    : { isConnected: false };

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

  return {
    status,
    stats,
    isLoading,
    error: error ? "Failed to load Gmail statistics" : null,
    connect: connectMutation.mutate,
    isConnecting: connectMutation.isPending,
    refetch,
  };
}
