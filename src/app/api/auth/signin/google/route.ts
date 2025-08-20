import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";

// GET /auth/signin/google — starts Supabase OAuth on the server so PKCE verifier is stored in cookies
export async function GET(request: NextRequest): Promise<NextResponse> {
  const origin = new URL(request.url).origin;
  const isProd = process.env.NODE_ENV === "production";

  // Prepare a temporary response for setting cookies
  const res = NextResponse.next();

  const supabaseUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const supabaseAnonKey = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"];
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(`${origin}/login?error=server_misconfigured`);
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
      redirectTo: `${origin}/auth/callback`,
    },
  });

  if (error || !data?.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth_init_failed`);
  }

  // Redirect to Google's hosted page (or Supabase OAuth proxy) carrying Set-Cookie from this response
  const redirect = NextResponse.redirect(data.url);
  // Merge cookies we set on the temporary response
  for (const c of res.cookies.getAll()) {
    redirect.cookies.set(c);
  }
  return redirect;
}
