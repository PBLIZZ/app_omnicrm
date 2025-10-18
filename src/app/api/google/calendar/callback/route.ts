/**
 * GET /api/google/calendar/callback
 * Handles Calendar OAuth callback
 */
import { handleOAuthCallbackService } from "@/server/services/oauth.service";

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const query = Object.fromEntries(url.searchParams);

    const result = await handleOAuthCallbackService("calendar", query);

    return Response.redirect(result.redirectUrl);
  } catch (error) {
    // Log error with structured logging
    const { logError } = await import("@/server/lib/structured-logger");
    logError(
      "Calendar OAuth callback error",
      {
        operation: "calendar_oauth_callback",
        endpoint: "/api/google/calendar/callback",
      },
      error,
    );

    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-rhythm?error=oauth_failed`,
    );
  }
}
