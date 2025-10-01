import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
import type {
  Contact,
  ContactWithNotes,
  ContactListResponse,
} from "@/server/db/business-schemas/contacts";

// Re-export types for components
export type { Contact, ContactWithNotes };

// Define suggestion types locally since they're not in the schema
export interface ContactSuggestion {
  id: string;
  displayName: string;
  primaryEmail: string;
  source: string;
  confidence: string;
  aiInsights?: {
    lifecycleStage: string;
    tags: string[];
    summary: string;
  };
  calendarEvents?: Array<{
    title: string;
    startTime: string;
    eventType: string;
  }>;
}

interface ContactSuggestionsResponse {
  suggestions: ContactSuggestion[];
}

// GET /api/contacts
export function useContacts(
  searchQuery: string,
  page = 1,
  pageSize = 25, // Default to 25 for better performance
): ReturnType<typeof useQuery<{ items: Contact[]; total: number }>> {
  return useQuery({
    queryKey: queryKeys.contacts.list({ search: searchQuery, page, pageSize }),
    queryFn: async (): Promise<{ items: Contact[]; total: number }> => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const data = await apiClient.get<ContactListResponse>(`/api/contacts?${params.toString()}`);

      return {
        items: data.items,
        total: data.pagination.total,
      };
    },
    // Cache signed URLs for 4 hours (matching backend expiry)
    staleTime: 1000 * 60 * 60 * 4, // 4 hours
    gcTime: 1000 * 60 * 60 * 24, // 24 hours (renamed from cacheTime in React Query v5)
  });
}

// GET /api/contacts/suggestions
export function useContactSuggestions(enabled = true): ReturnType<typeof useQuery<ContactSuggestion[]>> {
  return useQuery({
    queryKey: ["/api/contacts/suggestions"],
    queryFn: async (): Promise<ContactSuggestion[]> => {
      const data = await apiClient.get<ContactSuggestionsResponse>("/api/contacts/suggestions");
      return data.suggestions;
    },
    enabled,
  });
}
