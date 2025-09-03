import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { google } from "googleapis";
import { encryptString, decryptString, isEncrypted } from "@/lib/crypto";

// POST: Force refresh Google Calendar tokens
export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error) {
    console.error("Calendar refresh - auth error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "unauthorized",
        details: error instanceof Error ? error.message : "Authentication failed",
      },
      { status: 401 }
    );
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

    const rows = (integration as unknown as { rows: any[] }).rows;
    
    if (!rows[0]) {
      return NextResponse.json({
        ok: false,
        error: "not_connected",
        message: "Google Calendar not connected",
      }, { status: 404 });
    }

    const row = rows[0];
    
    // Decrypt refresh token
    const refreshToken = row.refresh_token ? 
      (isEncrypted(row.refresh_token) ? decryptString(row.refresh_token) : row.refresh_token) : 
      null;

    if (!refreshToken) {
      return NextResponse.json({
        ok: false,
        error: "no_refresh_token",
        message: "No refresh token available. Please reconnect Google Calendar.",
      }, { status: 400 });
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
      
      console.log("Calendar refresh - new tokens received:", {
        hasAccessToken: !!credentials.access_token,
        hasRefreshToken: !!credentials.refresh_token,
        expiryDate: credentials.expiry_date,
      });

      // Update the database with new tokens
      await db.execute(sql`
        UPDATE user_integrations
        SET access_token = ${encryptString(credentials.access_token!)},
            refresh_token = ${credentials.refresh_token ? encryptString(credentials.refresh_token) : row.refresh_token},
            expiry_date = ${credentials.expiry_date ? new Date(credentials.expiry_date) : null},
            updated_at = ${new Date()}
        WHERE user_id = ${userId}
        AND provider = 'google'
        AND service = 'calendar'
      `);

      return NextResponse.json({
        ok: true,
        data: {
          success: true,
          message: "Tokens refreshed successfully",
          expiresAt: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
        },
      });
    } catch (refreshError: any) {
      console.error("Token refresh failed:", refreshError);
      
      // If refresh fails with invalid_grant, the refresh token is expired
      if (refreshError.message?.includes('invalid_grant')) {
        return NextResponse.json({
          ok: false,
          error: "refresh_token_expired",
          message: "Your Google authorization has expired. Please reconnect Google Calendar.",
        }, { status: 401 });
      }
      
      return NextResponse.json({
        ok: false,
        error: "refresh_failed",
        message: refreshError.message || "Failed to refresh tokens",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Calendar refresh - unexpected error:", error);
    return NextResponse.json({
      ok: false,
      error: "internal_error",
      message: error instanceof Error ? error.message : "An unexpected error occurred",
    }, { status: 500 });
  }
}
