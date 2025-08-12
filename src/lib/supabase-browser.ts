"use client";
import { createBrowserClient } from "@supabase/ssr";

let _client: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowser() {
  if (_client) return _client;
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
    return (_client ??= createBrowserClient("http://localhost:54321", "public-key"));
  }
  _client = createBrowserClient(url, key);
  return _client;
}
