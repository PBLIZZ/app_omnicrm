import { z } from "zod";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { enqueue } from "@/server/jobs/enqueue";
import { randomUUID } from "node:crypto";

const BodySchema = z.object({
  calendarIds: z.array(z.string().min(1)).optional(),
  daysPast: z.number().int().min(0).max(365).optional(),
  daysFuture: z.number().int().min(0).max(365).optional(),
});

export const POST = createRouteHandler({
  auth: true,
  validation: { body: BodySchema },
  rateLimit: { operation: "google_calendar_import" },
})(async ({ userId, requestId, validated: { body } }) => {
  const api = new ApiResponseBuilder("google.calendar.import", requestId);
  try {
    const daysPast = body?.daysPast ?? 365; // default: last 365 days
    const daysFuture = body?.daysFuture ?? 90; // default: next 90 days
    const batchId = randomUUID();
    const result = await GoogleCalendarService.syncUserCalendars(userId, {
      daysPast,
      daysFuture,
      batchId,
    });

    if (!result.success) {
      return api.error(result.error ?? "Calendar import failed", "INTEGRATION_ERROR");
    }

    // Enqueue normalization and downstream jobs for the imported raw events
    try {
      await enqueue("normalize", { batchId, provider: "google_calendar" }, userId, batchId);
      await enqueue("extract_contacts", { batchId }, userId, batchId);
      await enqueue("embed", { batchId }, userId, batchId);
    } catch {
      // Non-fatal for initial import; raw events written successfully
    }

    return api.success({
      message: "Calendar import completed",
      syncedEvents: result.syncedEvents,
      batchId,
    });
  } catch (error) {
    return api.error("Calendar import failed", "INTERNAL_ERROR", undefined, error as Error);
  }
});
