import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { rawEvents, userIntegrations } from "@/server/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { google } from "googleapis";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_status" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("calendar_status", requestId);
  try {
    const db = await getDb();

    // Check if user has Google Calendar integration
    const integration = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "calendar"),
        ),
      )
      .limit(1);

    // Debug info removed for production

    if (!integration[0]) {
      return api.success({
        isConnected: false,
        reason: "no_integration",
      });
    }

    // Check if token is expired
    const now = new Date();
    const isExpired = integration[0].expiryDate && integration[0].expiryDate < now;

    // Token expiry check debug info removed for production

    // If token is expired but we have a refresh token, attempt to refresh automatically
    if (isExpired && integration[0].refreshToken) {
      // Automatic token refresh attempt - informational
      try {
        // Attempt automatic token refresh using the GoogleCalendarService
        await GoogleCalendarService.getAuth(userId);

        // Re-check the integration after refresh attempt
        const refreshedIntegration = await db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google"),
              eq(userIntegrations.service, "calendar"),
            ),
          )
          .limit(1);

        if (refreshedIntegration[0]) {
          const stillExpired =
            refreshedIntegration[0].expiryDate && refreshedIntegration[0].expiryDate < now;

          // Add upcoming events count for refreshed tokens
          let upcomingEventsCount = 0;
          if (!stillExpired) {
            try {
              const auth = await GoogleCalendarService.getAuth(userId);
              const calendar = google.calendar({ version: "v3", auth });

              const timeMin = new Date().toISOString();
              const timeMax = new Date();
              timeMax.setDate(timeMax.getDate() + 30);

              const response = await calendar.events.list({
                calendarId: "primary",
                timeMin,
                timeMax: timeMax.toISOString(),
                singleEvents: true,
                orderBy: "startTime",
                maxResults: 50,
              });

              upcomingEventsCount = response.data.items?.length ?? 0;
            } catch {
              // If preview fails after refresh, ignore
            }
          }

          return api.success({
            isConnected: !stillExpired,
            reason: stillExpired ? "token_expired" : "connected",
            expiryDate: refreshedIntegration[0].expiryDate?.toISOString() ?? null,
            hasRefreshToken: !!refreshedIntegration[0].refreshToken,
            autoRefreshed: !stillExpired, // Indicate that auto-refresh was attempted
            upcomingEventsCount, // Added from preview route consolidation
          });
        }
      } catch (refreshError) {
        // If refresh fails, fall back to showing expired status
        console.warn("Automatic token refresh failed:", refreshError);
      }
    }

    // Get last successful raw_events insert and total imported for Google Calendar
    const [lastCalendar] = await db
      .select({ createdAt: rawEvents.createdAt })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "google_calendar")))
      .orderBy(desc(rawEvents.createdAt))
      .limit(1);
    const [importedCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "google_calendar")))
      .limit(1);

    // Add upcoming events count (consolidated from preview route)
    let upcomingEventsCount = 0;
    if (!isExpired) {
      try {
        const auth = await GoogleCalendarService.getAuth(userId);
        const calendar = google.calendar({ version: "v3", auth });

        const timeMin = new Date().toISOString();
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30); // 30 days ahead only

        const response = await calendar.events.list({
          calendarId: "primary",
          timeMin,
          timeMax: timeMax.toISOString(),
          singleEvents: true,
          orderBy: "startTime",
          maxResults: 50,
        });

        upcomingEventsCount = response.data.items?.length ?? 0;
      } catch (previewError) {
        // If preview fails, log but don't fail the status check
        console.warn("Preview events failed:", previewError);
      }
    }

    const result = {
      isConnected: !isExpired,
      reason: isExpired ? "token_expired" : "connected",
      expiryDate: integration[0].expiryDate?.toISOString() ?? null,
      hasRefreshToken: !!integration[0].refreshToken,
      lastSync: lastCalendar?.createdAt?.toISOString() ?? null,
      importedCount: importedCount?.count ?? 0,
      upcomingEventsCount, // Added from preview route consolidation
    };

    // Final result debug info removed for production

    return api.success(result);
  } catch (error) {
    return api.error(
      "Failed to check calendar status",
      "DATABASE_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
