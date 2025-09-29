/**
 * Client-side Auth Service
 *
 * Provides auth utilities for client components including user management,
 * password updates, and error handling.
 */

"use client";

import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";
import { PASSWORD_MIN_LENGTH } from "@/lib/constants/auth";
import { logger } from "@/lib/observability/unified-logger";

interface SupabaseAuthError {
  code: string;
  message?: string;
}

function isSupabaseAuthError(value: unknown): value is SupabaseAuthError {
  return (
    value !== null &&
    typeof value === "object" &&
    "code" in value &&
    typeof value.code === "string" &&
    ("message" in value ? typeof value.message === "string" : true)
  );
}

const SUPABASE_ERROR_MESSAGES: Record<string, string> = {
  invalid_credentials: "Invalid email or password. Please try again.",
  email_not_confirmed: "Please check your email and click the confirmation link.",
  weak_password: `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`,
  user_already_registered: "An account with this email already exists.",
  signup_disabled: "New account registration is currently disabled.",
  too_many_requests: "Too many attempts. Please try again later.",
} as const;

/**
 * Fetch the current authenticated user
 */
export async function fetchCurrentUser(): Promise<{ user: User | null; error?: Error }> {
  try {
    const supabase = getSupabaseBrowser();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      logger.error("Error fetching current user", { operation: "fetchCurrentUser" }, new Error(error.message));
      return { user: null, error: new Error(error.message) };
    }

    return { user };
  } catch (error) {
    const errorInstance = error instanceof Error ? error : new Error(String(error));
    logger.error("Failed to fetch current user", { operation: "fetchCurrentUser" }, errorInstance);
    return { user: null, error: errorInstance };
  }
}

/**
 * Update user password
 */
export async function updateUserPassword(newPassword: string): Promise<{ error: Error | null }> {
  try {
    const supabase = getSupabaseBrowser();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      // Use structured error handling with mapped messages
      const mappedMessage = mapAuthErrorMessage(error);
      return { error: new Error(mappedMessage) };
    }

    return { error: null };
  } catch (error) {
    // Use mapAuthErrorMessage for non-Error throwables too
    const mappedMessage = mapAuthErrorMessage(error instanceof Error ? error : String(error));
    return { error: new Error(mappedMessage) };
  }
}

/**
 * Map Supabase auth error messages to user-friendly messages
 */
export function mapAuthErrorMessage(error: Error | string): string {
  const message = typeof error === "string" ? error : error.message;

  // Check for Supabase error codes first
  if (isSupabaseAuthError(error)) {
    return SUPABASE_ERROR_MESSAGES[error.code] || "An authentication error occurred.";
  }

  // Fallback to message-based checks
  if (message.includes("Invalid login credentials")) {
    return "Invalid email or password. Please try again.";
  }

  if (message.includes("Email not confirmed")) {
    return "Please check your email and click the confirmation link.";
  }

  if (message.includes("Password should be at least")) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }

  if (message.includes("User already registered")) {
    return "An account with this email already exists.";
  }

  if (message.includes("Signup is disabled")) {
    return "New account registration is currently disabled.";
  }

  if (message.includes("Too many requests")) {
    return "Too many attempts. Please try again later.";
  }

  // Return original message if no mapping found
  return message;
}
