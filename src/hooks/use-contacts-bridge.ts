// Bridge hooks to maintain TypeScript compatibility for Contacts UI
// Re-exports existing contact AI actions with Contact naming convention
// This avoids churn in the columns component while adapting to new naming

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Result, isErr, isOk } from "@/lib/utils/result";
import { type ContactAIInsightsResponse } from "@/server/db/business-schemas/contacts";

// Hook to ask AI about an Contact - uses contacts API
export function useAskAIAboutContact(): UseMutationResult<
  ContactAIInsightsResponse,
  Error,
  string,
  unknown
> {
  return useMutation({
    mutationFn: async (contactId: string): Promise<ContactAIInsightsResponse> => {
      const result = await apiClient.post<
        Result<ContactAIInsightsResponse, { message: string; code: string }>
      >(`/api/contacts/${contactId}/ai-insights`, {});
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!isOk(result)) {
        throw new Error("Invalid result state");
      }
      return result.data;
    },
    onError: (error) => {
      toast.error("Failed to generate AI insights: " + error.message);
    },
  });
}

// Legacy hook removed - use useNotes from @/hooks/use-notes instead

export { useDeleteContact as useDeleteContact } from "@/hooks/use-contact-delete";

// Hook to bulk enrich Contacts with AI insights
export function useBulkEnrichContacts(): UseMutationResult<unknown, Error, string[], unknown> {
  return useMutation({
    mutationFn: async (contactIds: string[]) => {
      const result = await apiClient.post<Result<unknown, { message: string; code: string }>>(
        `/api/contacts/bulk-enrich`,
        { ids: contactIds },
      );
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!isOk(result)) {
        throw new Error("Invalid result state");
      }
      return result.data;
    },
    onSuccess: (data, contactIds) => {
      void data;
      toast.success(
        `Successfully enriched ${contactIds.length} contact${contactIds.length === 1 ? "" : "s"} with AI insights`,
      );
    },
    onError: (error) => {
      toast.error("Failed to enrich contacts: " + error.message);
    },
  });
}
