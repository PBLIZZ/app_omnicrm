/** GET /api/google/calendar/callback — handle Calendar OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { handleAuthFlow } from "@/lib/api-edge-cases";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { CalendarOAuthQuerySchema } from "@/server/db/business-schemas/calendar";

export const GET = handleAuthFlow(CalendarOAuthQuerySchema, async (query, request) => {
  // OAuth flows need to extract userId manually since they handle their own auth
  const { getServerUserId } = await import("@/server/auth/user");
  const userId = await getServerUserId();

  const { code, state } = query;

  if (!code || !state) {
    const errorUrl = new URL("/omni-rhythm?error=missing_code_or_state", request.url);
    return Response.redirect(errorUrl.toString(), 302);
  }

  // Extract cookie value from request
  const cookies = request.headers.get("cookie");
  const cookieValue = cookies?.match(/calendar_auth=([^;]+)/)?.[1] ?? "";

  if (!cookieValue) {
    const errorUrl = new URL("/omni-rhythm?error=invalid_state", request.url);
    return Response.redirect(errorUrl.toString(), 302);
  }

  const result = await GoogleOAuthService.handleOAuthCallback(
    userId,
    "calendar",
    { code, state, cookieValue },
    request.url,
  );

  if (!result.success) {
    // Clear nonce cookie even on error
    const errorUrl = new URL(`/omni-rhythm?error=${encodeURIComponent(result.error)}`, request.url);
    const response = Response.redirect(errorUrl.toString(), 302);
    const cookieConfig = GoogleOAuthService.clearOAuthCookie("calendar");
    response.headers.set(
      "Set-Cookie",
      `${cookieConfig.name}=; ${Object.entries(cookieConfig.options)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ")}`,
    );
    return response;
  }

  // Clear nonce cookie and redirect to Omni Rhythm for post-connect sync setup
  const successUrl = new URL("/omni-rhythm?connected=true&step=calendar-sync", request.url);
  const response = Response.redirect(successUrl.toString(), 302);
  const cookieConfig = GoogleOAuthService.clearOAuthCookie("calendar");
  response.headers.set(
    "Set-Cookie",
    `${cookieConfig.name}=; ${Object.entries(cookieConfig.options)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")}`,
  );

  return response;
});
