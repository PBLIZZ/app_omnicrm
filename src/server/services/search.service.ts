/**
 * Search Service
 *
 * Orchestrates search operations across different entity types using both
 * traditional keyword search and semantic search via embeddings.
 */

import {
  createSearchRepository,
  type SearchRepository,
  type SearchResultDTO,
  type SemanticSearchParams,
} from "@repo";
import { getDb } from "@/server/db/client";
import { getOrGenerateEmbedding } from "@/server/lib/embeddings";
import { AppError } from "@/lib/errors/app-error";

export type SearchKind = "traditional" | "semantic" | "hybrid";
export type SearchResultType = "contact" | "note" | "interaction" | "calendar_event" | "task";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  url: string;
  similarity?: number;
  score?: number;
  source?: "traditional" | "semantic" | "hybrid";
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

export interface SearchRequest {
  userId: string;
  query: string;
  type?: SearchKind;
  limit?: number;
  types?: SearchResultType[];
}

export interface SearchResponse {
  results: SearchResult[];
  searchType: SearchKind;
  query: string;
  total: number;
  hasResults: boolean;
  resultCount: number;
  isTraditionalSearch: boolean;
  isSemanticSearch: boolean;
  isHybridSearch: boolean;
  hasSuggestions: boolean;
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

const SEARCH_TYPES: readonly SearchKind[] = ["traditional", "semantic", "hybrid"] as const;

/**
 * Process search request with validation and normalization
 */
export async function processSearchRequest(request: SearchRequest): Promise<SearchResponse> {
  // Validate query
  if (!request.query || !request.query.trim()) {
    const emptySearchType = request.type || "hybrid";
    return {
      results: [],
      searchType: emptySearchType,
      query: "",
      total: 0,
      hasResults: false,
      resultCount: 0,
      isTraditionalSearch: emptySearchType === "traditional",
      isSemanticSearch: emptySearchType === "semantic",
      isHybridSearch: emptySearchType === "hybrid",
      hasSuggestions: false,
    };
  }

  const query = request.query.trim();
  const searchType: SearchKind = SEARCH_TYPES.includes(request.type || "hybrid")
    ? request.type || "hybrid"
    : "hybrid";
  const limit = clamp(request.limit || DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);

  try {
    // Perform search
    const results = await performSearch(request.userId, query, searchType, limit, request.types);

    return {
      results,
      searchType,
      query,
      total: results.length,
      hasResults: results.length > 0,
      resultCount: results.length,
      isTraditionalSearch: searchType === "traditional",
      isSemanticSearch: searchType === "semantic",
      isHybridSearch: searchType === "hybrid",
      hasSuggestions: results.length > 0,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Search processing failed",
      "SEARCH_FAILED",
      "database",
      false,
      500,
    );
  }
}

export async function performSearch(
  userId: string,
  query: string,
  type: SearchKind,
  limit: number,
  types?: SearchResultType[],
): Promise<SearchResult[]> {
  const db = await getDb();
  const searchRepo = createSearchRepository(db);

  try {
    switch (type) {
      case "traditional":
        return await searchTraditional(searchRepo, userId, query, limit, types);
      case "semantic":
        return await searchSemantic(searchRepo, userId, query, limit, types);
      case "hybrid":
        return await searchHybrid(searchRepo, userId, query, limit, types);
      default:
        return await searchHybrid(searchRepo, userId, query, limit, types);
    }
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Search failed",
      "SEARCH_FAILED",
      "database",
      false,
      500,
    );
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

async function searchTraditional(
  searchRepo: SearchRepository,
  userId: string,
  query: string,
  limit: number,
  types?: SearchResultType[],
): Promise<SearchResult[]> {
  const results = await searchRepo.searchTraditional({
    userId,
    query,
    limit,
    ...(types && { types }),
  });

  return results.map(mapSearchResultDTOToSearchResult);
}

async function searchSemantic(
  searchRepo: SearchRepository,
  userId: string,
  query: string,
  limit: number,
  types?: SearchResultType[],
): Promise<SearchResult[]> {
  try {
    const embedding = await getOrGenerateEmbedding(query);
    const searchParams: SemanticSearchParams = {
      userId,
      embedding,
      limit,
      similarityThreshold: 0.7,
    };

    if (types && types.length > 0) {
      searchParams.types = types;
    }

    const results = await searchRepo.searchSemantic(searchParams);

    return results.map(mapSearchResultDTOToSearchResult);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Semantic search failed",
      "SEMANTIC_SEARCH_FAILED",
      "database",
      false,
      500,
    );
  }
}

async function searchHybrid(
  searchRepo: SearchRepository,
  userId: string,
  query: string,
  limit: number,
  types?: SearchResultType[],
): Promise<SearchResult[]> {
  const effectiveLimit = Math.max(1, limit);
  const traditionalLimit = Math.max(1, Math.ceil(effectiveLimit * 0.6));
  const semanticLimit = Math.max(1, Math.ceil(effectiveLimit * 0.4));

  const [traditionalResults, semanticResults] = await Promise.allSettled([
    searchTraditional(searchRepo, userId, query, traditionalLimit, types),
    searchSemantic(searchRepo, userId, query, semanticLimit, types),
  ]);

  const traditional = traditionalResults.status === "fulfilled" ? traditionalResults.value : [];
  const semantic = semanticResults.status === "fulfilled" ? semanticResults.value : [];

  const merged = new Map<string, SearchResult>();

  const addResult = (result: SearchResult): void => {
    const key = `${result.type}:${result.id}`;
    merged.set(key, result);
  };

  traditional.forEach((result) => {
    addResult({ ...result, score: result.score ?? 1, source: "traditional" });
  });

  semantic.forEach((result) => {
    const key = `${result.type}:${result.id}`;
    const existing = merged.get(key);
    const semanticScore = result.similarity ?? 0.5;

    if (existing) {
      const hybridResult: SearchResult = {
        ...existing,
        score: Math.min((existing.score ?? 1) + semanticScore, 2),
        source: "hybrid",
      };

      if (result.similarity !== undefined) {
        hybridResult.similarity = result.similarity;
      } else if (existing.similarity !== undefined) {
        hybridResult.similarity = existing.similarity;
      }

      merged.set(key, hybridResult);
    } else {
      addResult({ ...result, score: semanticScore, source: "semantic" });
    }
  });

  return Array.from(merged.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, effectiveLimit);
}

function mapSearchResultDTOToSearchResult(dto: SearchResultDTO): SearchResult {
  const result: SearchResult = {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    content: dto.content,
    metadata: dto.metadata,
    url: resolveResultUrl(dto.type, dto.id),
  };

  if (dto.similarity !== undefined) {
    result.similarity = dto.similarity;
  }
  if (dto.score !== undefined) {
    result.score = dto.score;
  }
  if (dto.source !== undefined) {
    result.source = dto.source;
  }
  if (dto.createdAt !== undefined) {
    result.createdAt = dto.createdAt;
  }
  if (dto.updatedAt !== undefined) {
    result.updatedAt = dto.updatedAt;
  }

  return result;
}

const RESULT_ROUTE_MAP: Record<SearchResultType, (id: string) => string> = {
  contact: (id) => `/contacts/details?contactId=${id}`,
  note: (id) => `/contacts/details?contactId=${id}&tab=notes`,
  interaction: (id) => `/contacts/details?contactId=${id}&tab=interactions`,
  calendar_event: (id) => `/calendar/${id}`,
  task: (id) => `/tasks/${id}`,
};

function resolveResultUrl(type: SearchResultType, id: string): string {
  const resolver = RESULT_ROUTE_MAP[type];
  return resolver ? resolver(id) : "/";
}
