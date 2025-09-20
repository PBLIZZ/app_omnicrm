/**
 * GoogleOAuthService - Business logic for Google OAuth flows
 *
 * Handles:
 * - OAuth URL generation with CSRF protection
 * - Token exchange and storage
 * - State validation and security
 * - User integration management
 */

import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getDb } from "@/server/db/client";

// Google OAuth token interface
interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}
import { userIntegrations } from "@/server/db/schema";
import { and, eq } from "drizzle-orm";
import { encryptString } from "@/server/utils/crypto";
import { hmacSign, hmacVerify, randomNonce } from "@/server/utils/crypto";
import { logSync } from "@/server/sync/audit";
import { logger } from "@/lib/observability";
import { z } from "zod";

export type GoogleService = "gmail" | "calendar";

export type OAuthConfig = {
  service: GoogleService;
  scopes: string[];
  redirectUri: string;
  cookieName: string;
  callbackPath: string;
};

export type OAuthStartResult = {
  success: true;
  response: NextResponse;
} | {
  success: false;
  error: string;
  status: number;
};

export type OAuthCallbackResult = {
  success: true;
  redirectUrl: string;
} | {
  success: false;
  error: string;
  status: number;
};

export type TokenExchangeData = {
  code: string;
  state: string;
  cookieValue: string;
};

const stateSchema = z.object({
  n: z.string().min(18).max(50), // Enforce nonce length requirements
  s: z.enum(["gmail", "calendar"]), // Strict service validation
});

export class GoogleOAuthService {
  private static readonly OAUTH_CONFIGS: Record<GoogleService, OAuthConfig> = {
    gmail: {
      service: "gmail",
      scopes: ["https://www.googleapis.com/auth/gmail.readonly"],
      redirectUri: process.env["GOOGLE_GMAIL_REDIRECT_URI"] || "",
      cookieName: "gmail_auth",
      callbackPath: "/api/google/gmail/callback",
    },
    calendar: {
      service: "calendar",
      scopes: ["https://www.googleapis.com/auth/calendar"],
      redirectUri: process.env["GOOGLE_CALENDAR_REDIRECT_URI"] || "",
      cookieName: "calendar_auth",
      callbackPath: "/api/google/calendar/callback",
    },
  };

  /**
   * Validate OAuth environment configuration
   */
  private static validateOAuthConfig(service: GoogleService): { valid: true } | { valid: false; error: string; status: number } {
    const config = this.OAUTH_CONFIGS[service];

    if (!config.redirectUri) {
      return {
        valid: false,
        error: `${service} OAuth not configured - missing redirect URI`,
        status: 503,
      };
    }

    const clientId = process.env["GOOGLE_CLIENT_ID"];
    const clientSecret = process.env["GOOGLE_CLIENT_SECRET"];

    if (!clientId || !clientSecret) {
      return {
        valid: false,
        error: "Google OAuth credentials not configured",
        status: 500,
      };
    }

    return { valid: true };
  }

