import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPost } from "@/lib/api";

interface SyncPreviewData {
  countByLabel?: Record<string, number>;
  sampleSubjects?: Array<{
    id: string;
    subject: string;
    from: string;
    date: string;
  }>;
}

export function useGmailSync() {
  const queryClient = useQueryClient();
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isProcessingContacts, setIsProcessingContacts] = useState(false);

  // Sync preview and approval mutation
  const syncMutation = useMutation({
    mutationFn: async (): Promise<{ message: string }> => {
      // First preview the sync
      const preview: SyncPreviewData = await fetchPost("/api/sync/preview/gmail", {});

      // Calculate total emails from countByLabel
      const totalEmails = Object.values(preview?.countByLabel || {}).reduce(
        (sum: number, count: any) => sum + (typeof count === "number" ? count : 0),
        0,
      );

      // Show preview to user and ask for confirmation
      const sampleCount = preview?.sampleSubjects?.length || 0;
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
      const result = await fetchPost<{ message?: string }>("/api/sync/approve/gmail", {});
      return { message: result.message || "Gmail sync approved and processing started" };
    },
    onSuccess: (data) => {
      toast.success(data.message);
      toast.info("Jobs are processing automatically in the background. Check job status below for progress.");
      
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["gmail-stats"] });
      queryClient.invalidateQueries({ queryKey: ["gmail-emails"] });
      queryClient.invalidateQueries({ queryKey: ["job-status"] });
    },
    onError: (error: Error) => {
      if (error.message === "Sync cancelled by user") {
        return; // Don't show error for user cancellation
      }
      console.error("Error syncing Gmail:", error);
      toast.error("Failed to sync Gmail");
    },
  });

  // Generate embeddings mutation
  const embeddingsMutation = useMutation({
    mutationFn: async () => {
      const data = await fetchPost<{ message: string }>("/api/gmail/embed", { regenerate: false });
      return data;
    },
    onMutate: () => {
      setIsEmbedding(true);
    },
    onSuccess: (data) => {
      toast.success(data.message || "Embeddings generated successfully");
    },
    onError: (error) => {
      console.error("Error generating embeddings:", error);
      toast.error("Network error during embedding generation");
    },
    onSettled: () => {
      setIsEmbedding(false);
    },
  });

  // Process contacts mutation
  const processContactsMutation = useMutation({
    mutationFn: async () => {
      const data = await fetchPost<{ message?: string }>("/api/gmail/process-contacts", {});
      return { message: data.message || "Contacts processed successfully" };
    },
    onMutate: () => {
      setIsProcessingContacts(true);
    },
    onSuccess: (data) => {
      toast.success(data.message);
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["gmail-stats"] });
      queryClient.invalidateQueries({ queryKey: ["gmail-emails"] });
      queryClient.invalidateQueries({ queryKey: ["job-status"] });
    },
    onError: (error: Error) => {
      console.error("Contact processing error:", error);
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
