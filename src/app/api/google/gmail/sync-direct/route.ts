/**
 * POST /api/google/gmail/sync-direct — Direct Gmail sync without background jobs
 *
 * This endpoint directly processes Gmail messages into raw_events without using
 * the job queue system. It's meant for initial sync where the user explicitly
 * clicks "Start Sync" and expects immediate processing.
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    // Validate request body
    const body: unknown = await request.json();
    const validatedBody = syncDirectSchema.parse(body);
    const { incremental, overlapHours, daysBack } = validatedBody;
    const result = await GmailSyncService.syncGmailDirect(userId, {
      incremental,
      overlapHours,
      daysBack: daysBack ?? undefined,
      direct: true,
    });

    return NextResponse.json({
      message: `Successfully imported ${result.stats.inserted} emails from the last ${daysBack || 365} days`,
      stats: result.stats,
    });
  } catch (error) {
    console.error("POST /api/google/gmail/sync-direct error:", error);
    if (error instanceof Error && error.message === "Gmail not connected") {
      return NextResponse.json({ error: "Gmail not connected" }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to sync Gmail messages" },
      { status: 500 }
    );
  }
}
