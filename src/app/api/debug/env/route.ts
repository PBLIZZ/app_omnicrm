import { env } from "@/lib/env";
import { ok, err } from "@/lib/api/http";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  if (env.NODE_ENV === "production") {
    return err(404, "not_found", { message: "Not found" });
  }
  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "<undefined>";
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"] ?? "<undefined>";
  const gmailRedirect = process.env["GOOGLE_GMAIL_REDIRECT_URI"] ?? "<undefined>";
  const calendarRedirect = process.env["GOOGLE_CALENDAR_REDIRECT_URI"] ?? "<undefined>";
  return ok({
    env: {
      NEXT_PUBLIC_SUPABASE_URL: url,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY: key
        ? `${key.slice(0, 6)}…${key.slice(-4)}`
        : key,
      GOOGLE_GMAIL_REDIRECT_URI: gmailRedirect,
      GOOGLE_CALENDAR_REDIRECT_URI: calendarRedirect,
      NODE_ENV: env.NODE_ENV,
    },
  });
}
