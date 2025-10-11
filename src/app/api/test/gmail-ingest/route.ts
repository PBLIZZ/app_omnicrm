/** POST /api/test/gmail-ingest — simple Gmail ingestion test (auth required). */
import { handleAuth } from "@/lib/api";
import { GmailIngestionService } from "@/server/services/gmail-ingestion.service";
import { GmailIngestionResultDTOSchema } from "@/server/db/business-schemas/business-schema";
import {
  GmailIngestTestInputSchema,
  type GmailIngestTestInput
} from "@/server/db/business-schemas";

export const POST = handleAuth(
  GmailIngestTestInputSchema,
  GmailIngestionResultDTOSchema,
  async (_data: GmailIngestTestInput, userId) => {
    const result = await GmailIngestionService.testGmailIngestion(userId);
    return result;
  },
);
