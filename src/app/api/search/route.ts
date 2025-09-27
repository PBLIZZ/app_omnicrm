import { handleGetWithQueryAuth } from "@/lib/api";
import { performSearch } from "@/server/services/semantic-search.service";
import {
  SearchQuerySchema,
  SearchResponseSchema,
  type SearchResponse,
} from "@/server/db/business-schemas";

/**
 * Search API - Performs traditional, semantic, or hybrid search
 *
 * Supports multiple search modes across contacts, interactions, calendar events, and notes.
 * Uses query parameters for search input to support GET requests and URL sharing.
 */

export const GET = handleGetWithQueryAuth(
  SearchQuerySchema,
  SearchResponseSchema,
  async (searchQuery, _userId): Promise<SearchResponse> => {
    const { q: query, type: searchType, limit } = searchQuery;

    if (!query) {
      const emptySearchType = searchType || "hybrid";
      return {
        results: [],
        searchType: emptySearchType,
        query: "",
        total: 0,
        // Computed fields from transform
        hasResults: false,
        resultCount: 0,
        isTraditionalSearch: emptySearchType === "traditional",
        isSemanticSearch: emptySearchType === "semantic",
        isHybridSearch: emptySearchType === "hybrid",
        hasSuggestions: false,
      };
    }

    const searchResults = await performSearch(query, searchType, limit);

    // Transform SearchResult[] to SearchResultItem[] to match schema
    const results = searchResults.map(result => {
      const score = Math.min(Math.max(result.similarity || result.score || 0, 0), 1);
      const excerpt = result.content?.substring(0, 200);
      return {
        id: result.id,
        type: result.type as string,
        title: result.title,
        excerpt,
        score,
        metadata: result.metadata,
        url: result.url || undefined,
        // Computed fields from transform
        relevancePercentage: Math.round(score * 100),
        hasExcerpt: !!excerpt,
        isHighRelevance: score >= 0.7,
        isMediumRelevance: score >= 0.4 && score < 0.7,
        isLowRelevance: score < 0.4,
      };
    });

    return {
      results,
      searchType,
      query,
      total: results.length,
      // Computed fields from transform
      hasResults: results.length > 0,
      resultCount: results.length,
      isTraditionalSearch: searchType === "traditional",
      isSemanticSearch: searchType === "semantic",
      isHybridSearch: searchType === "hybrid",
      hasSuggestions: false, // No suggestions implemented yet
    };
  }
);