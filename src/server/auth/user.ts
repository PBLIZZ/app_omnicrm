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
        getAll() {
          const all = cookieStore.getAll?.() ?? [];
          return all.map((c: { name: string; value: string }) => ({
            name: c.name,
            value: c.value,
          }));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  if (data?.user?.id) return data.user.id;

  throw Object.assign(new Error("Unauthorized"), { status: 401 });
}
