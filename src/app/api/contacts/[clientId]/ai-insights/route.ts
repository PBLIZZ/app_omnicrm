import { handleGetWithQueryAuth } from "@/lib/api";
import { askAIAboutContactService } from "@/server/services/contacts-ai.service";
import { ClientAIInsightsResponseSchema } from "@/server/db/business-schemas";
import { z } from "zod";

/**
 * OmniClient AI Insights endpoint
 *
 * Generates AI insights for a specific client using existing ContactAIActionsService
 * UI boundary transformation: presents "OmniClient" while using "contacts" backend
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: {
    clientId: string;
  };
}

// Simple query schema for AI insights (no query params needed currently)
const AIInsightsQuerySchema = z.object({});

export const GET = handleGetWithQueryAuth(
  AIInsightsQuerySchema,
  ClientAIInsightsResponseSchema,
  async (_query, userId, { params }: RouteParams): Promise<any> => {
    // Use existing service but present as OmniClient insights
    const insights = await askAIAboutContactService(userId, params.clientId);
    return insights;
  },
);
