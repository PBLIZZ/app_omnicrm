import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import type {
  Contact,
  ContactWithNotes,
  ClientSuggestion,
  ContactListResponse,
  ClientSuggestionsResponse,
} from "@/server/db/business-schemas/contacts";

// Re-export types for components
export type { Contact, ContactWithNotes, ClientSuggestion };

// For backward compatibility, alias types
export type OmniClientWithNotesDTO = ContactWithNotes;
export type ClientWithNotes = ContactWithNotes;

// GET /api/contacts
export function useEnhancedOmniClients(
  searchQuery: string,
): ReturnType<typeof useQuery<{ items: ContactWithNotes[]; total: number }>> {
  return useQuery({
    queryKey: ["/api/contacts", searchQuery],
    queryFn: async (): Promise<{ items: ContactWithNotes[]; total: number }> => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const response = await apiClient.get<ContactListResponse>(
        `/api/contacts?${params.toString()}`,
      );

      return {
        items: response.items,
        total: response.pagination.total,
      };
    },
  });
}

// GET /api/contacts/suggestions
export function useOmniClientSuggestions(
  enabled: boolean,
): ReturnType<typeof useQuery<{ suggestions: ClientSuggestion[] }>> {
  return useQuery({
    queryKey: ["/api/contacts/suggestions"],
    queryFn: async (): Promise<{ suggestions: ClientSuggestion[] }> => {
      const response = await apiClient.get<ClientSuggestionsResponse>(
        "/api/contacts/suggestions",
      );
      return response;
    },
    enabled,
  });
}
