/**
 * POST /api/google/gmail/preview — Generate preview of Gmail sync data volume
 *
 * Estimates the number of emails and data size that would be synced based on user preferences.
 * Does not perform actual sync, only provides estimates for user confirmation.
 */

import { handleAuth } from "@/lib/api";
import { GmailPreviewRequestSchema, GmailPreviewResponseSchema } from "@/server/db/business-schemas";
import { GmailPreviewService } from "@/server/services/gmail-preview.service";

export const POST = handleAuth(GmailPreviewRequestSchema, GmailPreviewResponseSchema, async (data, userId) => {
  return await GmailPreviewService.generateGmailPreview(userId, data);
});
