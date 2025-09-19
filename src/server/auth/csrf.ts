/**
 * CSRF Token Management
 *
 * Provides server-side CSRF token generation and validation using HMAC-SHA256.
 * Integrates with the existing crypto utilities for consistent key derivation.
 */

import { hmacSign, hmacVerify, randomNonce } from "@/server/utils/crypto";

/**
 * CSRF token configuration
 */
const CSRF_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

/**
 * Generate a new CSRF token
 * Format: timestamp:nonce:signature
 */
export function generateCsrfToken(): string {
  const timestamp = Date.now().toString();
  const nonce = randomNonce(16);
  const payload = `${timestamp}:${nonce}`;
  const signature = hmacSign(payload);

  return `${payload}:${signature}`;
}

/**
 * Validate a CSRF token
 * Returns true if the token is valid and not expired
 */
export function validateCsrfToken(token: string): boolean {
  if (!token || typeof token !== "string") {
    return false;
  }

  const parts = token.split(":");
  if (parts.length !== 3) {
    return false;
  }

  const [timestampStr, nonce, signature] = parts;

  if (!timestampStr || !nonce || !signature) {
    return false;
  }

  // Verify signature
  const payload = `${timestampStr}:${nonce}`;
  if (!hmacVerify(payload, signature)) {
    return false;
  }

  // Check expiry
  const timestamp = parseInt(timestampStr, 10);
  if (isNaN(timestamp)) {
    return false;
  }

  const now = Date.now();
  if (now - timestamp > CSRF_TOKEN_EXPIRY) {
    return false;
  }

  return true;
}

/**
 * Extract CSRF token from request headers
 */
export function extractCsrfToken(headers: Headers): string | null {
  return headers.get("x-csrf-token") || null;
}

/**
 * Validate CSRF token from request headers
 */
export function validateCsrfFromRequest(request: Request): boolean {
  const token = extractCsrfToken(request.headers);
  if (!token) {
    return false;
  }

  return validateCsrfToken(token);
}

/**
 * Check if a request method requires CSRF protection
 */
export function requiresCsrfProtection(method: string): boolean {
  const mutatingMethods = ["POST", "PUT", "PATCH", "DELETE"];
  return mutatingMethods.includes(method.toUpperCase());
}

/**
 * Middleware helper to validate CSRF tokens for mutating requests
 */
export function csrfMiddleware(request: Request): { valid: boolean; error?: string } {
  const method = request.method;

  // Skip CSRF validation for non-mutating requests
  if (!requiresCsrfProtection(method)) {
    return { valid: true };
  }

  // Validate CSRF token
  if (!validateCsrfFromRequest(request)) {
    return {
      valid: false,
      error: "Invalid or missing CSRF token"
    };
  }

  return { valid: true };
}