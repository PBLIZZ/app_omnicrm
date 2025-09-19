import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";

export function useDeleteOmniClient(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string): Promise<void> => {
      await apiClient.delete(`/api/omni-clients/${clientId}`);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.list() });
      toast.success("OmniClient deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete OmniClient", {
        description: error.message,
      });
    },
  });
}

export function useBulkDeleteOmniClients(): UseMutationResult<void, Error, string[], unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientIds: string[]): Promise<void> => {
      await apiClient.post("/api/omni-clients/bulk-delete", { ids: clientIds });
    },
    onSuccess: (data, clientIds) => {
      void data;
      void queryClient.invalidateQueries({ queryKey: queryKeys.clients.list() });
      toast.success(
        `Successfully deleted ${clientIds.length} OmniClient${clientIds.length === 1 ? "" : "s"}`,
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to delete OmniClients", {
        description: error.message,
      });
    },
  });
}
