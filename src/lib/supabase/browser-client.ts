"use client";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/observability/unified-logger";

let client: SupabaseClient<unknown> | null = null;

// Debug logging helper
function debugLog(message: string, data?: unknown): void {
  if (process.env.NODE_ENV === "development") {
    logger.debug(`[SUPABASE-CLIENT-DEBUG] ${message}`, {
      operation: "supabase_client",
      additionalData: data ? { data } : undefined
    });
  }
}

export function getSupabaseBrowser(): SupabaseClient<unknown> {
  debugLog("getSupabaseBrowser called");

  if (client) {
    debugLog("Returning existing Supabase client");
    return client;
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];

  debugLog("Environment variables check:", {
    url: url ? "present" : "missing",
    key: key ? "present" : "missing",
  });

  if (!url || !key) {
    // Don't crash the build; crash only in the browser if missing
    if (typeof window !== "undefined") {
      debugLog("Missing environment variables in browser context");
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      );
    }
    // return a dummy no-op client during build (won't be used in SSR)
    debugLog("Creating dummy client for build (SSR)");
    return (client ??= createBrowserClient("http://localhost:54321", "public-key"));
  }

  debugLog("Creating new Supabase client with URL:", url);
  try {
    client = createBrowserClient(url, key);
    debugLog("Supabase client created successfully");
    return client;
  } catch (error) {
    debugLog("Error creating Supabase client:", error);
    throw error;
  }
}
