import { ContactAIActionsService } from "@/server/services/contact-ai-actions.service";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
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

export async function POST(
  _request: NextRequest,
  { params }: { params: { clientId: string } }
): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    const validation = ParamsSchema.safeParse(params);
    if (!validation.success) {
      return NextResponse.json({
        error: "Invalid client ID",
        details: validation.error.issues
      }, { status: 400 });
    }

    const { clientId } = validation.data;

    // Use existing service but present as OmniClient insights
    const insights = await ContactAIActionsService.askAIAboutContact(userId, clientId);

    // Transform response to match OmniClient terminology (minimal changes needed)
    return NextResponse.json(insights);
  } catch (error) {
    console.error("POST /api/omni-clients/[clientId]/ai-insights error:", error);
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
}
