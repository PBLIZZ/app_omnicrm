/**
 * Simple, self-contained auth utilities for Next.js + Supabase
 * No helpers, no utils, just straightforward auth that works
 */

import { createServerClient } from "@supabase/ssr";
import { createBrowserClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ============================================================================
// SERVER-SIDE AUTH (for Server Components and API Routes)
// ============================================================================

/**
 * Get authenticated user ID on the server
 * Throws if not authenticated
 */
export async function getAuthUserId(): Promise<string> {
  const cookieStore = await cookies();
  
  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => 
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore - called from Server Component
          }
        },
      },
    }
  );

  // Use getUser for secure authentication (validates with Supabase Auth server)
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error) {
    console.error("[AUTH] User error:", error);
    throw new Error("Unauthorized");
  }

  if (!user?.id) {
    console.log("[AUTH] No user found");
    throw new Error("Unauthorized");
  }

  return user.id;
}

/**
 * Check if user is authenticated on the server
 * Returns user ID or null
 */
export async function getAuthUserIdOrNull(): Promise<string | null> {
  try {
    return await getAuthUserId();
  } catch {
    return null;
  }
}

// ============================================================================
// CLIENT-SIDE AUTH (for Client Components)
// ============================================================================

/**
 * Get Supabase client for browser
 * Use this in Client Components
 */
export function getSupabaseBrowser() {
  return createBrowserClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]!
  );
}

/**
 * Get current user in Client Component
 */
export async function getCurrentUser() {
  const supabase = getSupabaseBrowser();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    console.error("Auth error:", error);
    return null;
  }
  
  return user;
}

/**
 * Sign in with email/password
 */
export async function signIn(email: string, password: string) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

/**
 * Sign up with email/password
 */
export async function signUp(email: string, password: string) {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  return { data, error };
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = getSupabaseBrowser();
  const { error } = await supabase.auth.signOut();
  
  return { error };
}

/**
 * Sign in with Google OAuth
 */
export async function signInWithGoogle() {
  const supabase = getSupabaseBrowser();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });
  
  return { data, error };
}
