// Admin API endpoint for email intelligence processing
// For testing and manual triggering of email intelligence jobs

import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";

/**
 * POST /api/admin/email-intelligence
 * Trigger email intelligence processing for raw Gmail events
 */
export const POST = createRouteHandler({
  auth: false,
  rateLimit: { operation: "email_intelligence_trigger" },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("email_intelligence.trigger", requestId);
  return api.error("Temporarily disabled for build fix", "INTERNAL_ERROR", undefined, undefined);
});

/**
 * GET /api/admin/email-intelligence
 * Get email intelligence statistics and recent processed emails
 */
export const GET = createRouteHandler({
  auth: false,
  rateLimit: { operation: "email_intelligence_stats" },
})(async ({ requestId }) => {
  const api = new ApiResponseBuilder("email_intelligence.stats", requestId);
  return api.error("Temporarily disabled for build fix", "INTERNAL_ERROR", undefined, undefined);
});
