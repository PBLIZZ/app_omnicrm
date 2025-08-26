import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getServerUserId } from "@/server/auth/user";
import { err } from "@/server/http/responses";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { hmacVerify, encryptString } from "@/server/lib/crypto";
import { and, eq, sql } from "drizzle-orm";

// GET: Handle OAuth callback from Google
export async function GET(req: NextRequest): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const stateRaw = searchParams.get("state");
  if (!code || !stateRaw) return err(400, "missing_code_or_state");

  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { status?: number; message?: string };
    return err(error.status ?? 401, error.message ?? "unauthorized");
  }

  // Validate state from signed nonce cookie
  let parsed: { n: string; s: string };
  try {
    const parsedState = JSON.parse(stateRaw) as unknown;
    if (
      typeof parsedState === "object" &&
      parsedState !== null &&
      "n" in parsedState &&
      "s" in parsedState
    ) {
      parsed = parsedState as { n: string; s: string };
    } else {
      return err(400, "invalid_state");
    }
  } catch {
    return err(400, "invalid_state");
  }
  if (parsed.s !== "calendar") return err(400, "invalid_state");

  const cookieVal = req.cookies.get("calendar_auth")?.value ?? "";
  const [sig, cookieNonce] = cookieVal.split(".");
  if (!sig || !cookieNonce) return err(400, "invalid_state");
  const expectedState = JSON.stringify({ n: cookieNonce, s: parsed.s });
  if (!hmacVerify(expectedState, sig) || parsed.n !== cookieNonce) {
    return err(400, "invalid_state");
  }

  // Exchange code for tokens using static redirect URI
  const oauth2 = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_CALENDAR_REDIRECT_URI"]!,
  );
  const { tokens } = await oauth2.getToken(code);
  console.log("OAuth callback - received tokens:", { 
    hasAccessToken: !!tokens.access_token, 
    hasRefreshToken: !!tokens.refresh_token,
    expiryDate: tokens.expiry_date 
  });

  const accessToken = tokens.access_token ?? null;
  const refreshToken = tokens.refresh_token ?? null;
  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;
  if (!accessToken) return err(400, "failed_to_get_tokens");

  const dbo = await getDb();
  // Use raw SQL to bypass Drizzle ORM issues with composite keys
  const existing = await dbo.execute(sql`
    SELECT user_id, provider, service FROM user_integrations 
    WHERE user_id = ${userId} 
    AND provider = 'google' 
    AND service = 'calendar' 
    LIMIT 1
  `);

  console.log("OAuth callback - userId:", userId, "existingRecord:", !!existing.rows[0]);
  
  if (existing.rows[0]) {
    console.log("OAuth callback - updating existing integration");
    // Use raw SQL for update to avoid Drizzle ORM issues
    await dbo.execute(sql`
      UPDATE user_integrations 
      SET access_token = ${encryptString(accessToken)},
          refresh_token = ${refreshToken ? encryptString(refreshToken) : null},
          expiry_date = ${expiryDate},
          updated_at = ${new Date()}
      WHERE user_id = ${userId} 
      AND provider = 'google' 
      AND service = 'calendar'
    `);
  } else {
    console.log("OAuth callback - creating new integration");
    // Use raw SQL for insert to avoid Drizzle ORM issues
    await dbo.execute(sql`
      INSERT INTO user_integrations (user_id, provider, service, access_token, refresh_token, expiry_date, created_at, updated_at)
      VALUES (${userId}, 'google', 'calendar', ${encryptString(accessToken)}, ${refreshToken ? encryptString(refreshToken) : null}, ${expiryDate}, ${new Date()}, ${new Date()})
    `);
  }
  console.log("OAuth callback - database operation completed successfully");

  // Clear nonce cookie and redirect back to calendar page
  const res = NextResponse.redirect(
    new URL("/calendar?connected=true", req.url),
  );
  res.cookies.set("calendar_auth", "", { path: "/", maxAge: 0 });
  return res;
}