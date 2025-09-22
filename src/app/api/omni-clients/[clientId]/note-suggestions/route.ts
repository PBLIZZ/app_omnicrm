import { ContactAIActionsService } from "@/server/services/contact-ai-actions.service";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
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

export async function POST(
  _: NextRequest,
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

    // Use existing service but present as OmniClient note suggestions
    const noteSuggestions = await ContactAIActionsService.generateNoteSuggestions(userId, clientId);

    return NextResponse.json({ suggestions: noteSuggestions });
  } catch (error) {
    console.error("POST /api/omni-clients/[clientId]/note-suggestions error:", error);
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
}
