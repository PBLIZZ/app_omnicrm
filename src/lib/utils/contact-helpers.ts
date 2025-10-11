/**
 * Contact Utilities
 *
 * Shared utility functions for contact operations across the application.
 * Provides data transformation and validation helpers.
 */

import validator from "validator";

// ---------- Data Transformation Helpers ----------

/**
 * Converts a value to repository format (string | null)
 * Handles undefined, empty strings, and whitespace-only strings
 */
export function toRepositoryFormat(value: string | null | undefined): string | null {
  if (typeof value === "string" && value.trim().length === 0) return null;
  return value ?? null;
}

/**
 * Normalizes display name for consistency
 * Trims whitespace and ensures proper capitalization
 */
export function normalizeDisplayName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Validates email format using battle-tested validator library
 * Returns true if email appears valid, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") {
    return false;
  }
  return validator.isEmail(email.trim());
}

/**
 * Validates phone number format (basic validation)
 * Returns true if phone appears valid, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  // Remove all non-digits and check if we have at least 10 digits
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/**
 * Sanitizes contact input data
 * Applies normalization and null handling
 */
export function sanitizeContactInput<
  T extends {
    displayName: string;
    primaryEmail?: string | null | undefined;
    primaryPhone?: string | null | undefined;
  },
>(
  input: T,
): T & {
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
} {
  return {
    ...input,
    displayName: normalizeDisplayName(input.displayName),
    primaryEmail: toRepositoryFormat(input.primaryEmail),
    primaryPhone: toRepositoryFormat(input.primaryPhone),
  };
}

// ---------- Type Helpers ----------

/**
 * Contact source types
 */
export const CONTACT_SOURCES = ["manual", "gmail_import", "upload", "calendar_import"] as const;

export type ContactSource = (typeof CONTACT_SOURCES)[number];

/**
 * Validates if a string is a valid contact source
 */
export function isValidContactSource(source: string): source is ContactSource {
  return CONTACT_SOURCES.includes(source as ContactSource);
}
