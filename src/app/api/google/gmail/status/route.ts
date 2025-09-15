import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { eq, and } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_status" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("gmail_status", requestId);
  try {
    const db = await getDb();

    // Check if user has Gmail integration (check both gmail-specific and unified)
    const [gmailIntegration, unifiedIntegration] = await Promise.all([
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "gmail"),
          ),
        )
        .limit(1),
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "unified"),
          ),
        )
        .limit(1),
    ]);

    // Use unified integration if available, otherwise use gmail-specific
    const integration = unifiedIntegration[0] ?? gmailIntegration[0];

    if (!integration) {
      return api.success({
        isConnected: false,
        reason: "no_integration",
      });
    }

    // Check if token is expired
    const now = new Date();
    const isExpired = integration.expiryDate && integration.expiryDate < now;

    // If token is expired but we have a refresh token, attempt to refresh automatically
    if (isExpired && integration.refreshToken) {
      try {
        // Attempt automatic token refresh using the GoogleGmailService
        await GoogleGmailService.getAuth(userId);

        // Re-check the integration after refresh attempt
        const refreshedIntegration = await db
          .select()
          .from(userIntegrations)
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google"),
              eq(userIntegrations.service, integration.service),
            ),
          )
          .limit(1);

        if (refreshedIntegration[0]) {
          const stillExpired =
            refreshedIntegration[0].expiryDate && refreshedIntegration[0].expiryDate < now;

          return api.success({
            isConnected: !stillExpired,
            reason: stillExpired ? "token_expired" : "connected",
            expiryDate: refreshedIntegration[0].expiryDate?.toISOString() ?? null,
            hasRefreshToken: !!refreshedIntegration[0].refreshToken,
            autoRefreshed: !stillExpired, // Indicate that auto-refresh was attempted
            service: integration.service,
          });
        }
      } catch (refreshError) {
        // If refresh fails, fall back to showing expired status
        console.warn("Automatic Gmail token refresh failed:", refreshError);
      }
    }

    return api.success({
      isConnected: !isExpired,
      reason: isExpired ? "token_expired" : "connected",
      expiryDate: integration.expiryDate?.toISOString() ?? null,
      hasRefreshToken: !!integration.refreshToken,
      service: integration.service, // Indicate which integration type is being used
    });
  } catch (error) {
    return api.error(
      "Failed to check Gmail status",
      "DATABASE_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
