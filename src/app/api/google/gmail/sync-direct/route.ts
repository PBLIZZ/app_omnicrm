/**
 * POST /api/google/gmail/sync-direct — Direct Gmail sync without background jobs
 *
 * This endpoint directly processes Gmail messages into raw_events without using
 * the job queue system. It's meant for initial sync where the user explicitly
 * clicks "Start Sync" and expects immediate processing.
 */
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { GmailSyncService } from "@/server/services/gmail-sync.service";
import { z } from "zod";

// Request schema: incremental sync from last successful raw_event by default
const syncDirectSchema = z.object({
  incremental: z.boolean().optional().default(true),
  // Optional overlap to avoid missing messages around boundary
  overlapHours: z.number().int().min(0).max(72).optional().default(0),
  // Fallback lookback window when no last sync exists (e.g., before initial import)
  daysBack: z.number().min(1).max(365).optional(),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_sync_direct" },
  validation: { body: syncDirectSchema },
})(async ({ userId, validated, requestId }) => {
  const { incremental, overlapHours, daysBack } = validated.body;

  try {
    const result = await GmailSyncService.syncGmailDirect(userId, {
      incremental,
      overlapHours,
      daysBack,
      direct: true,
    });

    return NextResponse.json({
      message: `Successfully imported ${result.stats.inserted} emails from the last ${daysBack || 365} days`,
      stats: result.stats,
    });
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
