"use client";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export async function signOut(): Promise<{ error: Error | null }> {
  try {
    const { error } = await getSupabaseBrowser().auth.signOut();
    return { error: (error as unknown as Error) ?? null };
  } catch (e) {
    return { error: e instanceof Error ? e : new Error(String(e)) };
  }
}
