/** GET /api/google/gmail/labels — fetch Gmail labels for authenticated user */

import { handleGetWithQueryAuth } from "@/lib/api";
import { OAuthStartQuerySchema, GmailLabelsResponseSchema } from "@/server/db/business-schemas";
import { GmailLabelsService } from "@/server/services/gmail-labels.service";

export const GET = handleGetWithQueryAuth(OAuthStartQuerySchema, GmailLabelsResponseSchema, async (_query, userId) => {
  return await GmailLabelsService.getUserLabels(userId);
});
