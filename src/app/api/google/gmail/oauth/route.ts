/** GET /api/google/gmail/oauth — start Gmail OAuth (auth required). Errors: 401 Unauthorized */
import { google } from "googleapis";
import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { logSync } from "@/server/sync/audit";
import { hmacSign, randomNonce } from "@/server/utils/crypto";

// GET /api/google/gmail/oauth - specific Gmail readonly authorization
export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_gmail_oauth" },
})(async ({ userId }) => {
  const scopes = ["https://www.googleapis.com/auth/gmail.readonly"];

  const redirectUri = process.env["GOOGLE_GMAIL_REDIRECT_URI"];
  if (!redirectUri) {
    return NextResponse.json(
      { error: "Gmail OAuth not configured - missing GOOGLE_GMAIL_REDIRECT_URI" },
      { status: 503 },
    );
  }

  const oauth2 = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    redirectUri,
  );

  // CSRF defense: set HMAC-signed nonce cookie and include only the nonce in state
  const nonce = randomNonce(18);
  const state = JSON.stringify({ n: nonce, s: "gmail" });
  const sig = hmacSign(state);

  const url = oauth2.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: scopes,
    state,
  });

  await logSync(userId, "gmail", "preview", { step: "oauth_init" });
  const res = NextResponse.redirect(url);
  // Short lived, HttpOnly. Use SameSite=Lax so the cookie is sent on top-level
  // redirect back from accounts.google.com to our callback.
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("gmail_auth", `${sig}.${nonce}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    // Restrict cookie to the callback route to avoid conflicts with other flows
    path: "/api/google/gmail/callback",
    maxAge: 5 * 60, // 5 minutes
  });
  return res;
});
