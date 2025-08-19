import { env } from "@/lib/env";
import { ok, err } from "@/server/http/responses";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (env.NODE_ENV === "production") {
    return err(404, "not_found", { message: "Not found" });
  }
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "<undefined>";
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"] ?? "<undefined>";
  const googleRedirect = process.env["GOOGLE_REDIRECT_URI"] ?? "<undefined>";
  return ok({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: key
        ? `${key.slice(0, 6)}…${key.slice(-4)}`
        : key,
      GOOGLE_REDIRECT_URI: googleRedirect,
      NODE_ENV: env.NODE_ENV,
    },
  });
}
