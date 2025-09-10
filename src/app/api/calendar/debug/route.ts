import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "calendar_debug" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("calendar_debug", requestId);
  try {
    const db = await getDb();

    // Check for calendar integration
    const integration = await db.execute(sql`
      SELECT 
        user_id,
        provider,
        service,
        CASE WHEN access_token IS NOT NULL THEN 'present' ELSE 'missing' END as access_token_status,
        CASE WHEN refresh_token IS NOT NULL THEN 'present' ELSE 'missing' END as refresh_token_status,
        expiry_date,
        created_at,
        updated_at
      FROM user_integrations
      WHERE user_id = ${userId}
      AND provider = 'google'
      AND service = 'calendar'
    `);

    const rows = (integration as unknown as { rows: Array<Record<string, unknown>> }).rows;

    // Check if tokens are expired
    const now = new Date();
    const integrationData = rows[0];
    let tokenStatus = "not_found";

    if (integrationData) {
      const expiryDate = integrationData["expiry_date"];
      if (expiryDate && new Date(expiryDate as string) < now) {
        tokenStatus = "expired";
      } else {
        tokenStatus = "valid";
      }
    }

    return api.success({
      hasIntegration: Boolean(integrationData),
      tokenStatus,
      integration: integrationData ?? null,
      currentTime: now.toISOString(),
    });
  } catch (error) {
    return api.error(
      "Failed to debug calendar integration",
      "DATABASE_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
