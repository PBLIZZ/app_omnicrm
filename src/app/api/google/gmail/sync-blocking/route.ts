/**
 * POST /api/google/gmail/sync-blocking — Blocking Gmail sync with real-time progress
 *
 * This endpoint provides a complete synchronous Gmail sync experience:
 * - Creates sync session for tracking progress
 * - Imports Gmail messages into raw_events
 * - Immediately processes normalization jobs
 * - Updates session progress in real-time
 * - Returns complete results when finished
 *
 * Key Features:
 * - Blocking operation with progress tracking
 * - Session-based progress updates
 * - Immediate job processing (no background queuing)
 * - Error resilience with partial failure handling
 * - Cache invalidation triggers
 */
import { handleAuth } from "@/lib/api";
import { GmailSyncRequestSchema, GmailSyncBlockingResponseSchema } from "@/server/db/business-schemas";
import { GmailSyncBlockingService } from "@/server/services/gmail-sync-blocking.service";

export const POST = handleAuth(GmailSyncRequestSchema, GmailSyncBlockingResponseSchema, async (data, userId) => {
  return await GmailSyncBlockingService.executeBlockingSync(userId, data);
});
