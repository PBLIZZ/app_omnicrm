/**
 * GET /api/google/calendar/callback
 * Handles Calendar OAuth callback
 */
import { google } from "googleapis";
import { cookies } from "next/headers";
import { GoogleIntegrationService } from "@/server/services/google-integration.service";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    // 1. Validate required parameters
    if (!code || !state) {
      return Response.redirect(
        `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-rhythm?error=missing_params`,
      );
    }

    // 2. Verify state token (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get("calendar_oauth_state")?.value;
    const userId = cookieStore.get("calendar_oauth_user")?.value;

    if (!storedState || storedState !== state || !userId) {
      return Response.redirect(
        `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-rhythm?error=invalid_state`,
      );
    }

    // 3. Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      process.env["NEXT_PUBLIC_APP_URL"] + "/api/google/calendar/callback",
    );

    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token) {
      throw new Error("No access token received");
    }

    // 4. Get user email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // 5. Calculate expiry date
    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hour default

    await GoogleIntegrationService.upsertIntegration(userId, "calendar", {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate,
      config: {
        email: userInfo.email ?? null,
        scopes: tokens.scope ?? null,
      },
    });

    // 7. Clear OAuth cookies
    cookieStore.delete("calendar_oauth_state");
    cookieStore.delete("calendar_oauth_user");

    // 8. Redirect to success page
    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-rhythm?connected=calendar`,
    );
  } catch (error) {
    console.error("[Calendar OAuth Callback] Error:", error);
    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-rhythm?error=oauth_failed`,
    );
  }
}
