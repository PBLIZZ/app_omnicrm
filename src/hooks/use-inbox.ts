import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (error instanceof Error && (error.message.includes("fetch") || error.message.includes("network"))) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};
import type {
  InboxItemDTO,
  CreateInboxItemDTO,
  UpdateInboxItemDTO,
  InboxProcessingResultDTO,
  ProcessInboxItemDTO,
  BulkProcessInboxDTO,
  VoiceInboxCaptureDTO,
  InboxFilters,
} from "@omnicrm/contracts";

// ============================================================================
// TYPES
// ============================================================================

interface UseInboxOptions {
  filters?: InboxFilters;
  autoRefetch?: boolean;
}

interface InboxStats {
  unprocessed: number;
  processed: number;
  archived: number;
  total: number;
}

interface InboxApiResponse {
  items: InboxItemDTO[];
  total: number;
}

interface InboxStatsApiResponse {
  stats: InboxStats;
}

interface InboxProcessingResponse {
  result: InboxProcessingResultDTO;
}

interface BulkProcessResponse {
  result: {
    processed: InboxItemDTO[];
    results?: InboxProcessingResultDTO[];
  };
}

interface UseInboxReturn {
  // Query data
  items: InboxItemDTO[];
  stats: InboxStats | undefined;
  isLoading: boolean;
  isLoadingStats: boolean;
  error: unknown;

  // Actions
  quickCapture: (data: CreateInboxItemDTO) => void;
  voiceCapture: (data: VoiceInboxCaptureDTO) => void;
  processItem: (data: ProcessInboxItemDTO) => Promise<InboxProcessingResultDTO>;
  bulkProcess: (data: BulkProcessInboxDTO) => Promise<BulkProcessResponse["result"]>;
  updateItem: (itemId: string, data: UpdateInboxItemDTO) => void;
  markAsProcessed: (itemId: string, createdTaskId?: string) => void;
  deleteItem: (itemId: string) => void;

  // Loading states
  isCreating: boolean;
  isProcessing: boolean;
  isBulkProcessing: boolean;
  isUpdating: boolean;
  isDeleting: boolean;

  // Utilities
  refetch: () => Promise<{ data: InboxItemDTO[] | undefined; error: unknown }>;
  refetchStats: () => Promise<{ data: InboxStats | undefined; error: unknown }>;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useInbox(options: UseInboxOptions = {}): UseInboxReturn {
  const { filters, autoRefetch = true } = options;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Build query parameters
  const queryParams = new URLSearchParams();
  if (filters?.status && filters.status.length > 0) {
    filters.status.forEach((status) => queryParams.append("status", status));
  }
  if (filters?.search) {
    queryParams.set("search", filters.search);
  }
  if (filters?.createdAfter) {
    queryParams.set("createdAfter", filters.createdAfter.toISOString());
  }
  if (filters?.createdBefore) {
    queryParams.set("createdBefore", filters.createdBefore.toISOString());
  }
  if (filters?.hasAiSuggestions !== undefined) {
    queryParams.set("hasAiSuggestions", filters.hasAiSuggestions.toString());
  }

  const queryString = queryParams.toString();
  const apiUrl = `/api/inbox${queryString ? `?${queryString}` : ""}`;

  // ============================================================================
  // QUERIES
  // ============================================================================

  // Fetch inbox items
  const inboxQuery = useQuery({
    queryKey: queryKeys.inbox.list(filters),
    queryFn: async (): Promise<InboxItemDTO[]> => {
      const data = await apiClient.get<InboxApiResponse>(apiUrl);
      return data.items ?? [];
    },
    refetchInterval: autoRefetch ? 30000 : false, // Auto-refresh every 30 seconds
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Fetch inbox statistics
  const statsQuery = useQuery({
    queryKey: queryKeys.inbox.stats(),
    queryFn: async (): Promise<InboxStats> => {
      const data = await apiClient.get<InboxStatsApiResponse>("/api/inbox?stats=true");
      return data.stats;
    },
    refetchInterval: autoRefetch ? 60000 : false, // Auto-refresh every minute
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // ============================================================================
  // MUTATIONS
  // ============================================================================

  // Quick capture
  const quickCaptureMutation = useMutation({
    mutationFn: async (data: CreateInboxItemDTO): Promise<InboxItemDTO> => {
      const result = await apiClient.post<{ item: InboxItemDTO }>("/api/inbox", {
        type: "quick_capture",
        data,
      });
      return result.item;
    },
    onMutate: async (newItemData) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.list(filters) });
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.stats() });

      // Snapshot previous values
      const previousItems = queryClient.getQueryData<InboxItemDTO[]>(queryKeys.inbox.list(filters));
      const previousStats = queryClient.getQueryData<InboxStats>(queryKeys.inbox.stats());

      // Optimistically update items
      const tempItem: InboxItemDTO = {
        id: `temp-${Date.now()}`,
        userId: "",
        rawText: newItemData.rawText,
        status: "unprocessed",
        createdTaskId: null,
        processedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      queryClient.setQueryData<InboxItemDTO[]>(queryKeys.inbox.list(filters), (old) => [
        tempItem,
        ...(old ?? []),
      ]);

      // Optimistically update stats
      if (previousStats) {
        queryClient.setQueryData<InboxStats>(queryKeys.inbox.stats(), {
          ...previousStats,
          unprocessed: previousStats.unprocessed + 1,
          total: previousStats.total + 1,
        });
      }

      return { previousItems, previousStats, tempItem };
    },
    onError: (...[,, context]) => {
      // Rollback optimistic updates
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.inbox.list(filters), context.previousItems);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.inbox.stats(), context.previousStats);
      }
      toast({
        title: "Failed to capture item",
        description: "Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: (...[newItem,, context]) => {
      // Replace temp item with real item
      queryClient.setQueryData<InboxItemDTO[]>(
        queryKeys.inbox.list(filters),
        (old) =>
          old?.map((item) => (item.id === context?.tempItem.id ? newItem : item)) ?? [newItem],
      );

      toast({
        title: "Item captured",
        description: "Your item has been added to the inbox.",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.list(filters) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.stats() });
    },
  });

