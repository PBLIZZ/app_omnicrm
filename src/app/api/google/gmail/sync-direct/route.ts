/**
 * POST /api/google/gmail/sync-direct — Direct Gmail sync without background jobs
 *
 * This endpoint directly processes Gmail messages into raw_events without using
 * the job queue system. It's meant for initial sync where the user explicitly
 * clicks "Start Sync" and expects immediate processing.
 */
import { handleAuth } from "@/lib/api";
import {
  GmailSyncRequestSchema,
  GmailSyncDirectResponseSchema,
} from "@/server/db/business-schemas";
import { GmailSyncService } from "@/server/services/gmail-sync.service";

export const POST = handleAuth(
  GmailSyncRequestSchema,
  GmailSyncDirectResponseSchema,
  async (data, userId) => {
    const { incremental, overlapHours, daysBack } = data;
    const result = await GmailSyncService.syncGmailDirect(userId, {
      incremental,
      overlapHours,
      daysBack: daysBack ?? undefined,
      direct: true,
    });

    return {
      message: `Successfully imported ${result.stats.inserted} emails from the last ${daysBack ?? 365} days`,
      stats: result.stats,
    };
  },
);
