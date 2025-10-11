/** GET /api/auth/user — get current authenticated user data */
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { handleGet } from "@/lib/api";
import { z } from "zod";

const UserResponseSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  user_metadata: z.record(z.string(), z.unknown()).optional(),
  created_at: z.string(),
});

type UserResponse = z.infer<typeof UserResponseSchema>;

async function getUserData(): Promise<UserResponse> {
  // For E2E mode, return minimal user data
  if (process.env["NODE_ENV"] !== "production" && process.env["E2E_USER_ID"]) {
    return {
      id: process.env["E2E_USER_ID"],
      email: "test-e2e@example.com",
      user_metadata: {
        name: "E2E Test User",
      },
      created_at: new Date().toISOString(),
    };
  }

  // For real auth, get full user data from Supabase
  const cookieStore = await cookies();
  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabasePublishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];

  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Server misconfigured");
  }

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll(): { name: string; value: string }[] {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[],
      ): void {
        try {
          cookiesToSet.forEach(({ name, value, options }): void => {
            if (options) {
              cookieStore.set(name, value, options);
            } else {
              cookieStore.set(name, value);
            }
          });
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
    throw new Error("Unauthorized");
  }

  // Return user data (safe to expose to client)
  // UserMetadata from Supabase is compatible with Record<string, unknown>
  const metadata = data.user.user_metadata;
  const userMetadata: Record<string, unknown> | undefined = metadata
    ? Object.fromEntries(Object.entries(metadata))
    : undefined;

  return {
    id: data.user.id,
    email: data.user.email ?? null,
    user_metadata: userMetadata,
    created_at: data.user.created_at,
  };
}

export const GET = handleGet(UserResponseSchema, getUserData);
