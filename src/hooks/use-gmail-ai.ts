import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";

interface SearchResult {
  subject: string;
  similarity: number;
  date: string;
  snippet: string;
  contactInfo?: {
    displayName: string;
  };
}

interface Insights {
  patterns?: string[];
  emailVolume?: {
    total: number;
    thisWeek: number;
    trend: "up" | "down" | "stable";
  };
  topContacts?: Array<{
    displayName?: string;
    email: string;
    emailCount: number;
  }>;
}

/**
 * Provides state and actions for performing Gmail searches and fetching AI-generated insights.
 *
 * @returns An object with the following properties:
 * - `searchQuery` — current search text.
 * - `setSearchQuery` — updater for `searchQuery`.
 * - `searchResults` — array of matched Gmail results.
 * - `isSearching` — `true` while a search request is pending, `false` otherwise.
 * - `searchGmail` — triggers a search using the current `searchQuery`.
 * - `insights` — loaded analytics/insights or `null` if none loaded.
 * - `isLoadingInsights` — `true` while insights are being fetched, `false` otherwise.
 * - `loadInsights` — async function to fetch and set `insights`.
 */
export function useGmailAI(): {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  isSearching: boolean;
  searchGmail: () => void;
  insights: Insights | null;
  isLoadingInsights: boolean;
  loadInsights: () => Promise<void>;
} {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [insights, setInsights] = useState<Insights | null>(null);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);

  // Search Gmail mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string): Promise<SearchResult[]> => {
      const result = await apiClient.post<{ results: SearchResult[] }>("/api/gmail/search", {
        query,
        limit: 5,
      });
      return result.results ?? [];
    },
    onSuccess: (results) => {
      setSearchResults(results);
    },
    onError: () => {
      toast.error("Search failed");
    },
  });

  // Define API response type for insights
  interface InsightsResponse {
    insights: Insights;
  }

  // Load insights function
  const loadInsights = async (): Promise<void> => {
    setIsLoadingInsights(true);
    try {
      const result = await apiClient.get<InsightsResponse>("/api/gmail/insights");
      setInsights(result.insights);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to load insights";
      toast.error(errorMessage);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const searchGmail = (): void => {
    if (!searchQuery.trim()) return;
    searchMutation.mutate(searchQuery);
  };

  return {
    // Search state
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching: searchMutation.isPending,
    searchGmail,

    // Insights state
    insights,
    isLoadingInsights,
    loadInsights,
  };
}