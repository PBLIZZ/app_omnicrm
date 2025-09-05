/** GET /api/google/calendar/callback — handle Calendar OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { logSync } from "@/lib/api/sync-audit";
import { and, eq } from "drizzle-orm";
import { err } from "@/lib/api/http";
import { encryptString, hmacVerify } from "@/lib/crypto";
import { getServerUserId } from "@/server/auth/user";

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

  let parsed: { n: string; s: string };
  try {
    const parsedState = JSON.parse(stateRaw) as unknown;
    // Type guard to ensure parsed state has expected structure
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
  if (typeof parsed?.n !== "string" || typeof parsed?.s !== "string") {
    return err(400, "invalid_state");
  }
  if (parsed.s !== "calendar") {
    return err(400, "invalid_state");
  }

  const cookieVal = req.cookies.get("calendar_auth")?.value ?? "";
  const [sig, nonce] = cookieVal.split(".");
  if (!sig || !nonce) return err(400, "invalid_state");
  const expectedState = JSON.stringify({ n: nonce, s: parsed.s });
  if (!hmacVerify(expectedState, sig) || parsed.n !== nonce) {
    return err(400, "invalid_state");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_CALENDAR_REDIRECT_URI"]!,
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token;
    if (!accessToken) {
      throw new Error("Google OAuth did not return an access token");
    }
    const refreshToken = tokens.refresh_token ?? null;
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Check if integration already exists
    const existing = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "calendar"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing integration
      await db
        .update(userIntegrations)
        .set({
          accessToken: encryptString(accessToken),
          refreshToken: refreshToken ? encryptString(refreshToken) : existing[0]?.refreshToken,
          expiryDate,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "calendar"),
          ),
        );
    } else {
      // Insert new integration
      await db.insert(userIntegrations).values({
        userId,
        provider: "google",
        service: "calendar",
        accessToken: encryptString(accessToken),
        refreshToken: refreshToken ? encryptString(refreshToken) : null,
        expiryDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await logSync(userId, "calendar", "approve", {
      grantedScopes: tokens.scope,
    });

    // Clear nonce cookie and redirect to omni-rhythm
    const res = NextResponse.redirect(new URL("/omni-rhythm?success=true", req.url));
    res.cookies.set("calendar_auth", "", { path: "/", httpOnly: true, maxAge: 0 });
    return res;
  } catch (error) {
    console.error("Calendar OAuth callback error:", error);

    // Clear nonce cookie even on error
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const res = NextResponse.redirect(
      new URL(`/omni-rhythm?error=${encodeURIComponent(errorMessage)}`, req.url),
    );
    res.cookies.set("calendar_auth", "", { path: "/", httpOnly: true, maxAge: 0 });
    return res;
  }
}
