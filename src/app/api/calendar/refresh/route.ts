import { ok, err } from "@/lib/api/http";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { google } from "googleapis";
import { encryptString, decryptString, isEncrypted } from "@/lib/crypto";

// POST: Force refresh Google Calendar tokens
export async function POST(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error) {
    console.error("Calendar refresh - auth error:", error);
    return err(401, "unauthorized", {
      details: error instanceof Error ? error.message : "Authentication failed",
    });
  }

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
      return err(404, "not_connected", {
        message: "Google Calendar not connected",
      });
    }

    const row = rows[0];

    // Decrypt refresh token
    const refreshToken = row["refresh_token"]
      ? isEncrypted(row["refresh_token"] as string)
        ? decryptString(row["refresh_token"] as string)
        : (row["refresh_token"] as string)
      : null;

    if (!refreshToken) {
      return err(400, "no_refresh_token", {
        message: "No refresh token available. Please reconnect Google Calendar.",
      });
    }

    // Create OAuth2 client and refresh tokens
    const oauth2 = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"]!,
      process.env["GOOGLE_CLIENT_SECRET"]!,
      process.env["GOOGLE_CALENDAR_REDIRECT_URI"]!,
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
        SET access_token = ${encryptString(credentials.access_token!)},
            refresh_token = ${credentials.refresh_token ? encryptString(credentials.refresh_token) : row["refresh_token"]},
            expiry_date = ${credentials.expiry_date ? new Date(credentials.expiry_date) : null},
            updated_at = ${new Date()}
        WHERE user_id = ${userId}
        AND provider = 'google'
        AND service = 'calendar'
      `);

      return ok({
        success: true,
        message: "Tokens refreshed successfully",
        expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
      });
    } catch (refreshError: unknown) {
      console.error("Token refresh failed:", refreshError);
      const errorObj = refreshError as { message?: string };

      // If refresh fails with invalid_grant, the refresh token is expired
      if (errorObj.message?.includes("invalid_grant")) {
        return err(401, "refresh_token_expired", {
          message: "Your Google authorization has expired. Please reconnect Google Calendar.",
        });
      }

      return err(500, "refresh_failed", {
        message: errorObj.message ?? "Failed to refresh tokens",
      });
    }
  } catch (error) {
    console.error("Calendar refresh - unexpected error:", error);
    return err(500, "internal_error", {
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    });
  }
}
