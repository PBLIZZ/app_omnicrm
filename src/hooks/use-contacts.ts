import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Result, isErr } from "@/lib/utils/result";
import type {
  Contact,
  ContactWithNotes,
  ContactListResponse,
} from "@/server/db/business-schemas/contacts";

// Re-export types for components
export type { Contact, ContactWithNotes };

// For backward compatibility, alias types
export type ContactWithNotesDTO = ContactWithNotes;

// Define suggestion types locally since they're not in the schema
export interface ContactSuggestion {
  id: string;
  displayName: string;
  primaryEmail: string | null;
  reason: string;
}

export interface ContactSuggestionsResponse {
  suggestions: ContactSuggestion[];
}

// GET /api/contacts
export function useEnhancedContacts(
  searchQuery: string,
): ReturnType<typeof useQuery<{ items: Contact[]; total: number }>> {
  return useQuery({
    queryKey: ["/api/contacts", searchQuery],
    queryFn: async (): Promise<{ items: Contact[]; total: number }> => {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const result = await apiClient.get<
        Result<ContactListResponse, { message: string; code: string }>
      >(`/api/contacts?${params.toString()}`);

      if (isErr(result)) {
        throw new Error(result.error.message);
      }

      // TypeScript now knows result is successful
      const successResult = result as { success: true; data: ContactListResponse };
      return {
        items: successResult.data.items,
        total: successResult.data.pagination.total,
      };
    },
  });
}

// GET /api/contacts/suggestions
export function useContactsuggestions(
  enabled: boolean,
): ReturnType<typeof useQuery<{ suggestions: ContactSuggestion[] }>> {
  return useQuery({
    queryKey: ["/api/contacts/suggestions"],
    queryFn: async (): Promise<{ suggestions: ContactSuggestion[] }> => {
      const result = await apiClient.get<
        Result<ContactSuggestionsResponse, { message: string; code: string }>
      >("/api/contacts/suggestions");
      if (isErr(result)) {
        throw new Error(result.error.message);
      }
      // TypeScript now knows result is successful
      const successResult = result as { success: true; data: ContactSuggestionsResponse };
      return successResult.data;
    },
    enabled,
  });
}
