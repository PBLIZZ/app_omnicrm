/** GET /api/google/gmail/callback — handle Gmail OAuth redirect (auth required). Errors: 400 invalid_state|missing_code_or_state, 401 Unauthorized */
import { handleAuthFlow } from "@/lib/api-edge-cases";
import { GmailOAuthCallbackQuerySchema } from "@/server/db/business-schemas";
import { getServerUserId } from "@/server/auth/user";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";

export const GET = handleAuthFlow(GmailOAuthCallbackQuerySchema, async (query, request) => {
  const userId = await getServerUserId();
  const { code, state } = query;

  if (!code || !state) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("error", "missing_code_or_state");
    return Response.redirect(errorUrl.toString(), 302);
  }

  const cookieHeader = request.headers.get("cookie");
  const gmailAuthMatch = cookieHeader?.match(/(?:^|;\s*)gmail_auth=([^;]+)/);
  const cookieValue = gmailAuthMatch?.[1] ?? "";
  if (!cookieValue) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("error", "invalid_state");
    return Response.redirect(errorUrl.toString(), 302);
  }

  const result = await GoogleOAuthService.handleOAuthCallback(
    userId,
    "gmail",
    { code, state, cookieValue },
    request.url,
  );

  if (!result.success) {
    const errorUrl = new URL("/auth/error", request.url);
    errorUrl.searchParams.set("error", result.error);
    return Response.redirect(errorUrl.toString(), 302);
  }

  // Clear nonce cookie and redirect to sync setup step
  const response = Response.redirect(new URL(result.redirectUrl, request.url).toString(), 302);
  const cookieConfig = GoogleOAuthService.clearOAuthCookie("gmail");

  // Add cookie clearing to response headers
  response.headers.set(
    "Set-Cookie",
    `${cookieConfig.name}=; ${Object.entries(cookieConfig.options)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ")}`,
  );

  return response;
});
