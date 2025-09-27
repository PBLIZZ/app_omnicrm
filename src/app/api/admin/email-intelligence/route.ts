// Admin API endpoint for email intelligence processing
// For testing and manual triggering of email intelligence jobs

import { handleAuth } from "@/lib/api";
import { handlePublicGet } from "@/lib/api-edge-cases";
import {
  EmailIntelligenceTriggerSchema,
  EmailIntelligenceResponseSchema,
  type EmailIntelligenceResponse
} from "@/server/db/business-schemas";

/**
 * POST /api/admin/email-intelligence
 * Trigger email intelligence processing for raw Gmail events
 */
export const POST = handleAuth(
  EmailIntelligenceTriggerSchema,
  EmailIntelligenceResponseSchema,
  async (_data, _userId): Promise<EmailIntelligenceResponse> => {
    // TODO:REINSTATE-#1234 - Temporarily disabled for build fix (2025-01-XX)
    // Owner: Development Team
    // Reason: Email intelligence processing causing build failures
    // Link: https://github.com/your-org/app_omnicrm/issues/1234
    // When to remove: After fixing email intelligence processing issues
    return {
      error: "Temporarily disabled for build fix",
      timestamp: new Date().toISOString(),
    };
  }
);

/**
 * GET /api/admin/email-intelligence
 * Get email intelligence statistics and recent processed emails
 */
export const GET = handlePublicGet(
  EmailIntelligenceResponseSchema,
  async (): Promise<EmailIntelligenceResponse> => {
    // TODO:REINSTATE-#1234 - Temporarily disabled for build fix (2025-01-XX)
    // Owner: Development Team
    // Reason: Email intelligence processing causing build failures
    // Link: https://github.com/your-org/app_omnicrm/issues/1234
    // When to remove: After fixing email intelligence processing issues
    return {
      error: "Temporarily disabled for build fix",
      timestamp: new Date().toISOString(),
    };
  }
);
