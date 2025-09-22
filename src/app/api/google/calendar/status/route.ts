/**
 * GET /api/google/calendar/status — DEPRECATED Calendar connection status
 *
 * ⚠️ DEPRECATED: This endpoint is deprecated. Use /api/google/status instead.
 *
 * This endpoint will be removed in a future version. The unified endpoint
 * provides the same functionality with improved performance and consistency.
 *
 * Migration guide:
 * - Replace calls to /api/google/calendar/status with /api/google/status
 * - Access Calendar data via response.services.calendar instead of root level
 */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { rawEvents, userIntegrations } from "@/server/db/schema";
import { desc, eq, and, sql } from "drizzle-orm";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { google } from "googleapis";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
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

    if (!integration[0]) {
      return NextResponse.json({
        isConnected: false,
        reason: "no_integration",
      });
    }

    // Check if token is expired
    const now = new Date();
    const isExpired = integration[0].expiryDate && integration[0].expiryDate < now;

    // If token is expired but we have a refresh token, attempt to refresh automatically
    if (isExpired && integration[0].refreshToken) {
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

          return NextResponse.json({
            isConnected: !stillExpired,
            reason: stillExpired ? "token_expired" : "connected",
            expiryDate: refreshedIntegration[0].expiryDate?.toISOString() ?? null,
            hasRefreshToken: !!refreshedIntegration[0].refreshToken,
            autoRefreshed: !stillExpired, // Indicate that auto-refresh was attempted
            upcomingEventsCount,
          });
        }
      } catch (refreshError) {
        // If refresh fails, fall back to showing expired status
        console.warn("Automatic Calendar token refresh failed:", refreshError);
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

    // Add upcoming events count for connected users
    let upcomingEventsCount = 0;
    if (!isExpired) {
      try {
        const auth = await GoogleCalendarService.getAuth(userId);
        const calendar = google.calendar({ version: "v3", auth });

        const timeMin = new Date().toISOString();
        const timeMax = new Date();
        timeMax.setDate(timeMax.getDate() + 30); // 30 days ahead

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

    return NextResponse.json({
      isConnected: !isExpired,
      reason: isExpired ? "token_expired" : "connected",
      expiryDate: integration[0].expiryDate?.toISOString() ?? null,
      hasRefreshToken: !!integration[0].refreshToken,
      lastSync: lastCalendar?.createdAt?.toISOString() ?? null,
      importedCount: importedCount?.count ?? 0,
      upcomingEventsCount,
    });
  } catch (error) {
    console.error("GET /api/google/calendar/status error:", error);
    console.error("Failed to check calendar status:", error);
    return NextResponse.json({ error: "Failed to check calendar status" }, { status: 500 });
  }
}
