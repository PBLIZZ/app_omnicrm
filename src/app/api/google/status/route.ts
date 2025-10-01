/**
 * GET /api/google/status
 * Returns connection status for Gmail and Calendar
 * Automatically refreshes expired tokens when status is checked
 */
import { getAuthUserId } from "@/lib/auth-simple";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getGoogleClients } from "@/server/google/client";

export async function GET(): Promise<Response> {
  try {
    // 1. Get authenticated user
    const userId = await getAuthUserId();

    // 2. Query database for integrations
    const db = await getDb();
    const integrations = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google")
        )
      );

    // 3. Find Gmail and Calendar integrations
    const gmailIntegration = integrations.find((i): boolean => i.service === "gmail");
    const calendarIntegration = integrations.find((i): boolean => i.service === "calendar");

    // 4. Check if tokens are expired and trigger refresh if needed
    const now = new Date();
    const gmailExpired = gmailIntegration?.expiryDate && gmailIntegration.expiryDate <= now;
    const calendarExpired = calendarIntegration?.expiryDate && calendarIntegration.expiryDate <= now;

    // If either service has expired tokens, trigger automatic refresh by initializing the Google client
    // The client's auth.on("tokens") listener will automatically save refreshed tokens
    if ((gmailExpired || calendarExpired) && (gmailIntegration || calendarIntegration)) {
      try {
        await getGoogleClients(userId);
        // Re-fetch integrations after refresh
        const refreshedIntegrations = await db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google")
            )
          );
        const refreshedGmail = refreshedIntegrations.find((i): boolean => i.service === "gmail");
        const refreshedCalendar = refreshedIntegrations.find((i): boolean => i.service === "calendar");
        
        // Use refreshed data
        const isGmailConnected = !!(refreshedGmail && refreshedGmail.accessToken);
        const isCalendarConnected = !!(refreshedCalendar && refreshedCalendar.accessToken);

        return Response.json({
          services: {
            gmail: {
              connected: isGmailConnected,
              expiryDate: refreshedGmail?.expiryDate?.toISOString() || null,
            },
            calendar: {
              connected: isCalendarConnected,
              expiryDate: refreshedCalendar?.expiryDate?.toISOString() || null,
            },
          },
        });
      } catch (refreshError) {
        console.error("[Google Status] Token refresh failed:", refreshError);
        // Fall through to return current status even if refresh failed
      }
    }

    // Return current status (either no refresh needed or refresh failed)
    const isGmailConnected = !!(
      gmailIntegration &&
      gmailIntegration.accessToken &&
      (!gmailIntegration.expiryDate || gmailIntegration.expiryDate > now)
    );
    const isCalendarConnected = !!(
      calendarIntegration &&
      calendarIntegration.accessToken &&
      (!calendarIntegration.expiryDate || calendarIntegration.expiryDate > now)
    );

    // 5. Return status
    return Response.json({
      services: {
        gmail: {
          connected: isGmailConnected,
          expiryDate: gmailIntegration?.expiryDate?.toISOString() || null,
        },
        calendar: {
          connected: isCalendarConnected,
          expiryDate: calendarIntegration?.expiryDate?.toISOString() || null,
        },
      },
    });
  } catch (error) {
    console.error("[Google Status] Error:", error);
    return Response.json(
      { error: "Failed to get status" },
      { status: 500 }
    );
  }
}
