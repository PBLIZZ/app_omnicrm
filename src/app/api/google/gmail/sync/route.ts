/**
 * POST /api/google/gmail/sync — Consolidated Gmail sync endpoint
 *
 * This endpoint directly processes Gmail messages into raw_events with optimal
 * performance. Replaces the scattered sync endpoints with a single, focused route.
 *
 * Key Features:
 * - Direct sync without background jobs (for immediate processing)
 * - Incremental sync from last successful raw_event
 * - Parallel processing for high throughput
 * - Automatic normalization job enqueuing
 */
import { handleAuth } from "@/lib/api";
import { GmailSyncRequestSchema, GmailSyncResponseSchema } from "@/server/db/business-schemas";
import { GmailSyncService } from "@/server/services/gmail-sync.service";

export const POST = handleAuth(GmailSyncRequestSchema, GmailSyncResponseSchema, async (data, userId) => {
  const { incremental, overlapHours, daysBack } = data;

  const result = await GmailSyncService.syncGmail(userId, {
    incremental,
    overlapHours,
    daysBack: daysBack ?? undefined,
  });

  return result;
});