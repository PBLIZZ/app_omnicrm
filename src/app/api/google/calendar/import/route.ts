import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { CalendarImportService } from "@/server/services/calendar-import.service";

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

    // Delegate to service layer
    const result = await CalendarImportService.importCalendars(userId, validation.data);

    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/google/calendar/import error:", error);
    return NextResponse.json({ error: "Calendar import failed" }, { status: 500 });
  }
}
