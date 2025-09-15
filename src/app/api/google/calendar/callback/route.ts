/** GET /api/google/calendar/callback — handle Calendar OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { logSync } from "@/server/sync/audit";
import { and, eq } from "drizzle-orm";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { encryptString, hmacVerify } from "@/server/utils/crypto";
import { logger } from "@/lib/observability";
import { z } from "zod";

const QuerySchema = z.object({
  code: z.string(),
  state: z.string(),
});

export const GET = createRouteHandler({
  auth: true,
  validation: {
    query: QuerySchema,
  },
  rateLimit: { operation: "google_calendar_callback" },
})(async ({ userId, requestId, validated: { query } }, req: NextRequest) => {
  const apiResponse = new ApiResponseBuilder("google.calendar.callback", requestId);
  const db = await getDb();
  const { code, state: stateRaw } = query;

  // Parse and validate state
  const StateSchema = z.object({
    n: z.string().min(18).max(64),
    s: z.enum(["gmail", "calendar"]),
  });

  let parsed: z.infer<typeof StateSchema>;
  try {
    parsed = StateSchema.parse(JSON.parse(stateRaw));
  } catch {
    return apiResponse.validationError("invalid_state");
  }
  if (parsed.s !== "calendar") return apiResponse.validationError("invalid_state");

  const cookieVal = req.cookies.get("calendar_auth")?.value ?? "";
  const [sig, nonce] = cookieVal.split(".");
  if (!sig || !nonce) return apiResponse.validationError("invalid_state");
  // Verify signature against the original state string and match nonce
  if (!hmacVerify(stateRaw, sig) || parsed.n !== nonce) {
    return apiResponse.validationError("invalid_state");
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
      return apiResponse.error("Google OAuth did not return an access token", "INTEGRATION_ERROR");
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

    // Clear nonce cookie and redirect to Omni Rhythm for post-connect sync setup
    const res = NextResponse.redirect(
      new URL("/omni-rhythm?connected=true&step=calendar-sync", req.url),
    );
    res.cookies.set("calendar_auth", "", { path: "/", httpOnly: true, maxAge: 0 });
    return res;
  } catch (error) {
    await logger.security(
      "Calendar OAuth callback failed",
      {
        operation: "auth.oauth.calendar_callback",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          userAgent: req.headers.get("user-agent"),
          forwardedFor: req.headers.get("x-forwarded-for"),
          endpoint: req.url,
          method: req.method,
        },
      },
      error instanceof Error ? error : undefined,
    );

    // Clear nonce cookie even on error
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    const res = NextResponse.redirect(
      new URL(`/omni-rhythm?error=${encodeURIComponent(errorMessage)}`, req.url),
    );
    res.cookies.set("calendar_auth", "", { path: "/", httpOnly: true, maxAge: 0 });
    return res;
  }
});
