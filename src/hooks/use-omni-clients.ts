import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  OmniClientWithNotesDTO,
  ClientSuggestion,
  OmniClientsListResponseDTO,
  ClientSuggestionsResponse,
} from "@/lib/validation/schemas/omniClients";

// Re-export types for components
export type { OmniClientWithNotesDTO, ClientSuggestion };

// For backward compatibility, alias ClientWithNotes to OmniClientWithNotes
export type ClientWithNotes = OmniClientWithNotesDTO;

// GET /api/omni-clients
export function useEnhancedOmniClients(
  searchQuery: string,
): ReturnType<typeof useQuery<{ items: OmniClientWithNotesDTO[]; total: number }>> {
  return useQuery({
    queryKey: ["/api/omni-clients", searchQuery],
    queryFn: async (): Promise<{ items: OmniClientWithNotesDTO[]; total: number }> => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const response = await apiClient.get<OmniClientsListResponseDTO>(
        `/api/omni-clients?${params.toString()}`,
      );

      return {
        items: response.items,
        total: response.total,
      };
    },
  });
}

// GET /api/omni-clients/suggestions
export function useOmniClientSuggestions(
  enabled: boolean,
): ReturnType<typeof useQuery<{ suggestions: ClientSuggestion[] }>> {
  return useQuery({
    queryKey: ["/api/omni-clients/suggestions"],
    queryFn: async (): Promise<{ suggestions: ClientSuggestion[] }> => {
      const response = await apiClient.get<ClientSuggestionsResponse>(
        "/api/omni-clients/suggestions",
      );
      return response;
    },
    enabled,
  });
}
