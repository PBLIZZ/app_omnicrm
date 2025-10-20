/**
 * OAuth Service Functions
 *
 * Business logic for OAuth flows and token management
 */

import { google } from "googleapis";
import { cookies } from "next/headers";
import { getAuthUserId } from "@/lib/auth-simple";
import { upsertIntegrationService } from "./google-integration.service";
import {
  generateOAuthState,
  validateOAuthScopes,
  validateOAuthCallbackQuery,
  validateOAuthState,
  validateOAuthRedirectUrl,
  sanitizeOAuthError,
} from "@/server/lib/oauth-validation";
import { AppError } from "@/lib/errors/app-error";
import type { OAuthCallbackQuery } from "@/server/db/business-schemas";

export type GoogleService = "gmail" | "calendar";

export type OAuthInitResult =
  | {
      success: true;
      authUrl: string;
    }
  | {
      success: false;
      error: string;
    };

export type OAuthCallbackResult =
  | {
      success: true;
      redirectUrl: string;
    }
  | {
      success: false;
      redirectUrl: string;
      error: string;
    };

/**
 * Initialize OAuth flow for a Google service
 */
export async function initializeOAuthService(service: GoogleService): Promise<OAuthInitResult> {
  try {
    // 1. Verify user is authenticated
    const userId = await getAuthUserId();

    // 2. Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      `${process.env["NEXT_PUBLIC_APP_URL"]}/api/google/${service}/callback`,
    );

    // 3. Generate secure state token for CSRF protection
    const state = generateOAuthState();

    // 4. Store state in cookie
    const cookieStore = await cookies();
    cookieStore.set(`${service}_oauth_state`, state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
      path: "/",
    });

    // 5. Store userId in cookie for callback
    cookieStore.set(`${service}_oauth_user`, userId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
      path: "/",
    });

    // 6. Validate OAuth scopes
    const scopes = getScopesForService(service);
    const scopeValidation = validateOAuthScopes(service, scopes);
    if (!scopeValidation.isValid) {
      throw new AppError("Invalid OAuth scopes", "VALIDATION_ERROR", "validation", false, 400);
    }

    // 7. Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      state,
      prompt: "consent", // Force consent to get refresh token
    });

    return {
      success: true,
      authUrl,
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError(
      error instanceof Error ? error.message : "Failed to initialize OAuth",
      "OAUTH_ERROR",
      "validation",
      false,
      500,
    );
  }
}

/**
 * Handle OAuth callback for a Google service
 */
export async function handleOAuthCallbackService(
  service: GoogleService,
  query: OAuthCallbackQuery,
): Promise<OAuthCallbackResult> {
  try {
    // 1. Validate OAuth callback query parameters
    const queryValidation = validateOAuthCallbackQuery(query);
    if (!queryValidation.isValid) {
      const redirectResult = validateOAuthRedirectUrl(
        `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}`,
        "invalid_request",
        queryValidation.error,
      );
      return {
        success: false,
        redirectUrl:
          redirectResult.url ||
          `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}?error=invalid_request`,
        error: queryValidation.error || "Invalid request",
      };
    }

    if (!queryValidation.data) {
      throw new AppError("OAuth validation failed", "OAUTH_VALIDATION_ERROR", "validation", false);
    }

    const { code, state, error, error_description } = queryValidation.data;

    // 2. Handle OAuth error responses
    if (error) {
      const redirectResult = validateOAuthRedirectUrl(
        `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}`,
        error,
        error_description,
      );
      return {
        success: false,
        redirectUrl:
          redirectResult.url ||
          `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}?error=oauth_error`,
        error: error_description || error,
      };
    }

    // 3. Validate state parameter format
    const stateValidation = validateOAuthState(state!);
    if (!stateValidation.isValid) {
      const redirectResult = validateOAuthRedirectUrl(
        `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}`,
        "invalid_state",
        stateValidation.error,
      );
      return {
        success: false,
        redirectUrl:
          redirectResult.url ||
          `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}?error=invalid_state`,
        error: stateValidation.error || "Invalid state",
      };
    }

    // 4. Verify state token (CSRF protection)
    const cookieStore = await cookies();
    const storedState = cookieStore.get(`${service}_oauth_state`)?.value;
    const userId = cookieStore.get(`${service}_oauth_user`)?.value;

    if (!storedState || storedState !== state || !userId) {
      const redirectResult = validateOAuthRedirectUrl(
        `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}`,
        "invalid_state",
        "State token mismatch or missing user context",
      );
      return {
        success: false,
        redirectUrl:
          redirectResult.url ||
          `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}?error=invalid_state`,
        error: "State token mismatch or missing user context",
      };
    }

    // 5. Exchange code for tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      `${process.env["NEXT_PUBLIC_APP_URL"]}/api/google/${service}/callback`,
    );

    const { tokens } = await oauth2Client.getToken(code!);

    if (!tokens.access_token) {
      throw new AppError("OAuth authentication failed", "OAUTH_ERROR", "validation", false, 400);
    }

    // 6. Get user email
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    // 7. Calculate expiry date
    const expiryDate = tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000); // 1 hour default

    await upsertIntegrationService(userId, service, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      expiryDate,
      config: {
        email: userInfo.email ?? null,
        scopes: tokens.scope ?? null,
      },
    });

    // 8. Clear OAuth cookies
    cookieStore.delete(`${service}_oauth_state`);
    cookieStore.delete(`${service}_oauth_user`);

    // 9. Return success redirect
    return {
      success: true,
      redirectUrl: `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}?connected=${service}`,
    };
  } catch (error) {
    const sanitizedError = sanitizeOAuthError(error);
    const redirectResult = validateOAuthRedirectUrl(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}`,
      "oauth_failed",
      sanitizedError,
    );
    return {
      success: false,
      redirectUrl:
        redirectResult.url ||
        `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-${service === "gmail" ? "connect" : "rhythm"}?error=oauth_failed`,
      error: sanitizedError,
    };
  }
}

/**
 * Get OAuth scopes for a specific Google service
 */
function getScopesForService(service: GoogleService): string[] {
  switch (service) {
    case "gmail":
      return [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ];
    case "calendar":
      return [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ];
    default:
      throw new AppError(
        `Unknown service: ${service}`,
        "VALIDATION_ERROR",
        "validation",
        false,
        400,
      );
  }
}
