import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
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

    if (!integration[0]) {
      return api.success({
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

          return api.success({
            isConnected: !stillExpired,
            reason: stillExpired ? "token_expired" : "connected",
            expiryDate: refreshedIntegration[0].expiryDate?.toISOString() || null,
            hasRefreshToken: !!refreshedIntegration[0].refreshToken,
            autoRefreshed: !stillExpired, // Indicate that auto-refresh was attempted
          });
        }
      } catch (refreshError) {
        // If refresh fails, fall back to showing expired status
        console.warn("Automatic token refresh failed:", refreshError);
      }
    }

    return api.success({
      isConnected: !isExpired,
      reason: isExpired ? "token_expired" : "connected",
      expiryDate: integration[0].expiryDate?.toISOString() || null,
      hasRefreshToken: !!integration[0].refreshToken,
    });
  } catch (error) {
    return api.error(
      "Failed to check calendar status",
      "DATABASE_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
