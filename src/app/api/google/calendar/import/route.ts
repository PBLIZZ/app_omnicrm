import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { enqueue } from "@/server/jobs/enqueue";
import { randomUUID } from "node:crypto";

const BodySchema = z.object({
  calendarIds: z.array(z.string().min(1)).optional(),
  daysPast: z.number().int().min(0).max(365).optional(),
  daysFuture: z.number().int().min(0).max(365).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
    }

    const validation = BodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        error: "Validation failed",
        details: validation.error.issues
      }, { status: 400 });
    }

    const daysPast = validation.data?.daysPast ?? 365; // default: last 365 days
    const daysFuture = validation.data?.daysFuture ?? 90; // default: next 90 days
    const batchId = randomUUID();
    const result = await GoogleCalendarService.syncUserCalendars(userId, {
      daysPast,
      daysFuture,
      batchId,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error ?? "Calendar import failed" }, { status: 400 });
    }

    // Enqueue normalization and downstream jobs for the imported raw events
    try {
      await enqueue("normalize", { batchId, provider: "google_calendar" }, userId, batchId);
      await enqueue("extract_contacts", { batchId }, userId, batchId);
      await enqueue("embed", { batchId }, userId, batchId);
    } catch {
      // Non-fatal for initial import; raw events written successfully
    }

    return NextResponse.json({
      message: "Calendar import completed",
      syncedEvents: result.syncedEvents,
      batchId,
    });
  } catch (error) {
    console.error("POST /api/google/calendar/import error:", error);
    return NextResponse.json({ error: "Calendar import failed" }, { status: 500 });
  }
}