  // Voice capture
  const voiceCaptureMutation = useMutation({
    mutationFn: async (data: VoiceInboxCaptureDTO): Promise<InboxItemDTO> => {
      const result = await apiClient.post<{ item: InboxItemDTO }>("/api/inbox", {
        type: "voice_capture",
        data,
      });
      return result.item;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.list(filters) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.stats() });
      toast({
        title: "Voice note captured",
        description: "Your voice note has been transcribed and added to the inbox.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to capture voice note",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Process item with AI
  const processItemMutation = useMutation({
    mutationFn: async (data: ProcessInboxItemDTO): Promise<InboxProcessingResultDTO> => {
      const result = await apiClient.post<InboxProcessingResponse>("/api/inbox/process", data);
      return result.result;
    },
    onError: (error) => {
      // Handle specific error types
      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("not found")) {
        toast({
          title: "Item not found",
          description: "The inbox item could not be found.",
          variant: "destructive",
        });
      } else if (errorMessage.includes("AI processing")) {
        toast({
          title: "AI processing unavailable",
          description: "AI categorization is temporarily unavailable. Please try again later.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Processing failed",
          description: "Failed to process the item. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  // Bulk process
  const bulkProcessMutation = useMutation({
    mutationFn: async (data: BulkProcessInboxDTO): Promise<BulkProcessResponse["result"]> => {
      const result = await apiClient.post<BulkProcessResponse>("/api/inbox", {
        type: "bulk_process",
        data,
      });
      return result.result;
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.list(filters) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.stats() });

      const actionName = variables.action === "process" ? "processed" : variables.action + "d";
      toast({
        title: `Items ${actionName}`,
        description: `${result.processed.length} items have been ${actionName}.`,
      });
    },
    onError: () => {
      toast({
        title: "Bulk operation failed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update item
  const updateItemMutation = useMutation({
    mutationFn: async ({
      itemId,
      data,
    }: {
      itemId: string;
      data: UpdateInboxItemDTO;
    }): Promise<InboxItemDTO> => {
      const result = await apiClient.patch<{ item: InboxItemDTO }>(`/api/inbox/${itemId}`, {
        action: "update_status",
        data,
      });
      return result.item;
    },
    onSuccess: (updatedItem) => {
      // Update the item in the cache
      queryClient.setQueryData<InboxItemDTO[]>(
        queryKeys.inbox.list(filters),
        (old) => old?.map((item) => (item.id === updatedItem.id ? updatedItem : item)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.stats() });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update the item. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark as processed
  const markAsProcessedMutation = useMutation({
    mutationFn: async ({
      itemId,
      createdTaskId,
    }: {
      itemId: string;
      createdTaskId?: string;
    }): Promise<InboxItemDTO> => {
      const result = await apiClient.patch<{ item: InboxItemDTO }>(`/api/inbox/${itemId}`, {
        action: "mark_processed",
        data: createdTaskId ? { createdTaskId } : undefined,
      });
      return result.item;
    },
    onSuccess: (updatedItem) => {
      queryClient.setQueryData<InboxItemDTO[]>(
        queryKeys.inbox.list(filters),
        (old) => old?.map((item) => (item.id === updatedItem.id ? updatedItem : item)) ?? [],
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.stats() });
      toast({
        title: "Item processed",
        description: "The item has been marked as processed.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to mark as processed",
        description: "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete item
  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string): Promise<void> => {
      await apiClient.delete(`/api/inbox/${itemId}`);
    },
    onMutate: async (itemId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.list(filters) });
      await queryClient.cancelQueries({ queryKey: queryKeys.inbox.stats() });

      // Snapshot previous values
      const previousItems = queryClient.getQueryData<InboxItemDTO[]>(queryKeys.inbox.list(filters));
      const previousStats = queryClient.getQueryData<InboxStats>(queryKeys.inbox.stats());

      // Optimistically remove item
      const itemToDelete = previousItems?.find((item) => item.id === itemId);
      queryClient.setQueryData<InboxItemDTO[]>(
        queryKeys.inbox.list(filters),
        (old) => old?.filter((item) => item.id !== itemId) ?? [],
      );

      // Optimistically update stats
      if (previousStats && itemToDelete) {
        const statusField = itemToDelete.status as keyof InboxStats;
        if (statusField in previousStats && typeof previousStats[statusField] === "number") {
          queryClient.setQueryData<InboxStats>(queryKeys.inbox.stats(), {
            ...previousStats,
            [statusField]: (previousStats[statusField] as number) - 1,
            total: previousStats.total - 1,
          });
        }
      }

      return { previousItems, previousStats };
    },
    onError: (...[,, context]) => {
      // Rollback optimistic updates
      if (context?.previousItems) {
        queryClient.setQueryData(queryKeys.inbox.list(filters), context.previousItems);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(queryKeys.inbox.stats(), context.previousStats);
      }
      toast({
        title: "Delete failed",
        description: "Failed to delete the item. Please try again.",
        variant: "destructive",
      });
    },
    onSuccess: () => {
      toast({
        title: "Item deleted",
        description: "The item has been removed from your inbox.",
      });
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.list(filters) });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox.stats() });
    },
  });

  // ============================================================================
  // RETURN INTERFACE
  // ============================================================================

  return {
    // Query data
    items: inboxQuery.data ?? [],
    stats: statsQuery.data,
    isLoading: inboxQuery.isLoading,
    isLoadingStats: statsQuery.isLoading,
    error: inboxQuery.error,

    // Actions
    quickCapture: quickCaptureMutation.mutate,
    voiceCapture: voiceCaptureMutation.mutate,
    processItem: processItemMutation.mutateAsync,
    bulkProcess: bulkProcessMutation.mutateAsync,
    updateItem: (itemId: string, data: UpdateInboxItemDTO) =>
      updateItemMutation.mutate({ itemId, data }),
    markAsProcessed: (itemId: string, createdTaskId?: string) => {
      const payload: { itemId: string; createdTaskId?: string } = { itemId };
      if (createdTaskId !== undefined) {
        payload.createdTaskId = createdTaskId;
      }
      markAsProcessedMutation.mutate(payload);
    },
    deleteItem: deleteItemMutation.mutate,

    // Loading states
    isCreating: quickCaptureMutation.isPending || voiceCaptureMutation.isPending,
    isProcessing: processItemMutation.isPending,
    isBulkProcessing: bulkProcessMutation.isPending,
    isUpdating: updateItemMutation.isPending || markAsProcessedMutation.isPending,
    isDeleting: deleteItemMutation.isPending,

    // Utilities
    refetch: inboxQuery.refetch,
    refetchStats: statsQuery.refetch,
  };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for inbox statistics only
 */
export function useInboxStats() {
  return useQuery({
    queryKey: queryKeys.inbox.stats(),
    queryFn: async (): Promise<InboxStats> => {
      const data = await apiClient.get<InboxStatsApiResponse>("/api/inbox?stats=true");
      return data.stats;
    },
    refetchInterval: 60000, // Auto-refresh every minute
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}

/**
 * Hook for unprocessed items only (for quick processing flows)
 */
export function useUnprocessedInboxItems(limit?: number) {
  return useQuery({
    queryKey: queryKeys.inbox.unprocessed(limit),
    queryFn: async (): Promise<InboxItemDTO[]> => {
      const queryParams = new URLSearchParams();
      queryParams.append("status", "unprocessed");
      if (limit) {
        queryParams.set("limit", limit.toString());
      }

      const data = await apiClient.get<InboxApiResponse>(`/api/inbox?${queryParams.toString()}`);
      return data.items ?? [];
    },
    refetchInterval: 10000, // More frequent refresh for unprocessed items
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });
}
