import { handleAuth } from "@/lib/api";
import { JobProcessingService } from "@/server/services/job-processing.service";
import { SimpleJobProcessSchema, JobProcessingResultSchema } from "@/server/db/business-schemas";

/**
 * POST /api/jobs/runner - Process user-specific jobs
 */
export const POST = handleAuth(
  SimpleJobProcessSchema,
  JobProcessingResultSchema,
  async (_, userId) => {
    const result = await JobProcessingService.processUserSpecificJobs(userId);

    return {
      message: `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`,
      runner: "job_runner",
      processed: result.processed,
      succeeded: result.succeeded,
      failed: result.failed,
      errors: result.errors.length > 0 ? result.errors : undefined,
    };
  },
);
