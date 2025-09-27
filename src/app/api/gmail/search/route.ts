/**
 * POST /api/gmail/search — Semantic email search endpoint
 *
 * Provides AI-powered semantic search through Gmail data using vector embeddings
 */
import { handleAuth } from "@/lib/api";
import { GmailSearchService } from "@/server/services/gmail-search.service";
import {
  GmailSearchRequestSchema,
  GmailSearchResponseSchema,
  type GmailSearchResponse
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  GmailSearchRequestSchema,
  GmailSearchResponseSchema,
  async (data, userId): Promise<GmailSearchResponse> => {
    const results = await GmailSearchService.searchEmails(userId, data);
    return results;
  }
);