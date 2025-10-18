/**
 * OAuth Validation Utilities Tests
 *
 * Tests comprehensive OAuth security validation to ensure:
 * - Redirect URI validation prevents open redirects
 * - State parameter validation prevents CSRF attacks
 * - Scope validation prevents privilege escalation
 * - Error sanitization prevents information leakage
 */

import { describe, it, expect, vi } from "vitest";

// Override env for testing
vi.mock("@/server/lib/env", () => ({
  env: {
    NEXT_PUBLIC_APP_URL: "https://app.example.com",
  },
}));

import {
  validateRedirectUri,
  validateOAuthState,
  validateOAuthCallbackQuery,
  validateOAuthRedirectUrl,
  validateOAuthServiceType,
  generateOAuthState,
  validateOAuthScopes,
  sanitizeOAuthError,
} from "@/server/lib/oauth-validation";

describe("OAuth Validation Utilities", () => {
  describe("validateRedirectUri", () => {
    it("should allow valid redirect URIs", () => {
      expect(validateRedirectUri("https://app.example.com/omni-connect")).toBe(true);
      expect(validateRedirectUri("https://app.example.com/omni-rhythm")).toBe(true);
      expect(validateRedirectUri("https://app.example.com/omni-momentum")).toBe(true);
      expect(validateRedirectUri("https://app.example.com/settings")).toBe(true);
      expect(validateRedirectUri("https://app.example.com/auth/callback")).toBe(true);
      expect(validateRedirectUri("https://app.example.com/auth/error")).toBe(true);
    });

    it("should allow redirect URIs with query parameters", () => {
      expect(validateRedirectUri("https://app.example.com/omni-connect?error=test")).toBe(true);
      expect(validateRedirectUri("https://app.example.com/omni-rhythm?connected=calendar")).toBe(
        true,
      );
    });

    it("should reject invalid redirect URIs", () => {
      expect(validateRedirectUri("https://evil.com/steal-tokens")).toBe(false);
      expect(validateRedirectUri("http://localhost:3000/omni-connect")).toBe(false);
      expect(validateRedirectUri("javascript:alert('xss')")).toBe(false);
      expect(validateRedirectUri("data:text/html,<script>alert('xss')</script>")).toBe(false);
      expect(validateRedirectUri("ftp://evil.com/steal")).toBe(false);
    });

    it("should reject malformed URLs", () => {
      expect(validateRedirectUri("not-a-url")).toBe(false);
      expect(validateRedirectUri("")).toBe(false);
      expect(validateRedirectUri("//evil.com")).toBe(false);
    });
  });

  describe("validateOAuthState", () => {
    it("should accept valid 64-character hex state", () => {
      const validState = "a".repeat(64);
      const result = validateOAuthState(validState);
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should reject invalid state formats", () => {
      const testCases = [
        { state: "short", expected: "State must be exactly 64 characters" },
        { state: "a".repeat(63), expected: "State must be exactly 64 characters" },
        { state: "a".repeat(65), expected: "State must be exactly 64 characters" },
        { state: "g".repeat(64), expected: "State must be a valid hex string" },
        { state: "A".repeat(64), expected: "State must be a valid hex string" },
        { state: "1234567890abcdef".repeat(3), expected: "State must be exactly 64 characters" },
      ];

      testCases.forEach(({ state, expected }) => {
        const result = validateOAuthState(state);
        expect(result.isValid).toBe(false);
        expect(result.error).toBe(expected);
      });
    });

    it("should reject empty or null state", () => {
      expect(validateOAuthState("").isValid).toBe(false);
      expect(validateOAuthState("   ").isValid).toBe(false);
    });
  });

  describe("validateOAuthCallbackQuery", () => {
    it("should accept valid callback with code", () => {
      const query = {
        code: "4/0AX4XfWh...",
        state: "a".repeat(64),
        scope: "https://www.googleapis.com/auth/gmail.readonly",
      };
      const result = validateOAuthCallbackQuery(query);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(query);
    });

    it("should accept valid callback with error", () => {
      const query = {
        error: "access_denied",
        error_description: "User denied access",
        state: "a".repeat(64),
      };
      const result = validateOAuthCallbackQuery(query);
      expect(result.isValid).toBe(true);
      expect(result.data).toEqual(query);
    });

    it("should reject callback without state", () => {
      const query = {
        code: "4/0AX4XfWh...",
      };
      const result = validateOAuthCallbackQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("State parameter is required for OAuth callback validation");
    });

    it("should reject callback with both code and error", () => {
      const query = {
        code: "4/0AX4XfWh...",
        error: "access_denied",
        state: "a".repeat(64),
      };
      const result = validateOAuthCallbackQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Exactly one of 'code' or 'error' must be present in OAuth callback",
      );
    });

    it("should reject callback with neither code nor error", () => {
      const query = {
        state: "a".repeat(64),
      };
      const result = validateOAuthCallbackQuery(query);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe(
        "Exactly one of 'code' or 'error' must be present in OAuth callback",
      );
    });

    it("should handle array query parameters", () => {
      const query = {
        code: ["4/0AX4XfWh..."],
        state: ["a".repeat(64)],
      };
      const result = validateOAuthCallbackQuery(query);
      expect(result.isValid).toBe(true);
    });
  });

  describe("validateOAuthRedirectUrl", () => {
    it("should accept valid redirect URLs", () => {
      const result = validateOAuthRedirectUrl("https://app.example.com/omni-connect");
      expect(result.isValid).toBe(true);
      expect(result.url).toBe("https://app.example.com/omni-connect");
    });

    it("should add error parameters to valid URLs", () => {
      const result = validateOAuthRedirectUrl(
        "https://app.example.com/omni-connect",
        "access_denied",
        "User denied access",
      );
      expect(result.isValid).toBe(true);
      expect(result.url).toBe(
        "https://app.example.com/omni-connect?error=access_denied&error_description=User+denied+access",
      );
    });

    it("should reject invalid redirect URLs", () => {
      const result = validateOAuthRedirectUrl("https://evil.com/steal");
      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Redirect URI not allowed: https://evil.com/steal");
    });

    it("should handle malformed URLs", () => {
      const result = validateOAuthRedirectUrl("not-a-url");
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Redirect URI not allowed");
    });
  });

  describe("validateOAuthServiceType", () => {
    it("should accept valid service types", () => {
      expect(validateOAuthServiceType("gmail")).toBe(true);
      expect(validateOAuthServiceType("calendar")).toBe(true);
      expect(validateOAuthServiceType("drive")).toBe(true);
    });

    it("should reject invalid service types", () => {
      expect(validateOAuthServiceType("facebook")).toBe(false);
      expect(validateOAuthServiceType("twitter")).toBe(false);
      expect(validateOAuthServiceType("")).toBe(false);
      expect(validateOAuthServiceType("GMAIL")).toBe(false);
    });
  });

  describe("generateOAuthState", () => {
    it("should generate valid state tokens", () => {
      const state1 = generateOAuthState();
      const state2 = generateOAuthState();

      expect(state1).toHaveLength(64);
      expect(state2).toHaveLength(64);
      expect(state1).not.toBe(state2);
      expect(/^[a-f0-9]+$/.test(state1)).toBe(true);
      expect(/^[a-f0-9]+$/.test(state2)).toBe(true);
    });

    it("should generate unique state tokens", () => {
      const states = new Set();
      for (let i = 0; i < 100; i++) {
        states.add(generateOAuthState());
      }
      expect(states.size).toBe(100);
    });
  });

  describe("validateOAuthScopes", () => {
    it("should accept valid Gmail scopes", () => {
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ];
      const result = validateOAuthScopes("gmail", scopes);
      expect(result.isValid).toBe(true);
    });

    it("should accept valid Calendar scopes", () => {
      const scopes = [
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ];
      const result = validateOAuthScopes("calendar", scopes);
      expect(result.isValid).toBe(true);
    });

    it("should accept valid Drive scopes", () => {
      const scopes = [
        "https://www.googleapis.com/auth/drive.readonly",
        "https://www.googleapis.com/auth/userinfo.email",
      ];
      const result = validateOAuthScopes("drive", scopes);
      expect(result.isValid).toBe(true);
    });

    it("should reject invalid scopes", () => {
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/drive.readonly", // Invalid for Gmail
      ];
      const result = validateOAuthScopes("gmail", scopes);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain("Invalid scopes for gmail");
    });

    it("should reject unknown service types", () => {
      const scopes = ["https://www.googleapis.com/auth/gmail.readonly"];
      const result = validateOAuthScopes("unknown" as any, scopes);
      expect(result.isValid).toBe(false);
    });
  });

  describe("sanitizeOAuthError", () => {
    it("should preserve safe OAuth error messages", () => {
      const safeErrors = [
        "invalid_grant",
        "invalid_request",
        "unauthorized_client",
        "access_denied",
        "unsupported_response_type",
        "invalid_scope",
        "server_error",
        "temporarily_unavailable",
      ];

      safeErrors.forEach((error) => {
        const result = sanitizeOAuthError(new Error(error));
        expect(result).toBe(error);
      });
    });

    it("should sanitize unsafe error messages", () => {
      const unsafeErrors = [
        "Database connection failed: user=admin, password=secret",
        "File not found: /etc/passwd",
        "SQL injection detected: '; DROP TABLE users; --",
        "Internal server error: stack trace at line 42",
      ];

      unsafeErrors.forEach((error) => {
        const result = sanitizeOAuthError(new Error(error));
        expect(result).toBe("OAuth authentication failed");
      });
    });

    it("should handle non-Error objects", () => {
      expect(sanitizeOAuthError("string error")).toBe("OAuth authentication failed");
      expect(sanitizeOAuthError(null)).toBe("OAuth authentication failed");
      expect(sanitizeOAuthError(undefined)).toBe("OAuth authentication failed");
      expect(sanitizeOAuthError({})).toBe("OAuth authentication failed");
    });

    it("should handle case-insensitive safe errors", () => {
      const result = sanitizeOAuthError(new Error("ACCESS_DENIED"));
      expect(result).toBe("ACCESS_DENIED");
    });
  });
});
