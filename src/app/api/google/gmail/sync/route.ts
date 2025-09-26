/**
 * POST /api/google/gmail/sync — Consolidated Gmail sync endpoint
 *
 * This endpoint directly processes Gmail messages into raw_events with optimal
 * performance. Replaces the scattered sync endpoints with a single, focused route.
 *
 * Key Features:
 * - Direct sync without background jobs (for immediate processing)
 * - Incremental sync from last successful raw_event
 * - Parallel processing for high throughput
 * - Automatic normalization job enqueuing
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GmailSyncService } from "@/server/services/gmail-sync.service";
import { z } from "zod";
import { ApiEnvelope } from "@/lib/utils/type-guards";

// Request schema: incremental sync from last successful raw_event by default
const syncSchema = z.object({
  incremental: z.boolean().optional().default(true),
  // Optional overlap to avoid missing messages around boundary
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
  // Fallback lookback window when no last sync exists
  daysBack: z.number().min(1).max(365).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate request body
    const body: unknown = await request.json();
    const validatedBody = syncSchema.parse(body);
    const { incremental, overlapHours, daysBack } = validatedBody;

    const result = await GmailSyncService.syncGmail(userId, {
      incremental,
      overlapHours,
      daysBack: daysBack ?? undefined,
    });

    const envelope: ApiEnvelope<typeof result> = { ok: true, data: result };
    return NextResponse.json(envelope);
  } catch (error) {
    console.error("POST /api/google/gmail/sync error:", error);

    if (error instanceof Error && error.message === "Gmail not connected") {
      const envelope: ApiEnvelope = { ok: false, error: "Gmail not connected" };
      return NextResponse.json(envelope, { status: 400 });
    }

    const envelope: ApiEnvelope = { ok: false, error: "Failed to sync Gmail messages" };
    return NextResponse.json(envelope, { status: 500 });
  }
}