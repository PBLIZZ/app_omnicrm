"use client";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export async function fetchCurrentUser(): Promise<{ user: User | null; error: Error | null }> {
  try {
    const { data, error } = await getSupabaseBrowser().auth.getUser();
    if (error) return { user: null, error } as { user: null; error: Error };
    return { user: data.user, error: null };
  } catch (e) {
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
