/** GET /api/google/gmail/labels — fetch Gmail labels for authenticated user */

import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GmailLabelsService } from "@/server/services/gmail-labels.service";
import { logger } from "@/lib/observability";
import { ApiEnvelope } from "@/lib/utils/type-guards";

export async function GET(_: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Delegate to service layer
    const result = await GmailLabelsService.getUserLabels(userId);

    const envelope: ApiEnvelope<typeof result> = { ok: true, data: result };
    return NextResponse.json(envelope);
  } catch (error: unknown) {
    console.error("GET /api/google/gmail/labels error:", error);

    // Try to get userId for logging, but don't fail if we can't
    let userIdForLogging = "unknown";
    try {
      const userId = await getServerUserId();
      userIdForLogging = userId.slice(0, 8) + "...";
    } catch (_) {
      // Ignore auth errors in error handler
    }

    await logger.error(
      "Gmail labels fetch failed",
      {
        operation: "api.google.gmail.labels",
        additionalData: {
          userId: userIdForLogging,
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      error instanceof Error ? error : undefined,
    );

    if (error instanceof Error) {
      // Handle specific Google API errors
      if (error.message.includes("insufficient authentication scopes")) {
        const envelope: ApiEnvelope = {
          ok: false,
          error: "Insufficient Gmail permissions. Please reconnect your Gmail account.",
        };
        return NextResponse.json(envelope, { status: 403 });
      }

      if (
        error.message.includes("invalid_grant") ||
        error.message.includes("Token has been expired or revoked")
      ) {
        const envelope: ApiEnvelope = {
          ok: false,
          error: "Gmail access token has expired. Please reconnect your account.",
        };
        return NextResponse.json(envelope, { status: 401 });
      }
    }

    const envelope: ApiEnvelope = { ok: false, error: "Failed to fetch Gmail labels" };
    return NextResponse.json(envelope, { status: 500 });
  }
}
