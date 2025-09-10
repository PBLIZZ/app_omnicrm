/** GET /api/google/gmail/callback — handle Gmail OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { hmacVerify } from "@/server/utils/crypto";
import { logSync } from "@/server/sync/audit";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { userIntegrations } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { encryptString } from "@/server/utils/crypto";
import { logger } from "@/lib/observability";

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string().optional(),
  error: z.string().optional(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "google_gmail_callback" },
  validation: {
    query: callbackQuerySchema,
  },
})(async ({ userId, validated, requestId }, req: NextRequest) => {
  const api = new ApiResponseBuilder("google.gmail.callback", requestId);
  const db = await getDb();
  const { code, state: stateRaw } = validated.query;

  if (!code || !stateRaw) return api.error("Invalid state parameter", "VALIDATION_ERROR");

  // Validate state against signed cookie to prevent CSRF/state tampering
  const stateSchema = z.object({
    n: z.string().min(18).max(50), // Enforce nonce length requirements
    s: z.enum(["gmail", "calendar"]), // Strict service validation
  });

  let parsed: { n: string; s: string };
  try {
    const parsedState = JSON.parse(stateRaw) as unknown;
    parsed = stateSchema.parse(parsedState);
  } catch {
    return api.error("Invalid state parameter", "VALIDATION_ERROR");
  }

  if (parsed.s !== "gmail") {
    return api.error("Invalid state parameter", "VALIDATION_ERROR");
  }

  const cookieVal = req.cookies.get("gmail_auth")?.value ?? "";
  const [sig, nonce] = cookieVal.split(".");
  if (!sig || !nonce) return api.error("Invalid state parameter", "VALIDATION_ERROR");
  const expectedState = JSON.stringify({ n: nonce, s: parsed.s });
  if (!hmacVerify(expectedState, sig) || parsed.n !== nonce) {
    return api.error("Invalid state parameter", "VALIDATION_ERROR");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env["GOOGLE_CLIENT_ID"]!,
    process.env["GOOGLE_CLIENT_SECRET"]!,
    process.env["GOOGLE_GMAIL_REDIRECT_URI"]!,
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);
    const accessToken = tokens.access_token;
    if (!accessToken) {
      return api.error("Gmail authorization failed", "VALIDATION_ERROR");
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
  } catch (error) {
    await logger.security(
      "Gmail OAuth callback failed",
      {
        operation: "auth.oauth.gmail_callback",
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
    return api.error(
      `Gmail OAuth error: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
