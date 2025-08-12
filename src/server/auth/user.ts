// Reads the authenticated user id (Supabase) for API routes.
// Falls back to "x-user-id" only in dev if no session is found.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getServerUserId(): Promise<string> {
  const cookieStore = await cookies();
  // Lazily read minimal env vars here to avoid importing full env validation at module load.
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];
  if (!supabaseUrl || !supabaseAnonKey) {
    throw Object.assign(new Error("Server misconfigured"), { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  });

  const { data } = await supabase.auth.getUser();

  if (data?.user?.id) return data.user.id;

  throw Object.assign(new Error("Unauthorized"), { status: 401 });
}
