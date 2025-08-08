"use client";
import { createClient } from "@supabase/supabase-js";

export const supabaseBrowser = createClient(
  process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
  process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]!,
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
);
