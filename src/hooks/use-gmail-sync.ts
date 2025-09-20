import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { createErrorHandler, showSyncSuccessToast } from "@/lib/errors/error-handling";

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
      const result = await apiClient.post<{ message?: string; batchId?: string }>(
        "/api/sync/approve/gmail",
        {},
      );
      return {
        message: result.message ?? "Gmail sync started",
        ...(result.batchId && { batchId: result.batchId }),
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
      const data = await apiClient.post<{ message: string }>("/api/gmail/embed", {
        regenerate: false,
      });
      return data;
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
      const data = await apiClient.post<{ message?: string }>("/api/gmail/process-contacts", {});
      return { message: data.message ?? "Contacts processed successfully" };
    },
    onMutate: () => {
      setIsProcessingContacts(true);
    },
    onSuccess: (data) => {
      toast.success(data.message);
      // Invalidate contact-related queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
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
