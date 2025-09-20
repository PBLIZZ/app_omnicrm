import { ContactAIActionsService } from "@/server/services/contact-ai-actions.service";
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

/**
 * OmniClient AI Insights endpoint
 *
 * Generates AI insights for a specific client using existing ContactAIActionsService
 * UI boundary transformation: presents "OmniClient" while using "contacts" backend
 */

const ParamsSchema = z.object({
  clientId: z.string(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_clients_ai_insights" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  try {
    const { clientId } = validated.params;

    // Use existing service but present as OmniClient insights
    const insights = await ContactAIActionsService.askAIAboutContact(userId, clientId);

    // Transform response to match OmniClient terminology (minimal changes needed)
    return NextResponse.json(insights);
  } catch (error) {
    await logger.error(
      "OmniClient AI insights generation failed",
      {
        operation: "api.omni_clients.ai_insights",
        additionalData: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      ensureError(error),
    );

    if (error instanceof Error && error.message === "Contact not found") {
      return NextResponse.json({ error: "OmniClient not found" }, { status: 404 });
    }

    return NextResponse.json({ error: "Failed to generate AI insights for OmniClient" }, { status: 500 });
  }
});
