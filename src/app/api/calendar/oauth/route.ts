import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { err } from "@/server/http/responses";
import { google } from "googleapis";
import { hmacSign, randomNonce } from "@/server/lib/crypto";
import { toApiError } from "@/server/jobs/types";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_CALENDAR_REDIRECT_URI = process.env.GOOGLE_CALENDAR_REDIRECT_URI;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALENDAR_REDIRECT_URI) {
  console.error(
    "Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_CALENDAR_REDIRECT_URI environment variables.",
  );
}

// GET: Start OAuth flow
export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_CALENDAR_REDIRECT_URI) {
    return err(500, "google_oauth_not_configured");
  }

  const scopes = [
    "https://www.googleapis.com/auth/calendar.readonly",
    "https://www.googleapis.com/auth/calendar.events.readonly",
  ];

  const oauth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_CALENDAR_REDIRECT_URI,
  );

  // CSRF defense: set HMAC-signed nonce cookie and include only the nonce in state
  const nonce = randomNonce(18);
  const state = JSON.stringify({ n: nonce, s: "calendar" });
  const sig = hmacSign(state);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    include_granted_scopes: true,
    prompt: "consent",
    scope: scopes,
    state,
  });

  // Redirect directly to Google OAuth instead of returning JSON
  const res = NextResponse.redirect(authUrl);
  const isProd = process.env.NODE_ENV === "production";
  res.cookies.set("calendar_auth", `${sig}.${nonce}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    path: "/",
    maxAge: 5 * 60,
  });
  return res;
}

