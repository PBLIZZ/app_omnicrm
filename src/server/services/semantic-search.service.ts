import { getOrGenerateEmbedding } from "@/server/lib/embeddings";
import { Result, ok, err } from "@/lib/utils/result";
import { SearchRepository, type SearchResultDTO } from "packages/repo/src/search.repo";

export type SearchKind = "traditional" | "semantic" | "hybrid";
export type SearchResultType = "contact" | "note" | "interaction" | "calendar_event" | "task";
export type SearchSource = "traditional" | "semantic" | "hybrid";

export interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  content: string;
  metadata: Record<string, unknown>;
  url: string;
  similarity?: number;
  score?: number;
  source?: SearchSource;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface SemanticSearchOptions {
  matchCount?: number;
  similarityThreshold?: number;
  types?: SearchResultType[];
}

const _SEARCH_RESULT_TYPES: ReadonlySet<SearchResultType> = new Set([
  "contact",
  "note",
  "interaction",
  "calendar_event",
  "task",
]);

const RESULT_ROUTE_MAP: Record<SearchResultType, (id: string) => string> = {
  contact: (id) => `/omni-clients/details?contactId=${id}`,
  note: (id) => `/omni-clients/details?contactId=${id}&tab=notes`,
  interaction: (id) => `/omni-clients/details?contactId=${id}&tab=interactions`,
  calendar_event: (id) => `/calendar/${id}`,
  task: (id) => `/tasks/${id}`,
};

const DEFAULT_SIMILARITY_THRESHOLD = 0.7;

export function resolveResultUrl(type: SearchResultType, id: string): string {
  const resolver = RESULT_ROUTE_MAP[type];
  return resolver ? resolver(id) : "/";
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
}

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;
const MIN_LIMIT = 1;

const SEARCH_TYPES: readonly SearchKind[] = ["traditional", "semantic", "hybrid"] as const;

/**
 * Process search request with validation and normalization
 */
export async function processSearchRequest(
  request: SearchRequest,
): Promise<Result<SearchResponse, { code: string; message: string; details?: unknown }>> {
  try {
    // Validate query
    if (!request.query || !request.query.trim()) {
      return ok({
        results: [],
        searchType: "hybrid",
        query: "",
      });
    }

    const query = request.query.trim();
    const searchType: SearchKind = SEARCH_TYPES.includes(request.type || "hybrid") ? (request.type || "hybrid") : "hybrid";
    const limit = clamp(request.limit || DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);

    // Perform search
    const searchResult = await performSearch(request.userId, query, searchType, limit, request.types);

    if (!searchResult.success) {
      return err(searchResult.error);
    }

    return ok({
      results: searchResult.data,
      searchType,
      query,
    });
  } catch (error) {
    return err({
      code: "SEARCH_FAILED",
      message: error instanceof Error ? error.message : "Search processing failed",
      details: error,
    });
  }
}

