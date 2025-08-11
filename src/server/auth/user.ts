// Reads the authenticated user id (Supabase) for API routes.
// Falls back to "x-user-id" only in dev if no session is found.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

export async function getServerUserId(): Promise<string> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // no-op in API route context
        },
        remove() {
          // no-op in API route context
        },
      },
    },
  );

  const { data, error } = await supabase.auth.getUser();

  // Debug logging
  console.warn(`[DEBUG] getServerUserId - User data:`, {
    hasUser: !!data?.user,
    userId: data?.user?.id,
    error: error?.message,
    cookies: cookieStore.getAll().map((c) => c.name),
  });

  if (data?.user?.id) return data.user.id;

  throw Object.assign(new Error("Unauthorized"), { status: 401 });
}
