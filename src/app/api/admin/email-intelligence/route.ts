// Admin API endpoint for email intelligence processing
// For testing and manual triggering of email intelligence jobs

import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/lib/middleware-handler";

/**
 * POST /api/admin/email-intelligence
 * Trigger email intelligence processing for raw Gmail events
 */
export const POST = createRouteHandler({
  auth: false,
  rateLimit: { operation: "email_intelligence_trigger" },
})(async ({}) => {
  // TODO:REINSTATE-#1234 - Temporarily disabled for build fix (2025-01-XX)
  // Owner: Development Team
  // Reason: Email intelligence processing causing build failures
  // Link: https://github.com/your-org/app_omnicrm/issues/1234
  // When to remove: After fixing email intelligence processing issues
  return NextResponse.json({ error: "Temporarily disabled for build fix" }, { status: 500 });
});

/**
 * GET /api/admin/email-intelligence
 * Get email intelligence statistics and recent processed emails
 */
export const GET = createRouteHandler({
  auth: false,
  rateLimit: { operation: "email_intelligence_stats" },
})(async ({}) => {
  // TODO:REINSTATE-#1234 - Temporarily disabled for build fix (2025-01-XX)
  // Owner: Development Team
  // Reason: Email intelligence processing causing build failures
  // Link: https://github.com/your-org/app_omnicrm/issues/1234
  // When to remove: After fixing email intelligence processing issues
  return NextResponse.json({ error: "Temporarily disabled for build fix" }, { status: 500 });
});
