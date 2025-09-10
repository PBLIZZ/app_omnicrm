import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { toast } from "sonner";
import type {
  ClientAIInsightsResponse,
  ClientEmailSuggestion,
  ClientNoteSuggestion,
  ClientNoteSuggestionsResponse,
  CreateNoteInput,
} from "@/lib/validation/schemas/omniClients";

// Re-export types for components
export type { ClientAIInsightsResponse, ClientEmailSuggestion, ClientNoteSuggestion };

// Alias for backward compatibility
export type ClientAIInsightResponse = ClientAIInsightsResponse;

export function useAskAIAboutOmniClient(): UseMutationResult<
  ClientAIInsightsResponse,
  Error,
  string
> {
  return useMutation({
    mutationFn: async (clientId: string): Promise<ClientAIInsightsResponse> => {
      return await apiClient.post<ClientAIInsightsResponse>(
        `/api/omni-clients/${clientId}/ai-insights`,
        {},
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to generate OmniClient AI insights", {
        description: error.message,
      });
    },
  });
}

export function useGenerateOmniClientEmailSuggestion(): UseMutationResult<
  ClientEmailSuggestion,
  Error,
  { clientId: string; purpose?: string }
> {
  return useMutation({
    mutationFn: async (params: {
      clientId: string;
      purpose?: string;
    }): Promise<ClientEmailSuggestion> => {
      return await apiClient.post<ClientEmailSuggestion>(
        `/api/omni-clients/${params.clientId}/email-suggestion`,
        {
          purpose: params.purpose,
        },
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to generate OmniClient email suggestion", {
        description: error.message,
      });
    },
  });
}

export function useGenerateOmniClientNoteSuggestions(): UseMutationResult<
  ClientNoteSuggestion[],
  Error,
  string
> {
  return useMutation({
    mutationFn: async (clientId: string): Promise<ClientNoteSuggestion[]> => {
      const response = await apiClient.post<ClientNoteSuggestionsResponse>(
        `/api/omni-clients/${clientId}/note-suggestions`,
        {},
      );
      return response ?? [];
    },
    onError: (error: Error) => {
      toast.error("Failed to generate OmniClient note suggestions", {
        description: error.message,
      });
    },
  });
}

export function useCreateOmniClientNote(): UseMutationResult<
  unknown,
  Error,
  { clientId: string; title?: string; content: string }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { clientId: string; title?: string; content: string }) => {
      const input: CreateNoteInput = {
        title: params.title,
        content: params.content,
      };
      return await apiClient.post(`/api/omni-clients/${params.clientId}/notes`, input);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/omni-clients"] });
      toast.success("OmniClient note created successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to create OmniClient note", {
        description: error.message,
      });
    },
  });
}
