/**
 * Supabase Authentication Service
 *
 * Service for handling Supabase OAuth flows and authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/server/lib/env";
import { logger } from "@/lib/observability";

export type OAuthInitResult =
  | {
      success: true;
      redirectResponse: NextResponse;
    }
  | {
      success: false;
      errorResponse: NextResponse;
    };

export type AuthCallbackResult =
  | {
      success: true;
      redirectResponse: NextResponse;
    }
  | {
      success: false;
      errorResponse: NextResponse;
    };

export class SupabaseAuthService {
  /**
   * Initialize Google OAuth flow through Supabase
   */
  static async initializeGoogleOAuth(request: NextRequest): Promise<OAuthInitResult> {
    const origin = new URL(request.url).origin;
    const isProd = process.env.NODE_ENV === "production";

    // Prepare a temporary response for setting cookies
    const res = NextResponse.next();

    const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const supabasePublishableKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];

    if (!supabaseUrl || !supabasePublishableKey) {
      return {
        success: false,
        errorResponse: NextResponse.redirect(`${origin}/login?error=server_misconfigured`),
      };
    }

    const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
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

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/api/auth/callback`,
      },
    });

    if (error || !data?.url) {
      return {
        success: false,
        errorResponse: NextResponse.redirect(`${origin}/login?error=oauth_init_failed`),
      };
    }

    // Redirect to Google's hosted page (or Supabase OAuth proxy) carrying Set-Cookie from this response
    const redirect = NextResponse.redirect(data.url);

    // Merge cookies we set on the temporary response
    for (const c of res.cookies.getAll()) {
      redirect.cookies.set(c);
    }

    return {
      success: true,
      redirectResponse: redirect,
    };
  }

  /**
   * Handle OAuth callback and complete the authentication flow
   */
  static async handleOAuthCallback(request: NextRequest): Promise<AuthCallbackResult> {
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
        return {
          success: false,
          errorResponse: NextResponse.redirect(`${origin}/login?error=server_misconfigured`),
        };
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
        return {
          success: false,
          errorResponse: NextResponse.redirect(`${origin}/login?error=oauth_failed`),
        };
      }
    }

    // Redirect to home page or dashboard after successful login, with cookies attached
    return {
      success: true,
      redirectResponse: res,
    };
  }
}
