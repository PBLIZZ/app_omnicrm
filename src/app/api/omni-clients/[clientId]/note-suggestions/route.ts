import { ContactAIActionsService } from "@/server/services/contact-ai-actions.service";
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

/**
 * OmniClient Note Suggestions endpoint
 *
 * Generates AI note suggestions for a specific client using existing ContactAIActionsService
 * UI boundary transformation: presents "OmniClient" while using "contacts" backend
 */

const ParamsSchema = z.object({
  clientId: z.string(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_note_suggestions" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  try {
    const { clientId } = validated.params;

    // Use existing service but present as OmniClient note suggestions
    const noteSuggestions = await ContactAIActionsService.generateNoteSuggestions(userId, clientId);

    return NextResponse.json({ suggestions: noteSuggestions });
  } catch (error) {
    await logger.error(
      "OmniClient note suggestions generation failed",
      {
        operation: "api.omni_clients.note_suggestions",
        additionalData: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      ensureError(error),
    );

    if (error instanceof Error && error.message === "Contact not found") {
      return NextResponse.json({ error: "OmniClient not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to generate note suggestions for OmniClient" }, { status: 500 });
  }
});
