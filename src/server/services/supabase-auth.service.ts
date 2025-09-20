/**
 * Supabase Authentication Service
 *
 * Service for handling Supabase OAuth flows and authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export type OAuthInitResult = {
  success: true;
  redirectResponse: NextResponse;
} | {
  success: false;
  errorResponse: NextResponse;
}

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
    const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];

    if (!supabaseUrl || !supabaseAnonKey) {
      return {
        success: false,
        errorResponse: NextResponse.redirect(`${origin}/login?error=server_misconfigured`),
      };
    }

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
}