/** GET /api/google/oauth/callback — handle Google OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { db } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { logSync } from "@/server/sync/audit";
import { and, eq } from "drizzle-orm";
import { err } from "@/server/http/responses";
import { encryptString, hmacVerify } from "@/server/lib/crypto";
import { getServerUserId } from "@/server/auth/user";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  if (!code || !stateRaw) return err(400, "missing_code_or_state");

  // Validate state against signed cookie to prevent CSRF/state tampering
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: any) {
    return err(e?.status ?? 401, e?.message ?? "Unauthorized");
  }

  let parsed: any;
  try {
    parsed = JSON.parse(stateRaw);
  } catch {
    return err(400, "invalid_state");
  }
  if (typeof parsed?.n !== "string" || typeof parsed?.s !== "string") {
    return err(400, "invalid_state");
  }
  const cookieVal = req.cookies.get("gauth")?.value ?? "";
  const [sig, nonce] = cookieVal.split(".");
  if (!sig || !nonce) return err(400, "invalid_state");
  const expectedState = JSON.stringify({ n: nonce, s: parsed.s });
  if (!hmacVerify(expectedState, sig) || parsed.n !== nonce) {
    return err(400, "invalid_state");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_REDIRECT_URI"]!,
  );

  const { tokens } = await oauth2Client.getToken(code);
  const accessToken = tokens.access_token!;
  const refreshToken = tokens.refresh_token ?? null;
  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  // upsert by (userId, provider)
  const exists = await db
    .select()
    .from(userIntegrations)
    .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")))
    .limit(1);

  if (exists[0]) {
    await db
      .update(userIntegrations)
      .set({
        accessToken: encryptString(accessToken),
        refreshToken: refreshToken ? encryptString(refreshToken) : exists[0].refreshToken,
        expiryDate,
        updatedAt: new Date(),
      })
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));
  } else {
    await db.insert(userIntegrations).values({
      userId,
      provider: "google",
      accessToken: encryptString(accessToken),
      refreshToken: refreshToken ? encryptString(refreshToken) : null,
      expiryDate,
    });
  }

  await logSync(userId, parsed.s, "approve", { grantedScopes: tokens.scope });

  // Clear nonce cookie
  const res = NextResponse.redirect(new URL("/settings/sync?connected=google", req.url));
  res.cookies.set("gauth", "", { path: "/", httpOnly: true, maxAge: 0 });
  return res;
}
