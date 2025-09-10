import { z } from "zod";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { ContactSuggestionService } from "@/server/services/contact-suggestion.service";
import { ensureError } from "@/lib/utils/error-handler";

/**
 * OmniClients Suggestions API
 *
 * GET: Returns calendar-based contact suggestions
 * POST: Creates contacts from approved suggestions
 * Uses existing ContactSuggestionService with UI terminology transformation
 */

const CreateFromSuggestionsSchema = z.object({
  suggestionIds: z.array(z.string().min(1)).min(1).max(50), // Limit to 50 suggestions at once
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_suggestions_list" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_suggestions_list", requestId);

  try {
    // Get contact suggestions from calendar attendees
    const suggestions = await ContactSuggestionService.getContactSuggestions(userId);

    // Transform ContactSuggestion[] to match OmniClients terminology
    // (The types are already aligned, so no transformation needed)
    return api.success({
      suggestions,
    });
  } catch (error) {
    return api.error(
      "Failed to fetch client suggestions",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_suggestions_create" },
  validation: {
    body: CreateFromSuggestionsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("omni_clients_suggestions_create", requestId);

  try {
    // Create contacts from suggestions
    const result = await ContactSuggestionService.createContactsFromSuggestions(
      userId,
      validated.body.suggestionIds,
    );

    if (!result.success && result.createdCount === 0) {
      return api.validationError("Failed to create clients", { errors: result.errors });
    }

    return api.success({
      success: result.success,
      createdCount: result.createdCount,
      message: `Successfully created ${result.createdCount} OmniClient${result.createdCount === 1 ? "" : "s"}`,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    return api.error(
      "Failed to create clients from suggestions",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
