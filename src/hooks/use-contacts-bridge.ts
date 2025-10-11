// Bridge hooks to maintain TypeScript compatibility for Contacts UI
// Re-exports existing contact AI actions with Contact naming convention
// This avoids churn in the columns component while adapting to new naming

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Result, isErr, isOk } from "@/lib/utils/result";
import {
  type ContactAIInsightsResponse,
  type ContactEmailSuggestion,
  type ContactNoteSuggestion,
} from "@/server/db/business-schemas/contacts";

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

// Hook to generate email suggestion for Contact - uses contacts API
export function useGenerateContactEmailSuggestion(): UseMutationResult<
  ContactEmailSuggestion,
  Error,
  { contactId: string; purpose?: string },
  unknown
> {
  return useMutation({
    mutationFn: async ({
      contactId,
      purpose,
    }: {
      contactId: string;
      purpose?: string;
    }): Promise<ContactEmailSuggestion> => {
      const result = await apiClient.post<
        Result<ContactEmailSuggestion, { message: string; code: string }>
      >(`/api/contacts/${contactId}/email-suggestion`, { purpose });
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!isOk(result)) {
        throw new Error("Invalid result state");
      }
      return result.data;
    },
    onError: (error) => {
      toast.error("Failed to generate email suggestion: " + error.message);
    },
  });
}

// Hook to generate note suggestions for Contact - uses contacts API
export function useGenerateContactNoteSuggestions(): UseMutationResult<
  ContactNoteSuggestion[],
  Error,
  string,
  unknown
> {
  return useMutation({
    mutationFn: async (contactId: string): Promise<ContactNoteSuggestion[]> => {
      const result = await apiClient.post<
        Result<ContactNoteSuggestion[], { message: string; code: string }>
      >(`/api/contacts/${contactId}/note-suggestions`, {});
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!isOk(result)) {
        throw new Error("Invalid result state");
      }
      return result.data;
    },
    onError: (error) => {
      toast.error("Failed to generate note suggestions: " + error.message);
    },
  });
}

// Hook to create note for Contact - uses contacts API
export function useCreateContactNote(): UseMutationResult<
  unknown,
  Error,
  { contactId: string; content: string },
  unknown
> {
  return useMutation({
    mutationFn: async ({ contactId, content }: { contactId: string; content: string }) => {
      const result = await apiClient.post<Result<unknown, { message: string; code: string }>>(
        `/api/contacts/${contactId}/notes`,
        { content },
      );
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      if (!isOk(result)) {
        throw new Error("Invalid result state");
      }
      return result.data;
    },
    onSuccess: () => {
      toast.success("Note created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create note: " + error.message);
    },
  });
}

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
