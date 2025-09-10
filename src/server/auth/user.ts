// Reads the authenticated user id (Supabase) for API routes.

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export async function getServerUserId(): Promise<string> {
  // E2E/dev: allow fixed user via env without requiring prior cookie roundtrip
  if (process.env["NODE_ENV"] !== "production" && process.env["ENABLE_E2E_AUTH"] === "true") {
    const eid = process.env["E2E_USER_ID"];
    if (eid && eid.length > 0) {
      // Note: Using process.stderr for security logging in test mode to avoid no-console violations
      process.stderr.write(`SECURITY: E2E AUTH BYPASS: ${eid} at ${new Date().toISOString()}\n`);
      return eid;
    }
  }
  // E2E/browser flows: allow a fixed user via cookie when not in production
  try {
    const cookieStore = await cookies();
    const e2eUid = cookieStore.get("e2e_uid")?.value;
    if (e2eUid && process.env["NODE_ENV"] !== "production") {
      return e2eUid;
    }
  } catch {
    // ignore cookie read failures and proceed with normal auth
  }
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
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (data?.user?.id) return data.user.id;

  throw Object.assign(new Error("Unauthorized"), { status: 401 });
}
