/**
 * POST /api/google/gmail/sync-blocking — Blocking Gmail sync with real-time progress
 *
 * This endpoint provides a complete synchronous Gmail sync experience:
 * - Creates sync session for tracking progress
 * - Imports Gmail messages into raw_events
 * - Immediately processes normalization jobs
 * - Updates session progress in real-time
 * - Returns complete results when finished
 *
 * Key Features:
 * - Blocking operation with progress tracking
 * - Session-based progress updates
 * - Immediate job processing (no background queuing)
 * - Error resilience with partial failure handling
 * - Cache invalidation triggers
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GmailSyncBlockingService } from "@/server/services/gmail-sync-blocking.service";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { ApiEnvelope } from "@/lib/utils/type-guards";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate request body
    const body: unknown = await request.json();

    // Execute blocking sync using service
    const result = await GmailSyncBlockingService.executeBlockingSync(userId, body);

    const envelope: ApiEnvelope<typeof result> = { ok: true, data: result };
    return NextResponse.json(envelope);
  } catch (error) {
    console.error("POST /api/google/gmail/sync-blocking error:", error);

    await logger.error(
      "Gmail sync blocking failed",
      {
        operation: "gmail_sync_blocking",
        additionalData: {
          errorType: error instanceof Error ? error.constructor.name : typeof error,
        },
      },
      ensureError(error),
    );

    // Handle validation errors
    if (error instanceof Error && error.name === "ZodError") {
      const envelope: ApiEnvelope = {
        ok: false,
        error: "Invalid request parameters",
        details: error.message,
      };
      return NextResponse.json(envelope, { status: 400 });
    }

    const envelope: ApiEnvelope = { ok: false, error: "Gmail sync failed" };
    return NextResponse.json(envelope, { status: 500 });
  }
}
