import { handleGetWithQueryAuth } from "@/lib/api";
import { askAIAboutContactService } from "@/server/services/contacts-ai.service";
import {
  ContactAIInsightsResponse,
  ContactAIInsightsResponseSchema,
} from "@/server/db/business-schemas";
import { z } from "zod";
import { NextRequest } from "next/server";

/**
 * Contact AI Insights endpoint
 *
 * Generates AI insights for a specific contact using existing ContactAIActionsService
 * UI boundary transformation: presents "Contact" while using "contacts" backend
 *
 * Migrated to new auth pattern:
 * ✅ handleGetWithQueryAuth for GET
 * ✅ Zod validation and type safety
 */

interface RouteParams {
  params: {
    contactId: string;
  };
}

// Simple query schema for AI insights (no query params needed currently)
const AIInsightsQuerySchema = z.object({});

export async function GET(request: NextRequest, { params }: RouteParams) {
  const handler = handleGetWithQueryAuth(
    AIInsightsQuerySchema,
    ContactAIInsightsResponseSchema,
    async (
      _query: z.infer<typeof AIInsightsQuerySchema>,
      userId: string,
    ): Promise<ContactAIInsightsResponse> => {
      // Use existing service but present as Contact insights
      const insights = await askAIAboutContactService(userId, params.contactId);
      return insights;
    },
  );

  return handler(request);
}
