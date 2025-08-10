// Reads the authenticated user id (Supabase) for API routes.
// Falls back to "x-user-id" only in dev if no session is found.

import { cookies, headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getServerUserId(): Promise<string> {
  const cookieStore: any = cookies();
  const supabase = createServerClient(
    process.env["NEXT_PUBLIC_SUPABASE_URL"]!,
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"]! ||
      process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"]!,
    {
      cookies: {
        getAll() {
          return (cookieStore.getAll?.() ?? []).map((c: { name: string; value: string }) => ({
            name: c.name,
            value: c.value,
          }));
        },
      },
    },
  );

  const { data } = await supabase.auth.getUser();
  if (data?.user?.id) return data.user.id;

  const hdrs: any = headers();
  const devHeader = hdrs.get?.("x-user-id");
  if (process.env.NODE_ENV !== "production" && devHeader) return devHeader;

  throw Object.assign(new Error("Unauthorized"), { status: 401 });
}
