import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { google } from "googleapis";
import { encryptString, decryptString, isEncrypted } from "@/server/utils/crypto";
import { ensureError } from "@/lib/utils/error-handler";

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_refresh" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("calendar_refresh", requestId);
  try {
    const db = await getDb();

    // Get the calendar integration
    const integration = await db.execute(sql`
      SELECT * FROM user_integrations
      WHERE user_id = ${userId}
      AND provider = 'google'
      AND service = 'calendar'
      LIMIT 1
    `);

    const rows = (integration as unknown as { rows: Array<Record<string, unknown>> }).rows;

    if (!rows[0]) {
      return api.error("Google Calendar not connected", "NOT_FOUND");
    }

    const row = rows[0];

    // Decrypt refresh token
    const refreshTokenValue = row["refresh_token"] as string | null;
    const refreshToken = refreshTokenValue
      ? isEncrypted(refreshTokenValue)
        ? decryptString(refreshTokenValue)
        : refreshTokenValue
      : null;

    if (!refreshToken) {
      return api.error(
        "No refresh token available. Please reconnect Google Calendar.",
        "VALIDATION_ERROR",
      );
    }

    // Create OAuth2 client and refresh tokens
    if (
      !process.env["GOOGLE_CLIENT_ID"] ||
      !process.env["GOOGLE_CLIENT_SECRET"] ||
      !process.env["GOOGLE_CALENDAR_REDIRECT_URI"]
    ) {
      return api.error("Google OAuth configuration is incomplete", "INTERNAL_ERROR");
    }

    const oauth2 = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      process.env["GOOGLE_CALENDAR_REDIRECT_URI"],
    );

    oauth2.setCredentials({
      refresh_token: refreshToken,
    });

    try {
      // Force token refresh
      const { credentials } = await oauth2.refreshAccessToken();

      // Update the database with new tokens
      await db.execute(sql`
        UPDATE user_integrations
        SET access_token = ${credentials.access_token ? encryptString(credentials.access_token) : null},
            refresh_token = ${credentials.refresh_token ? encryptString(credentials.refresh_token) : row["refresh_token"]},
            expiry_date = ${credentials.expiry_date ? new Date(credentials.expiry_date) : null},
            updated_at = ${new Date()}
        WHERE user_id = ${userId}
        AND provider = 'google'
        AND service = 'calendar'
      `);

      return api.success({
        success: true,
        message: "Tokens refreshed successfully",
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
      });
    } catch (refreshError: unknown) {
      const errorObj = refreshError as { message?: string };

      // If refresh fails with invalid_grant, the refresh token is expired
      if (errorObj.message?.includes("invalid_grant")) {
        return api.error(
          "Your Google authorization has expired. Please reconnect Google Calendar.",
          "UNAUTHORIZED",
          undefined,
          refreshError instanceof Error ? refreshError : undefined,
        );
      }

      return api.error(
        errorObj.message ?? "Failed to refresh tokens",
        "INTEGRATION_ERROR",
        undefined,
        refreshError instanceof Error ? refreshError : undefined,
      );
    }
  } catch (error) {
    return api.error("Calendar refresh failed", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
