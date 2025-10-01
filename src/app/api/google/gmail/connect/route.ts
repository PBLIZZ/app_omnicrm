/**
 * GET /api/google/gmail/connect
 * Initiates Gmail OAuth flow (GET request - no CSRF needed)
 */
import { getAuthUserId } from "@/lib/auth-simple";
import { google } from "googleapis";
import { cookies } from "next/headers";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    // 1. Verify user is authenticated
    const userId = await getAuthUserId();

    // 2. Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/google/gmail/callback`
    );

    // 3. Generate state token for CSRF protection
    const state = randomBytes(32).toString("hex");
    
    // 4. Store state in cookie
    const cookieStore = await cookies();
    cookieStore.set("gmail_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // 5. Store userId in cookie for callback
    cookieStore.set("gmail_oauth_user", userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // 6. Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ],
      state,
      prompt: "consent", // Force consent to get refresh token
    });

    // 7. Redirect to Google OAuth
    return Response.redirect(authUrl);
  } catch (error) {
    console.error("[Gmail OAuth] Error:", error);
    return Response.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/omni-connect?error=oauth_init_failed`
    );
  }
}
