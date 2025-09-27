/** GET /api/google/gmail/oauth — start Gmail OAuth (auth required). Errors: 401 Unauthorized */
import { handleAuthFlow } from "@/lib/api-edge-cases";
import { OAuthStartQuerySchema } from "@/server/db/business-schemas";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { getServerUserId } from "@/server/auth/user";

// GET /api/google/gmail/oauth - specific Gmail readonly authorization
export const GET = handleAuthFlow(OAuthStartQuerySchema, async (_query, request) => {
  const userId = await getServerUserId();
  const result = await GoogleOAuthService.startOAuthFlow(userId, "gmail");

  if (!result.success) {
    // For OAuth flows, we return error responses as redirects to error page
    const errorUrl = new URL('/auth/error', request.url);
    errorUrl.searchParams.set('error', result.error);
    return Response.redirect(errorUrl.toString(), 302);
  }

  // The service returns a NextResponse with redirect, we need to extract it
  return result.response;
});
