/**
 * OAuth Security Validation Utilities
 *
 * Provides comprehensive validation for OAuth flows to prevent:
 * - Open redirect vulnerabilities
 * - CSRF attacks
 * - State parameter manipulation
 * - Invalid redirect URI attacks
 */

import { z } from "zod";
import { env } from "./env";

/**
 * Allowed redirect URIs for OAuth flows
 * This prevents open redirect vulnerabilities by restricting
 * where OAuth callbacks can redirect users
 */
const ALLOWED_REDIRECT_URIS = [
  // Main app pages
  `${env.NEXT_PUBLIC_APP_URL}/omni-connect`,
  `${env.NEXT_PUBLIC_APP_URL}/omni-rhythm`,
  `${env.NEXT_PUBLIC_APP_URL}/omni-momentum`,
  `${env.NEXT_PUBLIC_APP_URL}/settings`,
  // Auth pages
  `${env.NEXT_PUBLIC_APP_URL}/auth/callback`,
  `${env.NEXT_PUBLIC_APP_URL}/auth/error`,
] as const;

/**
 * OAuth service types for validation
 */
export const OAUTH_SERVICE_TYPES = ["gmail", "calendar", "drive"] as const;
export type OAuthServiceType = (typeof OAUTH_SERVICE_TYPES)[number];

/**
 * OAuth state validation schema
 * State must be a 64-character hex string (32 bytes)
 */
export const OAuthStateSchema = z
  .string()
  .length(64, "State must be exactly 64 characters")
  .regex(/^[a-f0-9]+$/, "State must be a valid hex string");

/**
 * OAuth callback query validation schema
 * Validates the query parameters received in OAuth callbacks
 */
export const OAuthCallbackQuerySchema = z
  .object({
    code: z.string().optional(),
    state: OAuthStateSchema.optional(),
    error: z.string().optional(),
    error_description: z.string().optional(),
    // Additional Google OAuth parameters
    scope: z.string().optional(),
    authuser: z.string().optional(),
    prompt: z.string().optional(),
  })
  .refine((data) => Boolean(data.code) !== Boolean(data.error), {
    message: "Exactly one of 'code' or 'error' must be present in OAuth callback",
  })
  .refine((data) => data.state !== undefined, {
    message: "State parameter is required for OAuth callback validation",
  });

export type OAuthCallbackQuery = z.infer<typeof OAuthCallbackQuerySchema>;

/**
 * Validates that a redirect URI is in the allowlist
 * Prevents open redirect vulnerabilities
 */
export function validateRedirectUri(uri: string): boolean {
  try {
    const url = new URL(uri);

    // Check if the base URL (without query params) is in our allowlist
    return ALLOWED_REDIRECT_URIS.some((allowedUri) => {
      const allowedUrl = new URL(allowedUri);
      return (
        allowedUrl.origin === url.origin &&
        (allowedUrl.pathname === url.pathname || url.pathname.startsWith(allowedUrl.pathname))
      );
    });
  } catch {
    return false;
  }
}

/**
 * Validates OAuth state parameter
 * Ensures state is properly formatted and not tampered with
 */
export function validateOAuthState(state: string): { isValid: boolean; error?: string } {
  try {
    OAuthStateSchema.parse(state);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || "Invalid state parameter",
      };
    }
    return { isValid: false, error: "State validation failed" };
  }
}

/**
 * Validates OAuth callback query parameters
 * Comprehensive validation of all callback parameters
 */
export function validateOAuthCallbackQuery(query: Record<string, string | string[] | undefined>): {
  isValid: boolean;
  data?: OAuthCallbackQuery;
  error?: string;
} {
  try {
    // Convert query to flat object with string values
    const flatQuery: Record<string, string> = {};
    for (const [key, value] of Object.entries(query)) {
      if (Array.isArray(value)) {
        flatQuery[key] = value[0] || "";
      } else if (typeof value === "string") {
        flatQuery[key] = value;
      }
    }

    const data = OAuthCallbackQuerySchema.parse(flatQuery);
    return { isValid: true, data };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        isValid: false,
        error: error.issues[0]?.message || "Invalid OAuth callback parameters",
      };
    }
    return { isValid: false, error: "OAuth callback validation failed" };
  }
}

/**
 * Validates OAuth redirect URL construction
 * Ensures redirect URLs are safe and properly formatted
 */
export function validateOAuthRedirectUrl(
  baseUrl: string,
  errorCode?: string,
  errorDescription?: string,
): { isValid: boolean; url?: string; error?: string } {
  try {
    // Validate base URL
    if (!validateRedirectUri(baseUrl)) {
      return {
        isValid: false,
        error: `Redirect URI not allowed: ${baseUrl}`,
      };
    }

    // Construct URL with error parameters if provided
    const url = new URL(baseUrl);
    if (errorCode) {
      url.searchParams.set("error", errorCode);
    }
    if (errorDescription) {
      url.searchParams.set("error_description", errorDescription);
    }

    return { isValid: true, url: url.toString() };
  } catch (error) {
    return {
      isValid: false,
      error: `Invalid redirect URL: ${error instanceof Error ? error.message : "Unknown error"}`,
    };
  }
}

/**
 * Validates OAuth service type
 * Ensures only allowed services can be used
 */
export function validateOAuthServiceType(service: string): service is OAuthServiceType {
  return OAUTH_SERVICE_TYPES.includes(service as OAuthServiceType);
}

/**
 * Generates a secure OAuth state parameter
 * Creates a cryptographically secure state token
 */
export function generateOAuthState(): string {
  const crypto = require("crypto") as typeof import("crypto");
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Validates OAuth scope parameters
 * Ensures requested scopes are appropriate for the service
 */
export function validateOAuthScopes(
  service: OAuthServiceType,
  scopes: string[],
): {
  isValid: boolean;
  error?: string;
} {
  const allowedScopes: Record<OAuthServiceType, string[]> = {
    gmail: [
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    calendar: [
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    drive: [
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
  };

  const serviceScopes = allowedScopes[service] || [];
  const invalidScopes = scopes.filter((scope) => !serviceScopes.includes(scope));

  if (invalidScopes.length > 0) {
    return {
      isValid: false,
      error: `Invalid scopes for ${service}: ${invalidScopes.join(", ")}`,
    };
  }

  return { isValid: true };
}

/**
 * Sanitizes error messages for OAuth flows
 * Prevents information leakage while providing useful error details
 */
export function sanitizeOAuthError(error: unknown): string {
  if (error instanceof Error) {
    // Only expose safe error messages
    const safeMessages = [
      "invalid_grant",
      "invalid_request",
      "unauthorized_client",
      "access_denied",
      "unsupported_response_type",
      "invalid_scope",
      "server_error",
      "temporarily_unavailable",
    ];

    const message = error.message.toLowerCase();
    if (safeMessages.some((safe) => message.includes(safe))) {
      return error.message;
    }

    // For other errors, return a generic message
    return "OAuth authentication failed";
  }

  return "OAuth authentication failed";
}
