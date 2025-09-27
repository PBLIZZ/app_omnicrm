/**
 * Search Schemas
 *
 * Type definitions and validation schemas for search functionality.
 * Supports traditional, semantic, and hybrid search modes.
 */

import { z } from "zod";

// ============================================================================
// SEARCH TYPE DEFINITIONS
// ============================================================================

/**
 * Search types/modes supported by the system
 */
export const SearchKindSchema = z.enum(["traditional", "semantic", "hybrid"]);
export type SearchKind = z.infer<typeof SearchKindSchema>;

// ============================================================================
// REQUEST SCHEMAS
// ============================================================================

/**
 * Search Request Schema
 */
export const SearchRequestSchema = z.object({
  query: z.string().min(1, "Search query is required"),
  type: SearchKindSchema.optional().default("hybrid"),
  limit: z
    .number()
    .int()
    .min(1, "Limit must be at least 1")
    .max(50, "Limit cannot exceed 50")
    .optional()
    .default(20),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;

/**
 * Search Query Schema (for GET requests via query params)
 */
export const SearchQuerySchema = z.object({
  q: z.string().min(1, "Search query is required"),
  type: SearchKindSchema.optional().default("hybrid"),
  limit: z
    .string()
    .optional()
    .transform((val) => val ? parseInt(val, 10) : 20)
    .pipe(z.number().int().min(1).max(50)),
});

export type SearchQuery = z.infer<typeof SearchQuerySchema>;

// ============================================================================
// SEARCH RESULT SCHEMAS
// ============================================================================

/**
 * Search Result Item Schema
 */
export const SearchResultItemSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  excerpt: z.string().optional(),
  score: z.number().min(0).max(1),
  metadata: z.record(z.unknown()).optional(),
  url: z.string().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
}).transform((data) => ({
  ...data,
  // UI computed fields
  relevancePercentage: Math.round(data.score * 100),
  hasExcerpt: !!data.excerpt,
  isHighRelevance: data.score >= 0.7,
  isMediumRelevance: data.score >= 0.4 && data.score < 0.7,
  isLowRelevance: data.score < 0.4,
}));

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

/**
 * Search Response Schema
 */
export const SearchResponseSchema = z.object({
  results: z.array(SearchResultItemSchema),
  searchType: SearchKindSchema,
  query: z.string(),
  total: z.number().optional(),
  took: z.number().optional(), // search duration in ms
  facets: z.record(z.unknown()).optional(),
  suggestions: z.array(z.string()).optional(),
}).transform((data) => ({
  ...data,
  // UI computed fields
  hasResults: data.results.length > 0,
  resultCount: data.results.length,
  isTraditionalSearch: data.searchType === "traditional",
  isSemanticSearch: data.searchType === "semantic",
  isHybridSearch: data.searchType === "hybrid",
  hasSuggestions: !!data.suggestions && data.suggestions.length > 0,
}));

export type SearchResponse = z.infer<typeof SearchResponseSchema>;

// ============================================================================
// SEMANTIC SEARCH SPECIFIC SCHEMAS
// ============================================================================

/**
 * Semantic Search Context Schema
 */
export const SemanticSearchContextSchema = z.object({
  userId: z.string().uuid(),
  contextType: z.enum(["contacts", "interactions", "calendar", "notes", "global"]).optional(),
  filters: z.record(z.unknown()).optional(),
  embeddings: z.array(z.number()).optional(),
});

export type SemanticSearchContext = z.infer<typeof SemanticSearchContextSchema>;

/**
 * Search Analytics Schema (for tracking search performance)
 */
export const SearchAnalyticsSchema = z.object({
  query: z.string(),
  searchType: SearchKindSchema,
  resultCount: z.number(),
  clickedResultId: z.string().optional(),
  clickPosition: z.number().optional(),
  sessionId: z.string().optional(),
  userId: z.string().uuid(),
  timestamp: z.coerce.date(),
  took: z.number().optional(),
});

export type SearchAnalytics = z.infer<typeof SearchAnalyticsSchema>;

// ============================================================================
// ERROR SCHEMAS
// ============================================================================

/**
 * Search Error Response Schema
 */
export const SearchErrorResponseSchema = z.object({
  error: z.string(),
  details: z.string().optional(),
  code: z.string().optional(),
  searchType: SearchKindSchema.optional(),
  query: z.string().optional(),
});

export type SearchErrorResponse = z.infer<typeof SearchErrorResponseSchema>;

// ============================================================================
// EXPORT ALL SCHEMAS
// ============================================================================

export {
  // Core schemas
  SearchKindSchema,
  SearchRequestSchema,
  SearchQuerySchema,
  SearchResultItemSchema,
  SearchResponseSchema,

  // Advanced schemas
  SemanticSearchContextSchema,
  SearchAnalyticsSchema,
  SearchErrorResponseSchema,

  // Types
  type SearchKind,
  type SearchRequest,
  type SearchQuery,
  type SearchResultItem,
  type SearchResponse,
  type SemanticSearchContext,
  type SearchAnalytics,
  type SearchErrorResponse,
};