import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import { toast } from "sonner";
import { Result, isErr } from "@/lib/utils/result";

export function useDeleteContact(): UseMutationResult<void, Error, string, unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactId: string): Promise<void> => {
      const result = await apiClient.delete<Result<void, { message: string; code: string }>>(
        `/api/contacts/${contactId}`,
      );
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list() });
      toast.success("Contact deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete Contact", {
        description: error.message,
      });
    },
  });
}

export function useBulkDeleteContacts(): UseMutationResult<void, Error, string[], unknown> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]): Promise<void> => {
      const result = await apiClient.post<Result<void, { message: string; code: string }>>(
        "/api/contacts/bulk-delete",
        { ids: contactIds },
      );
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
    },
    onSuccess: (data, contactIds) => {
      void data;
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.list() });
      toast.success(
        `Successfully deleted ${contactIds.length} Contact${contactIds.length === 1 ? "" : "s"}`,
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to delete Contacts", {
        description: error.message,
      });
    },
  });
}
