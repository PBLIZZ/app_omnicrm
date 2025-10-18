/**
 * GET /api/google/calendar/connect
 * Initiates Calendar OAuth flow (GET request - no CSRF needed)
 */
import { initializeOAuthService } from "@/server/services/oauth.service";
import { AppError } from "@/lib/errors/app-error";

export async function GET(): Promise<Response> {
  try {
    const result = await initializeOAuthService("calendar");

    if (!result.success) {
      const { error } = result;
      throw new AppError(error, "OAUTH_ERROR", "validation", false, 400);
    }

    return Response.redirect(result.authUrl);
  } catch (error) {
    // Log error with structured logging
    const { logError } = await import("@/server/lib/structured-logger");
    logError(
      "Calendar OAuth initialization error",
      {
        operation: "calendar_oauth_init",
        endpoint: "/api/google/calendar/connect",
      },
      error,
    );

    return Response.redirect(
      `${process.env["NEXT_PUBLIC_APP_URL"]}/omni-rhythm?error=oauth_init_failed`,
    );
  }
}
