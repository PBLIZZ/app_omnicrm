import { useState, type Dispatch, type SetStateAction } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

interface SyncPreviewData {
  countByLabel?: Record<string, number>;
  sampleSubjects?: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
  }>;
}

type UseGmailSyncReturn = {
  // State
  showSyncPreview: boolean;
  setShowSyncPreview: Dispatch<SetStateAction<boolean>>;
  isSyncing: boolean;
  isEmbedding: boolean;
  isProcessingContacts: boolean;

  // Actions
  startSync: () => void;
  approveSync: () => void;
  generateEmbeddings: () => void;
  processContacts: () => void;
};

export function useGmailSync(): UseGmailSyncReturn {
  const queryClient = useQueryClient();
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isProcessingContacts, setIsProcessingContacts] = useState(false);

  // Sync preview and approval mutation
  const syncMutation = useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      // First preview the sync
      const preview: SyncPreviewData = await apiClient.post("/api/sync/preview/gmail", {});

      // Calculate total emails from countByLabel
      const totalEmails = Object.values(preview?.countByLabel ?? {}).reduce(
        (sum: number, count: number) => sum + count,
        0,
      );

      // Show preview to user and ask for confirmation
      const sampleCount = preview?.sampleSubjects?.length ?? 0;
      const confirmed = window.confirm(
        `Gmail Sync Preview:\n\n` +
          `• Total emails found: ${totalEmails}\n` +
          `• Sample emails retrieved: ${sampleCount}\n` +
          `• Jobs will process automatically after approval\n\n` +
          `Proceed with sync? This will create background jobs to process your Gmail data.`,
      );

      if (!confirmed) {
        throw new Error("Sync cancelled by user");
      }

      // Proceed with sync
      const result = await apiClient.post<{ message?: string }>("/api/sync/approve/gmail", {});
      return { message: result.message ?? "Gmail sync approved and processing started" };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      toast.info(
        "Jobs are processing automatically in the background. Check job status below for progress.",
      );

      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: ["gmail-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["gmail-emails"] });
      void queryClient.invalidateQueries({ queryKey: ["job-status"] });
    },
    onError: (error: Error) => {
      if (error.message === "Sync cancelled by user") {
        return; // Don't show error for user cancellation
      }
      toast.error("Failed to sync Gmail");
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
      // Invalidate related queries
      void queryClient.invalidateQueries({ queryKey: ["gmail-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["gmail-emails"] });
      void queryClient.invalidateQueries({ queryKey: ["job-status"] });
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
    showSyncPreview,
    setShowSyncPreview,
    isSyncing: syncMutation.isPending,
    isEmbedding,
    isProcessingContacts,

    // Actions
    startSync: () => setShowSyncPreview(true),
    approveSync: syncMutation.mutate,
    generateEmbeddings: embeddingsMutation.mutate,
    processContacts: processContactsMutation.mutate,
  };
}
