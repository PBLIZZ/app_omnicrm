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
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });
      toast.success("Contact deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete Contact", {
        description: error.message,
      });
    },
  });
}

export interface BulkDeleteResponse {
  deleted: number;
  errors: { id: string; error: string }[];
}

export function useBulkDeleteContacts(): UseMutationResult<
  BulkDeleteResponse,
  Error,
  string[],
  unknown
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contactIds: string[]): Promise<BulkDeleteResponse> => {
      const result = await apiClient.post<BulkDeleteResponse>(
        "/api/contacts/bulk-delete",
        { ids: contactIds },
      );
      return result;
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all });

      // Show appropriate success message based on results
      if (data.errors.length === 0) {
        toast.success(
          `Successfully deleted ${data.deleted} Contact${data.deleted === 1 ? "" : "s"}`,
        );
      } else {
        const successCount = data.deleted;
        const failureCount = data.errors.length;
        toast.warning(
          `Partially completed: ${successCount} deleted, ${failureCount} failed`,
          {
            description: data.errors.map((e) => e.error).join(", "),
          },
        );
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to delete Contacts", {
        description: error.message,
      });
    },
  });
}
