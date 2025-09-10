/** GET /api/google/calendar/oauth — start Calendar OAuth (auth required). Errors: 401 Unauthorized */
import { NextResponse } from "next/server";
import { google } from "googleapis";
import { logSync } from "@/server/sync/audit";
import { createRouteHandler } from "@/server/api/handler";
import { hmacSign, randomNonce } from "@/server/utils/crypto";

// GET /api/google/calendar/oauth - specific Calendar full access authorization
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_calendar_oauth" },
})(async ({ userId }) => {
  // Note: OAuth redirect response - no API response builder needed

  const scopes = ["https://www.googleapis.com/auth/calendar"];

  const oauth2 = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_CALENDAR_REDIRECT_URI"]!,
  );

  // CSRF defense: set HMAC-signed nonce cookie and include only the nonce in state
  const nonce = randomNonce(18);
  const state = JSON.stringify({ n: nonce, s: "calendar" });
  const sig = hmacSign(state);

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: scopes,
    state,
  });

  await logSync(userId, "calendar", "preview", { step: "oauth_init" });
  const res = NextResponse.redirect(url);
  // Short lived, HttpOnly. Use SameSite=Lax so the cookie is sent on top-level
  // redirect back from accounts.google.com to our callback.
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("calendar_auth", `${sig}.${nonce}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    // Restrict cookie to the callback route to avoid conflicts with other flows
    path: "/api/google/calendar/callback",
    maxAge: 5 * 60, // 5 minutes
  });
  return res;
});
