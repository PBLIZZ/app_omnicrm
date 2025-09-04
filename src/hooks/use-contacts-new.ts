import { useQuery } from "@tanstack/react-query";
import type { Contact } from "@/server/db/schema";

// Align with UI table ContactWithNotes shape (extends Contact + extras)
export interface ContactWithNotes extends Contact {
  notesCount?: number;
  lastNote?: string;
  interactions?: number;
}

export interface ContactSuggestion {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: "high" | "medium" | "low";
  source: "calendar_attendee";
}

// Define API response types
interface ContactsApiResponse {
  ok: boolean;
  data: {
    contacts: ContactWithNotes[];
  };
}

interface ContactsApiResponseDirect {
  contacts: ContactWithNotes[];
}

type ContactsResponse = ContactsApiResponse | ContactsApiResponseDirect;

// GET /api/contacts-new
export function useEnhancedContacts(
  searchQuery: string,
): ReturnType<typeof useQuery<{ contacts: ContactWithNotes[] }>> {
  return useQuery({
    queryKey: ["/api/contacts-new", searchQuery],
    queryFn: async (): Promise<{ contacts: ContactWithNotes[] }> => {
      const url = new URL("/api/contacts-new", window.location.origin);
      if (searchQuery.trim()) {
        url.searchParams.set("search", searchQuery.trim());
      }
      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch contacts");
      const json: ContactsResponse = (await response.json()) as ContactsResponse;

      // Type-safe extraction of contacts data
      if ("ok" in json && json.data) {
        return { contacts: json.data.contacts };
      }
      if ("contacts" in json) {
        return { contacts: json.contacts };
      }
      // Fallback - should not happen with proper API response
      return { contacts: [] };
    },
  });
}

// Define suggestion API response types
interface SuggestionsApiResponse {
  ok: boolean;
  data: {
    suggestions: ContactSuggestion[];
  };
}

interface SuggestionsApiResponseDirect {
  suggestions: ContactSuggestion[];
}

type SuggestionsResponse = SuggestionsApiResponse | SuggestionsApiResponseDirect;

// GET /api/contacts-new/suggestions
export function useContactSuggestions(
  enabled: boolean,
): ReturnType<typeof useQuery<{ suggestions: ContactSuggestion[] }>> {
  return useQuery({
    queryKey: ["/api/contacts-new/suggestions"],
    queryFn: async (): Promise<{ suggestions: ContactSuggestion[] }> => {
      const response = await fetch("/api/contacts-new/suggestions");
      if (!response.ok) throw new Error("Failed to fetch suggestions");
      const json: SuggestionsResponse = (await response.json()) as SuggestionsResponse;

      // Type-safe extraction of suggestions data
      if ("ok" in json && json.data) {
        return { suggestions: json.data.suggestions };
      }
      if ("suggestions" in json) {
        return { suggestions: json.suggestions };
      }
      // Fallback - should not happen with proper API response
      return { suggestions: [] };
    },
    enabled,
  });
}
