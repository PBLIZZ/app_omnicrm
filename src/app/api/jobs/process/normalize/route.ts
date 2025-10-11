import { handleAuth } from "@/lib/api";
import { JobProcessingService } from "@/server/services/job-processing.service";
import { SimpleJobProcessSchema, NormalizeJobResultSchema } from "@/server/db/business-schemas";

/**
 * Manual processor for normalize jobs only
 * Development only - processes queued normalize jobs
 */
export const POST = handleAuth(SimpleJobProcessSchema, NormalizeJobResultSchema, async (_, userId) => {
  const result = await JobProcessingService.processNormalizationJobs(userId);

  return {
    message: result.message,
    processed: result.processed,
    succeeded: result.succeeded,
    failed: result.failed,
  };
});
