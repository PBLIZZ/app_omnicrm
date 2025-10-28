import { getOrGenerateEmbedding } from "@/server/lib/embeddings";
import { Result, ok, err } from "@/lib/utils/result";
import { SearchRepository, type SearchResultDTO } from "@repo";

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
  source?: SearchSource;
  createdAt?: Date | null;
  updatedAt?: Date | null;
}

interface SemanticSearchOptions {
  matchCount?: number;
  similarityThreshold?: number;
  types?: SearchResultType[];
}

// Search result types - kept for potential future use in validation
// const _SEARCH_RESULT_TYPES: ReadonlySet<SearchResultType> = new Set([
//   "contact",
//   "note",
//   "interaction",
//   "calendar_event",
//   "task",
// ]);

const RESULT_ROUTE_MAP: Record<SearchResultType, (id: string) => string> = {
  contact: (id) => `/contacts/details?contactId=${id}`,
  note: (id) => `/contacts/details?contactId=${id}&tab=notes`,
  interaction: (id) => `/contacts/details?contactId=${id}&tab=interactions`,
  calendar_event: (id) => `/calendar/${id}`,
  task: (id) => `/tasks/${id}`,
};

// const DEFAULT_SIMILARITY_THRESHOLD = 0.7; // Unused - kept for potential future use

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
    const searchType: SearchKind = SEARCH_TYPES.includes(request.type || "hybrid")
      ? request.type || "hybrid"
      : "hybrid";
    const limit = clamp(request.limit || DEFAULT_LIMIT, MIN_LIMIT, MAX_LIMIT);

    // Perform search
    const searchResult = await performSearch(
      request.userId,
      query,
      searchType,
      limit,
      request.types,
    );

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
      ...(types && { types }),
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
    const searchOptions: SemanticSearchOptions = {
      matchCount: limit,
    };

    if (options?.similarityThreshold !== undefined) {
      searchOptions.similarityThreshold = options.similarityThreshold;
    }

    const finalTypes = types || options?.types;
    if (finalTypes) {
      searchOptions.types = finalTypes;
    }
    return await searchSemanticByEmbedding(userId, embedding, searchOptions);
  } catch (error) {
    return err({
      code: "SEMANTIC_SEARCH_FAILED",
      message: error instanceof Error ? error.message : "Semantic search failed",
      details: error,
    });
  }
}

/**
 * Performs a semantic search using the provided embedding and returns mapped search results.
 *
 * @param userId - The ID of the user whose indexed data should be searched
 * @param embedding - The numeric embedding vector representing the query
 * @param options - Optional semantic search parameters (e.g., `matchCount`, `similarityThreshold`, `types`)
 * @returns A `Result` containing an array of `SearchResult` on success; on failure, an error object with `code`, `message`, and optional `details`
 */
export async function searchSemanticByEmbedding(
  userId: string,
  embedding: number[],
  options?: SemanticSearchOptions,
): Promise<Result<SearchResult[], { code: string; message: string; details?: unknown }>> {
  try {
    const searchParams = {
      userId,
      embedding,
      limit: options?.matchCount ?? 10,
      ...(options?.similarityThreshold !== undefined && {
        similarityThreshold: options.similarityThreshold,
      }),
      ...(options?.types && { types: options.types }),
    };
    const searchResult = await SearchRepository.searchSemantic(searchParams);

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
        const hybridResult: SearchResult = {
          ...existing,
          score: Math.min((existing.score ?? 1) + semanticScore, 2),
          source: "hybrid",
        };

        // Only set similarity if we have a value to avoid undefined
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
  const result: SearchResult = {
    id: dto.id,
    type: dto.type,
    title: dto.title,
    content: dto.content,
    metadata: dto.metadata,
    url: resolveResultUrl(dto.type, dto.id),
  };

  // Only include optional properties when they are defined
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