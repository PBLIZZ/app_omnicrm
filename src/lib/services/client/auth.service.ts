"use client";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase/browser-client";

// Debug logging helper
function debugLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    // Using console.warn instead of console.log for ESLint compliance
    console.warn(`[AUTH-DEBUG] ${message}`, data ? data : "");
  }
}

// Timeout promise helper
function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>(() =>
      setTimeout(() => new Error(`Operation timed out after ${timeoutMs}ms`), timeoutMs),
    ),
  ]);
}

export async function fetchCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
  debugLog("Starting fetchCurrentUser...");

  try {
    // Add timeout to prevent infinite hanging
    const authPromise = getSupabaseBrowser().auth.getUser();
    debugLog("Calling Supabase auth.getUser() with 10s timeout...");

    const { data, error } = await withTimeout(authPromise, 10000); // 10 second timeout

    if (error) {
      debugLog("Supabase auth error:", error);
      return { user: null, error } as { user: null; error: Error };
    }

    debugLog("Auth successful, user:", data.user ? "found" : "null");
    return { user: data.user, error: null };
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    debugLog("Auth exception caught:", errorMessage);

    // Provide more specific error messages
    if (errorMessage.includes("timed out")) {
      debugLog("Auth operation timed out - possible network or Supabase connection issue");
    }

    return { user: null, error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export async function updateUserPassword(newPassword: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await getSupabaseBrowser().auth.updateUser({ password: newPassword });
    return { error: (error as unknown as Error) ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}

export function mapAuthErrorMessage(message: string): string {
  const msg = message.toLowerCase();
  if (msg.includes("invalid login")) return "Invalid email or password";
  if (msg.includes("email not confirmed") || msg.includes("confirm"))
    return "Please confirm your email address to continue";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "Too many attempts. Please try again later";
  if (msg.includes("password")) return "There was a problem with your password";
  return message;
}
