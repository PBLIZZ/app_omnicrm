import { handleAuth } from "@/lib/api";
import { JobCreationService } from "@/server/services/job-creation.service";
import { SimpleJobProcessSchema, RawEventsJobResultSchema } from "@/server/db/business-schemas";

/**
 * Manual processor for raw_events → interactions transformation
 * Development only - creates normalize jobs for Gmail raw events
 */
export const POST = handleAuth(
  SimpleJobProcessSchema,
  RawEventsJobResultSchema,
  async (_, userId) => {
    const result = await JobCreationService.createRawEventJobs(userId);

    return {
      message: result.message,
      processed: result.processed,
      totalRawEvents: result.totalItems,
    };
  },
);
