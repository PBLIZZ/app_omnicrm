/** GET /api/auth/user — get current authenticated user data */
import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { ok, err } from "@/lib/api/http";

export async function GET(): Promise<NextResponse> {
  try {
    // Get user ID securely from server-side auth (handles E2E mode)
    const userId = await getServerUserId();

    // For E2E mode, return minimal user data
    if (process.env["NODE_ENV"] !== "production" && process.env["E2E_USER_ID"]) {
      return ok({
        id: userId,
        email: "test-e2e@example.com",
        user_metadata: {
          name: "E2E Test User",
        },
        created_at: new Date().toISOString(),
      });
    }

    // For real auth, get full user data from Supabase
    const cookieStore = await cookies();
    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabasePublishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];

    if (!supabaseUrl || !supabasePublishableKey) {
      return err(500, "Server misconfigured");
    }

    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    });

    const { data, error } = await supabase.auth.getUser();

    if (error || !data?.user) {
      return err(401, "Unauthorized");
    }

    // Return user data (safe to expose to client)
    return ok({
      id: data.user.id,
      email: data.user.email,
      user_metadata: data.user.user_metadata,
      created_at: data.user.created_at,
    });
  } catch (error: unknown) {
    const status =
      typeof (error as { status?: number }).status === "number"
        ? (error as { status: number }).status
        : 401;
    const message = error instanceof Error ? error.message : "Unauthorized";
    return err(status, message);
  }
}
