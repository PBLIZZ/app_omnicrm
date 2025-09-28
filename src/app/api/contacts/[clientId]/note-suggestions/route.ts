import { askAIAboutContactService } from "@/server/services/contacts-ai.service";
import { handleAuth } from "@/lib/api";
import { z } from "zod";

/**
 * OmniClient Note Suggestions endpoint
 *
 * Generates AI note suggestions for a specific client using existing ContactAIActionsService
 * UI boundary transformation: presents "OmniClient" while using "contacts" backend
 */

const NoteSuggestionsInputSchema = z.object({
  clientId: z.string().uuid(),
});

const NoteSuggestionsResponseSchema = z.object({
  suggestions: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      content: z.string(),
      category: z.string().optional(),
      confidence: z.number().optional(),
    }),
  ),
});

export const POST = handleAuth(
  NoteSuggestionsInputSchema,
  NoteSuggestionsResponseSchema,
  async (data, userId): Promise<z.infer<typeof NoteSuggestionsResponseSchema>> => {
    // Use existing service but present as OmniClient note suggestions
    // For now, use the general AI insights service - can be extended later
    const insights = await askAIAboutContactService(userId, data.clientId);
    const noteSuggestions = insights.suggestions || [];
    return { suggestions: noteSuggestions };
  },
);
