"use client";
import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient<unknown> | null = null;

export function getSupabaseBrowser(): SupabaseClient<unknown> {
  if (client) return client;
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];
  if (!url || !key) {
    // Don't crash the build; crash only in the browser if missing
    if (typeof window !== "undefined") {
      throw new Error(
        "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY",
      );
    }
    // return a dummy no-op client during build (won't be used in SSR)
    return (client ??= createBrowserClient("http://localhost:54321", "public-key"));
  }
  client = createBrowserClient(url, key);
  return client;
}
