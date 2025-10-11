/** POST /api/test/gmail-ingest — simple Gmail ingestion test (auth required). */
import { handleAuth } from "@/lib/api";
import { GmailSyncService } from "@/server/services/gmail-sync.service";
import { GmailIngestionResultDTOSchema } from "@/server/db/business-schemas/gmail";
import {
  GmailIngestTestInputSchema,
  type GmailIngestTestInput,
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  GmailIngestTestInputSchema,
  GmailIngestionResultDTOSchema,
  async (_data: GmailIngestTestInput, userId) => {
    const result = await GmailSyncService.testGmailIngestion(userId);
    return result;
  },
);
