import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { post } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";

// Direct error handling and success notifications (no abstraction)
const createErrorHandler = (context: string) => (error: unknown) => {
  const message = error instanceof Error ? error.message : "An unknown error occurred";
  toast.error(`${context} Failed`, { description: message });

  // Log for debugging (development only)
  if (process.env.NODE_ENV === "development") {
    console.error(`[${context}] Error:`, error);
  }
};

const showSyncSuccessToast = (service: string, details?: { count?: number; duration?: string }) => {
  const title = `${service} Sync Complete`;
  let description = `${service} data has been synchronized successfully.`;

  if (details?.count !== undefined) {
    description = `${details.count} ${service.toLowerCase()} items synchronized successfully.`;
  }

  if (details?.duration) {
    description += ` (${details.duration})`;
  }

  toast.success(title, { description });
};

type UseGmailSyncReturn = {
  // State
  isSyncing: boolean;
  isEmbedding: boolean;
  isProcessingContacts: boolean;

  // Actions - simplified for incremental sync only
  startSync: () => void;
  generateEmbeddings: () => void;
  processContacts: () => void;
};

export function useGmailSync(): UseGmailSyncReturn {
  const queryClient = useQueryClient();
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isProcessingContacts, setIsProcessingContacts] = useState(false);

  // Simplified incremental sync mutation - no preview, just sync
  const syncMutation = useMutation({
    mutationFn: async (): Promise<{ message: string; batchId?: string }> => {
      const response = await post<{ message?: string; batchId?: string }>(
        "/api/sync/approve/gmail",
        {}
      );
      return {
        message: response.message ?? "Gmail sync started",
        ...(response.batchId && { batchId: response.batchId }),
      };
    },
    onSuccess: () => {
      showSyncSuccessToast("Gmail", { count: 0 });
      toast.info("Your incremental Gmail sync is running in the background.");

      // Invalidate all Gmail-related queries using centralized utilities
      void queryClient.invalidateQueries({ queryKey: queryKeys.omniConnect.dashboard() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.google.gmail.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.google.status() });
    },
    onError: createErrorHandler("Gmail Sync"),
  });

  // Generate embeddings mutation
  const embeddingsMutation = useMutation({
    mutationFn: async () => {
      const response = await post<{ message: string }>("/api/gmail/embed", {
        regenerate: false,
      });
      return response;
    },
    onMutate: () => {
      setIsEmbedding(true);
    },
    onSuccess: (data) => {
      toast.success(data.message ?? "Embeddings generated successfully");
    },
    onError: createErrorHandler("Gmail Embeddings"),
    onSettled: () => {
      setIsEmbedding(false);
    },
  });

  // Process contacts mutation
  const processContactsMutation = useMutation({
    mutationFn: async () => {
      const response = await post<{ message?: string }>("/api/gmail/process-contacts", {});
      return { message: response.message ?? "Contacts processed successfully" };
    },
    onMutate: () => {
      setIsProcessingContacts(true);
    },
    onSuccess: (data) => {
      toast.success(data.message);
      // Invalidate contact-related queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.calendar.clients() });
      // Also invalidate dashboard
      void queryClient.invalidateQueries({ queryKey: queryKeys.omniConnect.dashboard() });
    },
    onError: createErrorHandler("Contact Processing"),
    onSettled: () => {
      setIsProcessingContacts(false);
    },
  });

  return {
    // State
    isSyncing: syncMutation.isPending,
    isEmbedding,
    isProcessingContacts,

    // Actions - simplified for incremental sync only
    startSync: syncMutation.mutate,
    generateEmbeddings: embeddingsMutation.mutate,
    processContacts: processContactsMutation.mutate,
  };
}
