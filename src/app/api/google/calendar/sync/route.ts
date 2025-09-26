/**
 * POST /api/google/calendar/sync — Consolidated Calendar sync endpoint
 */
import { NextRequest, NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";
import { GoogleCalendarSyncService } from "@/server/services/google-calendar-sync.service";
import { z } from "zod";

// Request schema: configurable sync parameters
const syncSchema = z.object({
  // Days to sync backwards from today
  daysPast: z.number().int().min(1).max(730).optional().default(180), // 6 months default
  // Days to sync forwards from today
  daysFuture: z.number().int().min(1).max(730).optional().default(365), // 1 year default
  // Maximum events to sync per calendar
  maxResults: z.number().int().min(10).max(2500).optional().default(2500),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_calendar_sync" },
  validation: { body: syncSchema },
})(async ({ userId, validated }) => {
  const syncResult = await GoogleCalendarSyncService.syncCalendar(userId, validated.body);

  if (!syncResult.ok) {
    return NextResponse.json({ error: syncResult.error }, { status: syncResult.status });
  }

  return NextResponse.json({
    ok: true,
    data: {
      message: syncResult.data.message,
      stats: syncResult.data.stats,
    },
  });
});