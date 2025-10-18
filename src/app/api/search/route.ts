/**
 * Search API - Performs traditional, semantic, or hybrid search
 *
 * Supports multiple search modes across contacts, interactions, calendar events, and notes.
 * Uses query parameters for search input to support GET requests and URL sharing.
 */

import { handleGetWithQueryAuth } from "@/lib/api";
import { processSearchRequest } from "@/server/services/search.service";
import {
  SearchQuerySchema,
  SearchResponseSchema,
  type SearchResponse,
} from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(
  SearchQuerySchema,
  SearchResponseSchema,
  async (searchQuery, userId): Promise<SearchResponse> => {
    const { q: query, type: searchType, limit, types } = searchQuery;

    return await processSearchRequest({
      userId,
      query: query || "",
      ...(searchType && { type: searchType }),
      ...(limit && { limit }),
      ...(types && { types }),
    });
  },
);
