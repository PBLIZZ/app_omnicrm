/** GET /api/google/gmail/callback — handle Gmail OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { logSync } from "@/lib/api/sync-audit";
import { and, eq } from "drizzle-orm";
import { err } from "@/lib/api/http";
import { encryptString, hmacVerify } from "@/lib/crypto";
import { getServerUserId } from "@/server/auth/user";
import { z } from "zod";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const db = await getDb();
  const code = req.nextUrl.searchParams.get("code");
  const stateRaw = req.nextUrl.searchParams.get("state");
  if (!code || !stateRaw) return err(400, "missing_code_or_state");

  // Validate state against signed cookie to prevent CSRF/state tampering
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e instanceof Error ? e : new Error("Unknown error");
    const status =
      typeof (e as { status?: number }).status === "number"
        ? (e as { status: number }).status
        : 401;
    const message = error.message || "Unauthorized";
    return err(status, message);
  }

  const stateSchema = z.object({
    n: z.string().min(18).max(50), // Enforce nonce length requirements
    s: z.enum(["gmail", "calendar"]), // Strict service validation
  });

  let parsed: { n: string; s: string };
  try {
    const parsedState = JSON.parse(stateRaw) as unknown;
    parsed = stateSchema.parse(parsedState);
  } catch {
    return err(400, "invalid_state_format");
  }

  if (parsed.s !== "gmail") {
    return err(400, "invalid_state");
  }

  const cookieVal = req.cookies.get("gmail_auth")?.value ?? "";
  const [sig, nonce] = cookieVal.split(".");
  if (!sig || !nonce) return err(400, "invalid_state");
  const expectedState = JSON.stringify({ n: nonce, s: parsed.s });
  if (!hmacVerify(expectedState, sig) || parsed.n !== nonce) {
    return err(400, "invalid_state");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_GMAIL_REDIRECT_URI"]!,
  );

  const { tokens } = await oauth2Client.getToken(code);
  const accessToken = tokens.access_token;
  if (!accessToken) {
    throw new Error("Google OAuth did not return an access token");
  }
  const refreshToken = tokens.refresh_token ?? null;
  const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

  // upsert by (userId, provider, service)
  const exists = await db
    .select()
    .from(userIntegrations)
    .where(
      and(
        eq(userIntegrations.userId, userId),
        eq(userIntegrations.provider, "google"),
        eq(userIntegrations.service, "gmail"),
      ),
    )
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
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "gmail"),
        ),
      );
  } else {
    await db.insert(userIntegrations).values({
      userId,
      provider: "google",
      service: "gmail",
      accessToken: encryptString(accessToken),
      refreshToken: refreshToken ? encryptString(refreshToken) : null,
      expiryDate,
    });
  }

  await logSync(userId, "gmail", "approve", {
    grantedScopes: tokens.scope,
  });

  // Clear nonce cookie
  const res = NextResponse.redirect(new URL("/omni-connect?connected=gmail", req.url));
  res.cookies.set("gmail_auth", "", { path: "/", httpOnly: true, maxAge: 0 });
  return res;
}
