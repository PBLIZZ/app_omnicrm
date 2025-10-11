import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { enqueue } from "@/server/jobs/enqueue";
import { randomUUID } from "node:crypto";

export interface CalendarImportRequest {
  calendarIds?: string[];
  daysPast?: number;
  daysFuture?: number;
}

export interface CalendarImportResponse {
  message: string;
  syncedEvents: number;
  batchId: string;
}

export class CalendarImportService {
  /**
   * Execute calendar import with background job processing
   *
   * @param userId - The authenticated user ID
   * @param request - Calendar import parameters
   * @returns Promise<CalendarImportResponse> - Import results
   */
  static async importCalendars(
    userId: string,
    request: CalendarImportRequest,
  ): Promise<CalendarImportResponse> {
    // Apply default values
    const daysPast = request.daysPast ?? 365; // default: last 365 days
    const daysFuture = request.daysFuture ?? 90; // default: next 90 days
    const batchId = randomUUID();

    // Execute calendar sync
    const result = await GoogleCalendarService.syncUserCalendars(userId, {
      daysPast,
      daysFuture,
      batchId,
    });

    if (!result.success) {
      throw new Error(result.error ?? "Calendar import failed");
    }

    // Enqueue background processing jobs
    await this.enqueueProcessingJobs(userId, batchId);

    return {
      message: "Calendar import completed",
      syncedEvents: result.syncedEvents,
      batchId,
    };
  }

  /**
   * Enqueue downstream processing jobs for imported calendar data
   *
   * @param userId - The user ID
   * @param batchId - The batch ID for tracking related jobs
   */
  private static async enqueueProcessingJobs(userId: string, batchId: string): Promise<void> {
    try {
      // Enqueue normalization job
      await enqueue("normalize", { batchId, provider: "google_calendar" }, userId, batchId);

      // Enqueue contact extraction job
      await enqueue("extract_contacts", { batchId }, userId, batchId);

      // Enqueue embedding generation job
      await enqueue("embed", { batchId }, userId, batchId);
    } catch (error) {
      // Job enqueuing failures are non-fatal for the initial import
      // Raw events have been successfully written to the database
      console.warn("Failed to enqueue some processing jobs:", error);
    }
  }
}