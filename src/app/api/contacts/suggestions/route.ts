import { z } from "zod";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import {
  getContactSuggestions,
  createContactsFromSuggestions,
} from "@/server/services/contacts.service";

/**
 * OmniClients Suggestions API
 *
 * GET: Returns calendar-based contact suggestions
 * POST: Creates contacts from approved suggestions
 */

const CreateFromSuggestionsSchema = z.object({
  suggestionIds: z.array(z.string().min(1)).min(1).max(50), // Limit to 50 suggestions at once
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_get_suggestions" },
})(async ({ userId }) => {
  const result = await getContactSuggestions(userId);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    ok: true,
    data: {
      suggestions: result.data,
    },
  });
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_create_from_suggestions" },
  validation: { body: CreateFromSuggestionsSchema },
})(async ({ userId, validated }) => {
  const result = await createContactsFromSuggestions(userId, validated.body.suggestionIds);

  if (!result.ok) {
    return Response.json({ error: result.error }, { status: result.status });
  }

  return Response.json({
    ok: true,
    data: result.data,
  });
});
