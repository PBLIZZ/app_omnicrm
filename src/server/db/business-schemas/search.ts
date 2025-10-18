/**
 * Search Business Schemas
 *
 * Zod schemas for search-related API validation and serialization.
 */

import { z } from "zod";

export const SearchResultTypeSchema = z.enum([
  "contact",
  "note",
  "interaction",
  "calendar_event",
  "task",
]);

export const SearchKindSchema = z.enum(["traditional", "semantic", "hybrid"]);

export const SearchResultSchema = z.object({
  id: z.string(),
  type: SearchResultTypeSchema,
  title: z.string(),
  content: z.string(),
  metadata: z.record(z.string(), z.unknown()),
  url: z.string(),
  similarity: z.number().optional(),
  score: z.number().optional(),
  source: z.enum(["traditional", "semantic", "hybrid"]).optional(),
  createdAt: z.date().nullable().optional(),
  updatedAt: z.date().nullable().optional(),
});

export const SearchQuerySchema = z.object({
  q: z.string().optional(),
  type: SearchKindSchema.optional(),
  limit: z.coerce.number().min(1).max(50).optional(),
  types: z.array(SearchResultTypeSchema).optional(),
});

export const SearchResponseSchema = z.object({
  results: z.array(SearchResultSchema),
  searchType: SearchKindSchema,
  query: z.string(),
  total: z.number(),
  hasResults: z.boolean(),
  resultCount: z.number(),
  isTraditionalSearch: z.boolean(),
  isSemanticSearch: z.boolean(),
  isHybridSearch: z.boolean(),
  hasSuggestions: z.boolean(),
});

// Type exports
export type SearchResultType = z.infer<typeof SearchResultTypeSchema>;
export type SearchKind = z.infer<typeof SearchKindSchema>;
export type SearchResult = z.infer<typeof SearchResultSchema>;
export type SearchQuery = z.infer<typeof SearchQuerySchema>;
export type SearchResponse = z.infer<typeof SearchResponseSchema>;
