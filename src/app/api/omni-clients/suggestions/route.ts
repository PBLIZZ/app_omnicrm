import { z } from "zod";
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { apiError, API_ERROR_CODES } from "@/server/api/response";
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

  try {
    // Get contact suggestions from calendar attendees
    const suggestions = await ContactSuggestionService.getContactSuggestions(userId);

    // Transform ContactSuggestion[] to match OmniClients terminology
    // (The types are already aligned, so no transformation needed)
    return NextResponse.json({
      suggestions,
    });
  } catch (error) {
    return apiError(
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

  try {
    // Create contacts from suggestions
    const result = await ContactSuggestionService.createContactsFromSuggestions(
      userId,
      validated.body.suggestionIds,
    );

    if (!result.success && result.createdCount === 0) {
      return apiError(
        API_ERROR_CODES.VALIDATION_ERROR,
        "Failed to create clients",
        400,
        requestId,
        { errors: result.errors }
      );
    }

    return NextResponse.json({
      success: result.success,
      createdCount: result.createdCount,
      message: `Successfully created ${result.createdCount} OmniClient${result.createdCount === 1 ? "" : "s"}`,
      errors: result.errors.length > 0 ? result.errors : undefined,
    });
  } catch (error) {
    return apiError(
      "Failed to create clients from suggestions",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