  /**
   * Start OAuth flow with CSRF protection
   */
  static async startOAuthFlow(userId: string, service: GoogleService): Promise<OAuthStartResult> {
    const validation = this.validateOAuthConfig(service);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        status: validation.status,
      };
    }

    const config = this.OAUTH_CONFIGS[service];
    const clientId = process.env["GOOGLE_CLIENT_ID"]!;
    const clientSecret = process.env["GOOGLE_CLIENT_SECRET"]!;

    const oauth2 = new google.auth.OAuth2(clientId, clientSecret, config.redirectUri);

    // CSRF defense: set HMAC-signed nonce cookie and include only the nonce in state
    const nonce = randomNonce(18);
    const state = JSON.stringify({ n: nonce, s: service });
    const sig = hmacSign(state);

    const url = oauth2.generateAuthUrl({
      access_type: "offline",
      include_granted_scopes: true,
      prompt: "consent",
      scope: config.scopes,
      state,
    });

    await logSync(userId, service, "preview", { step: "oauth_init" });

    const response = NextResponse.redirect(url);

    // Short lived, HttpOnly. Use SameSite=Lax so the cookie is sent on top-level
    // redirect back from accounts.google.com to our callback.
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set(config.cookieName, `${sig}.${nonce}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: isProd,
      path: config.callbackPath,
      maxAge: 5 * 60, // 5 minutes
    });

    return {
      success: true,
      response,
    };
  }

  /**
   * Validate OAuth callback state and exchange code for tokens
   */
  static async handleOAuthCallback(
    userId: string,
    service: GoogleService,
    data: TokenExchangeData,
    redirectBaseUrl: string
  ): Promise<OAuthCallbackResult> {
    const validation = this.validateOAuthConfig(service);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error,
        status: validation.status,
      };
    }

    const config = this.OAUTH_CONFIGS[service];

    // Validate state parameter
    let parsed: { n: string; s: string };
    try {
      const parsedState = JSON.parse(data.state) as unknown;
      parsed = stateSchema.parse(parsedState);
    } catch {
      return {
        success: false,
        error: "Invalid state parameter",
        status: 400,
      };
    }

    if (parsed.s !== service) {
      return {
        success: false,
        error: "Invalid state parameter",
        status: 400,
      };
    }

    // Validate CSRF nonce
    const [sig, nonce] = data.cookieValue.split(".");
    if (!sig || !nonce) {
      return {
        success: false,
        error: "Invalid state parameter",
        status: 400,
      };
    }

    const expectedState = JSON.stringify({ n: nonce, s: parsed.s });
    if (!hmacVerify(expectedState, sig) || parsed.n !== nonce) {
      return {
        success: false,
        error: "Invalid state parameter",
        status: 400,
      };
    }

    // Exchange code for tokens
    const clientId = process.env["GOOGLE_CLIENT_ID"]!;
    const clientSecret = process.env["GOOGLE_CLIENT_SECRET"]!;
    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, config.redirectUri);

    try {
      const { tokens } = await oauth2Client.getToken(data.code);
      const accessToken = tokens.access_token;

      if (!accessToken) {
        return {
          success: false,
          error: `${service} authorization failed`,
          status: 400,
        };
      }

      await this.storeUserTokens(userId, service, tokens);

      await logSync(userId, service, "approve", {
        grantedScopes: tokens.scope,
      });

      // Return redirect URL for successful OAuth
      const redirectUrl = `${redirectBaseUrl}/omni-connect?step=${service}-sync`;

      return {
        success: true,
        redirectUrl,
      };
    } catch (error) {
      await logger.security(
        `${service} OAuth callback failed`,
        {
          operation: `auth.oauth.${service}_callback`,
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            service,
          },
        },
        error instanceof Error ? error : undefined,
      );

      return {
        success: false,
        error: `${service} OAuth error: ${error instanceof Error ? error.message : "Unknown error"}`,
        status: 500,
      };
    }
  }

  /**
   * Store or update user OAuth tokens
   */
  private static async storeUserTokens(
    userId: string,
    service: GoogleService,
    tokens: GoogleTokens
  ): Promise<void> {
    const db = await getDb();
    const accessToken = tokens.access_token;
    const refreshToken = tokens.refresh_token ?? null;
    const expiryDate = tokens.expiry_date ? new Date(tokens.expiry_date) : null;

    // Check if integration already exists
    const exists = await db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, service),
        ),
      )
      .limit(1);

    if (exists[0]) {
      // Update existing integration
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
            eq(userIntegrations.service, service),
          ),
        );
    } else {
      // Create new integration
      await db.insert(userIntegrations).values({
        userId,
        provider: "google",
        service,
        accessToken: encryptString(accessToken),
        refreshToken: refreshToken ? encryptString(refreshToken) : null,
        expiryDate,
      });
    }
  }

  /**
   * Clear OAuth cookie (helper for cleanup)
   */
  static clearOAuthCookie(service: GoogleService): { name: string; options: Record<string, unknown> } {
    const config = this.OAUTH_CONFIGS[service];
    return {
      name: config.cookieName,
      options: { path: "/", httpOnly: true, maxAge: 0 },
    };
  }
}