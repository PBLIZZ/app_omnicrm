import { ContactAIActionsService } from "@/server/services/contact-ai-actions.service";
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
  suggestions: z.array(z.object({
    id: z.string(),
    title: z.string(),
    content: z.string(),
    category: z.string().optional(),
    confidence: z.number().optional(),
  })),
});

export const POST = handleAuth(
  NoteSuggestionsInputSchema,
  NoteSuggestionsResponseSchema,
  async (data, userId): Promise<z.infer<typeof NoteSuggestionsResponseSchema>> => {
    // Use existing service but present as OmniClient note suggestions
    const noteSuggestions = await ContactAIActionsService.generateNoteSuggestions(userId, data.clientId);
    return { suggestions: noteSuggestions };
  }
);
