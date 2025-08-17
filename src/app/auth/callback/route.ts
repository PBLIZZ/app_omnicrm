import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  // Always prepare the redirect response first so we can attach Set-Cookie to it
  const res = NextResponse.redirect(`${origin}/`);

  if (code) {
    // Bind Supabase cookie adapter to the redirect response so Set-Cookie is returned to the browser
    const isProd = env.NODE_ENV === "production";
    const supabase = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
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
      },
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (env.NODE_ENV !== "production") {
      logger.debug(
        "Auth callback completed",
        {
          hasUser: !!data?.user,
          hasError: Boolean(error),
        },
        "auth/callback/GET",
      );
    }

    if (error) {
      if (env.NODE_ENV !== "production") {
        logger.error("OAuth callback error", error, "auth/callback/GET");
      }
      return NextResponse.redirect(`${origin}/login?error=oauth_failed`);
    }
  }

  // Redirect to home page or dashboard after successful login, with cookies attached
  return res;
}
