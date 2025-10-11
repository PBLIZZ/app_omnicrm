import { handleAuth } from "@/lib/api";
import { JobProcessingService } from "@/server/services/job-processing.service";
import { SimpleJobProcessSchema, JobProcessingResultSchema } from "@/server/db/business-schemas";

/**
 * Manual job processing endpoint for testing and manual triggers
 * POST /api/jobs/process
 */
export const POST = handleAuth(
  SimpleJobProcessSchema,
  JobProcessingResultSchema,
  async (payload) => {
    const maxJobs = payload.maxJobs ?? 50;
    const result = await JobProcessingService.processAllPendingJobs(maxJobs);

    return {
      message: "Jobs processed successfully",
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    };
  },
);
