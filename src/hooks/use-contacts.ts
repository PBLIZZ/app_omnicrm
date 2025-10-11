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
): ReturnType<typeof useQuery<{ items: ContactWithNotes[]; total: number }>> {
  return useQuery({
    queryKey: queryKeys.contacts.list({ search: searchQuery, page, pageSize }),
    queryFn: async (): Promise<{ items: ContactWithNotes[]; total: number }> => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      // apiClient automatically unwraps { success: true, data: T } → returns T directly
      const data = await apiClient.get<ContactListResponse>(`/api/contacts?${params.toString()}`);

      return {
        items: data.items, // items now includes lastNote field
        total: data.pagination.total,
      };
    },
    // Smart caching strategy for 300-3000 contacts:
    // - Fetch all contacts once (pageSize=3000)
    // - Cache for 30 minutes to minimize API calls
    // - Only refetch on window focus if data is stale (>30 min)
    // - Mutations manually invalidate to force refetch
    staleTime: 30 * 60 * 1000, // 30 minutes - data stays fresh
    gcTime: 60 * 60 * 1000, // 1 hour - keep in memory
    refetchOnWindowFocus: true, // Refetch on tab focus (respects staleTime)
    refetchOnMount: false, // Don't refetch on component remount (use cache)
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