export async function performSearch(
  userId: string,
  query: string,
  type: SearchKind,
  limit: number,
  types?: SearchResultType[],
): Promise<Result<SearchResult[], { code: string; message: string; details?: unknown }>> {
  try {
    switch (type) {
      case "traditional":
        return await searchTraditional(userId, query, limit, types);
      case "semantic":
        return await searchSemantic(userId, query, limit, undefined, types);
      case "hybrid":
        return await searchHybrid(userId, query, limit, types);
      default:
        return await searchHybrid(userId, query, limit, types);
    }
  } catch (error) {
    return err({
      code: "SEARCH_FAILED",
      message: error instanceof Error ? error.message : "Search failed",
      details: error,
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export async function searchTraditional(
  userId: string,
  query: string,
  limit: number,
  types?: SearchResultType[],
): Promise<Result<SearchResult[], { code: string; message: string; details?: unknown }>> {
  try {
    const searchResult = await SearchRepository.searchTraditional({
      userId,
      query,
      limit,
      types,
    });

    if (!searchResult.success) {
      return err(searchResult.error);
    }

    const results = searchResult.data.map(mapSearchResultDTOToSearchResult);
    return ok(results);
  } catch (error) {
    return err({
      code: "TRADITIONAL_SEARCH_FAILED",
      message: error instanceof Error ? error.message : "Traditional search failed",
      details: error,
    });
  }
}

export async function searchSemantic(
  userId: string,
  query: string,
  limit: number,
  options?: SemanticSearchOptions,
  types?: SearchResultType[],
): Promise<Result<SearchResult[], { code: string; message: string; details?: unknown }>> {
  try {
    const embedding = await getOrGenerateEmbedding(query);
    return await searchSemanticByEmbedding(userId, embedding, {
      matchCount: limit,
      similarityThreshold: options?.similarityThreshold,
      types: types || options?.types,
    });
  } catch (error) {
    return err({
      code: "SEMANTIC_SEARCH_FAILED",
      message: error instanceof Error ? error.message : "Semantic search failed",
      details: error,
    });
  }
}

export async function searchSemanticByEmbedding(
  userId: string,
  embedding: number[],
  options?: SemanticSearchOptions,
): Promise<Result<SearchResult[], { code: string; message: string; details?: unknown }>> {
  try {
    const searchResult = await SearchRepository.searchSemantic({
      userId,
      embedding,
      limit: options?.matchCount ?? 10,
      similarityThreshold: options?.similarityThreshold ?? DEFAULT_SIMILARITY_THRESHOLD,
      types: options?.types,
    });

    if (!searchResult.success) {
      return err(searchResult.error);
    }

    const results = searchResult.data.map(mapSearchResultDTOToSearchResult);
    return ok(results);
  } catch (error) {
    return err({
      code: "SEMANTIC_EMBEDDING_SEARCH_FAILED",
      message: error instanceof Error ? error.message : "Semantic embedding search failed",
      details: error,
    });
  }
}

export async function searchHybrid(
  userId: string,
  query: string,
  limit: number,
  types?: SearchResultType[],
): Promise<Result<SearchResult[], { code: string; message: string; details?: unknown }>> {
  try {
    const effectiveLimit = Math.max(1, limit);
    const traditionalLimit = Math.max(1, Math.ceil(effectiveLimit * 0.6));
    const semanticLimit = Math.max(1, Math.ceil(effectiveLimit * 0.4));

    const [traditionalResult, semanticResult] = await Promise.all([
      searchTraditional(userId, query, traditionalLimit, types),
      searchSemantic(userId, query, semanticLimit, undefined, types),
    ]);

    // Handle errors from either search
    if (!traditionalResult.success && !semanticResult.success) {
      return err({
        code: "HYBRID_SEARCH_FAILED",
        message: "Both traditional and semantic search failed",
        details: { traditionalError: traditionalResult.error, semanticError: semanticResult.error },
      });
    }

    const traditionalResults = traditionalResult.success ? traditionalResult.data : [];
    const semanticResults = semanticResult.success ? semanticResult.data : [];

    const merged = new Map<string, SearchResult>();

    const addResult = (result: SearchResult): void => {
      const key = `${result.type}:${result.id}`;
      merged.set(key, result);
    };

    traditionalResults.forEach((result) => {
      addResult({ ...result, score: result.score ?? 1, source: "traditional" });
    });

    semanticResults.forEach((result) => {
      const key = `${result.type}:${result.id}`;
      const existing = merged.get(key);
      const semanticScore = result.similarity ?? 0.5;

      if (existing) {
        merged.set(key, {
          ...existing,
          similarity: result.similarity ?? existing.similarity,
          score: Math.min((existing.score ?? 1) + semanticScore, 2),
          source: "hybrid",
        });
      } else {
        addResult({ ...result, score: semanticScore, source: "semantic" });
      }
    });

    const results = Array.from(merged.values())
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, effectiveLimit);

    return ok(results);
  } catch (error) {
    return err({
      code: "HYBRID_SEARCH_FAILED",
      message: error instanceof Error ? error.message : "Hybrid search failed",
      details: error,
    });
  }
}

function mapSearchResultDTOToSearchResult(dto: SearchResultDTO): SearchResult {
  return {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    content: dto.content,
    metadata: dto.metadata,
    url: resolveResultUrl(dto.type, dto.id),
    similarity: dto.similarity,
    score: dto.score,
    source: dto.source,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

