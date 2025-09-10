// Bridge hooks to maintain TypeScript compatibility for OmniClients UI
// Re-exports existing contact AI actions with OmniClient naming convention
// This avoids churn in the columns component while adapting to new naming

import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import {
  type ClientAIInsightsResponse,
  type ClientEmailSuggestion,
  type ClientNoteSuggestion,
} from "@/lib/validation/schemas/omniClients";

// Hook to ask AI about an OmniClient - uses omni-clients API
export function useAskAIAboutOmniClient(): UseMutationResult<
  ClientAIInsightsResponse,
  Error,
  string,
  unknown
> {
  return useMutation({
    mutationFn: async (clientId: string): Promise<ClientAIInsightsResponse> => {
      return await apiClient.post<ClientAIInsightsResponse>(
        `/api/omni-clients/${clientId}/ai-insights`,
        {},
      );
    },
    onError: (error) => {
      toast.error("Failed to generate AI insights: " + error.message);
    },
  });
}

// Hook to generate email suggestion for OmniClient - uses omni-clients API
export function useGenerateOmniClientEmailSuggestion(): UseMutationResult<
  ClientEmailSuggestion,
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
    }): Promise<ClientEmailSuggestion> => {
      return await apiClient.post<ClientEmailSuggestion>(
        `/api/omni-clients/${contactId}/email-suggestion`,
        { purpose },
      );
    },
    onError: (error) => {
      toast.error("Failed to generate email suggestion: " + error.message);
    },
  });
}

// Hook to generate note suggestions for OmniClient - uses omni-clients API
export function useGenerateOmniClientNoteSuggestions(): UseMutationResult<
  ClientNoteSuggestion[],
  Error,
  string,
  unknown
> {
  return useMutation({
    mutationFn: async (clientId: string): Promise<ClientNoteSuggestion[]> => {
      return await apiClient.post<ClientNoteSuggestion[]>(
        `/api/omni-clients/${clientId}/note-suggestions`,
        {},
      );
    },
    onError: (error) => {
      toast.error("Failed to generate note suggestions: " + error.message);
    },
  });
}

// Hook to create note for OmniClient - uses omni-clients API
export function useCreateOmniClientNote(): UseMutationResult<
  unknown,
  Error,
  { contactId: string; content: string },
  unknown
> {
  return useMutation({
    mutationFn: async ({ contactId, content }: { contactId: string; content: string }) => {
      return await apiClient.post(`/api/omni-clients/${contactId}/notes`, { content });
    },
    onSuccess: () => {
      toast.success("Note created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create note: " + error.message);
    },
  });
}

export { useDeleteOmniClient } from "@/hooks/use-client-delete";

// Hook to bulk enrich OmniClients with AI insights
export function useBulkEnrichOmniClients(): UseMutationResult<unknown, Error, string[], unknown> {
  return useMutation({
    mutationFn: async (clientIds: string[]) => {
      return await apiClient.post(`/api/omni-clients/bulk-enrich`, { ids: clientIds });
    },
    onSuccess: (_, clientIds) => {
      toast.success(
        `Successfully enriched ${clientIds.length} client${clientIds.length === 1 ? "" : "s"} with AI insights`,
      );
    },
    onError: (error) => {
      toast.error("Failed to enrich clients: " + error.message);
    },
  });
}
