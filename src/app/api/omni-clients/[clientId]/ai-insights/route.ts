import { handleGetWithQueryAuth } from "@/lib/api";
import { ContactAIActionsService } from "@/server/services/contact-ai-actions.service";
import { ClientAIInsightsResponseSchema } from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";

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

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const handler = handleGetWithQueryAuth(
    AIInsightsQuerySchema,
    ClientAIInsightsResponseSchema,
    async (query, userId) => {
      // Use existing service but present as OmniClient insights
      const insights = await ContactAIActionsService.askAIAboutContact(userId, params.clientId);
      return insights;
    }
  );

  return handler(request);
}
