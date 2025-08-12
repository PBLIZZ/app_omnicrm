// Reads the authenticated user id (Supabase) for API routes.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getServerUserId(): Promise<string> {
  const cookieStore = await cookies();
  // Lazily read minimal env vars here to avoid importing full env validation at module load.
  // Use the publishable (anon) key for RLS-aware server client, never the service-role secret.
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabasePublishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];
  if (!supabaseUrl || !supabasePublishableKey) {
    throw Object.assign(new Error("Server misconfigured"), { status: 500 });
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (data?.user?.id) return data.user.id;

  throw Object.assign(new Error("Unauthorized"), { status: 401 });
}
