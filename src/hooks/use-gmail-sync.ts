import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

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
    onSuccess: (data) => {
      toast.success(data.message);
      toast.info("Your incremental Gmail sync is running in the background.");

      // Invalidate unified dashboard data to refresh job status
      void queryClient.invalidateQueries({ queryKey: ["omniConnectDashboard"] });
    },
    onError: () => {
      toast.error("Failed to start Gmail sync");
    },
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
    onError: () => {
      toast.error("Network error during embedding generation");
    },
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
      // Invalidate unified dashboard data
      void queryClient.invalidateQueries({ queryKey: ["omniConnectDashboard"] });
    },
    onError: () => {
      toast.error("Failed to process contacts");
    },
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
