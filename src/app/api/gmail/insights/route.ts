/**
 * GET /api/gmail/insights — AI-powered email insights endpoint
 *
 * Provides AI-generated insights and patterns from Gmail data
 */
import { handleGetWithQueryAuth } from "@/lib/api";
import { GmailInsightsService } from "@/server/services/gmail-insights.service";
import {
  GmailInsightsQuerySchema,
  GmailInsightsResponseSchema,
  type GmailInsightsResponse
} from "@/server/db/business-schemas";

export const GET = handleGetWithQueryAuth(
  GmailInsightsQuerySchema,
  GmailInsightsResponseSchema,
  async (query, userId): Promise<GmailInsightsResponse> => {
    const insights = await GmailInsightsService.generateInsights(userId);
    return { insights };
  },
);
