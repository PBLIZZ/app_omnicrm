import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { env } from "@/server/lib/env";

export const dynamic = "force-dynamic";

export const GET = createRouteHandler({
  auth: false,
  rateLimit: { operation: "debug_env" },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("debug_env", requestId);

  if (env.NODE_ENV === "production") {
    return api.notFound("Not found");
  }

  const url = process.env["NEXT_PUBLIC_SUPABASE_URL"] ?? "<undefined>";
  const key = process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY"] ?? "<undefined>";
  const gmailRedirect = process.env["GOOGLE_GMAIL_REDIRECT_URI"] ?? "<undefined>";
  const calendarRedirect = process.env["GOOGLE_CALENDAR_REDIRECT_URI"] ?? "<undefined>";

  return api.success({
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
});
