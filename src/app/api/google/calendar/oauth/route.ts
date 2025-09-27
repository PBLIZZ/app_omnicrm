/** GET /api/google/calendar/oauth — start Calendar OAuth (auth required). Errors: 401 Unauthorized */
import { handleAuthFlow } from "@/lib/api-edge-cases";
import { GoogleOAuthService } from "@/server/services/google-oauth.service";
import { z } from "zod";

// Empty query schema for OAuth start (no query parameters expected)
const QuerySchema = z.object({});

export const GET = handleAuthFlow(QuerySchema, async (query, request) => {
  // OAuth flows need to extract userId manually since they handle their own auth
  const { getServerUserId } = await import("@/server/auth/user");
  const userId = await getServerUserId();

  const result = await GoogleOAuthService.startOAuthFlow(userId, "calendar");

  if (!result.success) {
    // For OAuth flows, we still return Response objects, not NextResponse.json
    return new Response(JSON.stringify({ error: result.error }), {
      status: result.status,
      headers: { "content-type": "application/json" }
    });
  }

  return result.response;
});
