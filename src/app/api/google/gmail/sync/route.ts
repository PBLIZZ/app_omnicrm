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
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GmailSyncService } from "@/server/services/gmail-sync.service";
import { z } from "zod";

// Request schema: incremental sync from last successful raw_event by default
const syncSchema = z.object({
  incremental: z.boolean().optional().default(true),
  // Optional overlap to avoid missing messages around boundary
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
  // Fallback lookback window when no last sync exists
  daysBack: z.number().min(1).max(365).optional(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_sync" },
  validation: { body: syncSchema },
})(async ({ userId, validated, requestId }) => {
  const { incremental, overlapHours, daysBack } = validated.body;

  try {
    const result = await GmailSyncService.syncGmail(userId, {
      incremental,
      overlapHours,
      daysBack,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "Gmail not connected") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to sync Gmail messages" },
      { status: 500 }
    );
  }
});