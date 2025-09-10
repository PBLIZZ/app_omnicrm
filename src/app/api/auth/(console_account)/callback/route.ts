import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/server/lib/env";
import { logger } from "@/lib/observability";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  // Always prepare the redirect response first so we can attach Set-Cookie to it
  const res = NextResponse.redirect(`${origin}/`);

  if (code) {
    // Bind Supabase cookie adapter to the redirect response so Set-Cookie is returned to the browser
    const isProd = env.NODE_ENV === "production";
    const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

    if (typeof supabaseUrl !== "string" || typeof supabaseKey !== "string") {
      throw new Error("Missing Supabase environment variables");
    }

    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: { [key: string]: unknown }) {
          res.cookies.set(name, value, { ...options, secure: isProd });
        },
        remove(name: string, options: { [key: string]: unknown }) {
          res.cookies.set(name, "", { ...options, maxAge: 0, secure: isProd });
        },
      },
    });

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (env.NODE_ENV !== "production") {
      void logger.debug("Auth callback completed", {
        operation: "auth/callback/GET",
        additionalData: {
          hasUser: !!data?.user,
          hasError: Boolean(error),
        },
      });
    }

    if (error) {
      if (env.NODE_ENV !== "production") {
        void logger.error("OAuth callback error", { operation: "auth/callback/GET" }, error);
      }
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
  }

  // Redirect to home page or dashboard after successful login, with cookies attached
  return res;
}
