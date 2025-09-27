/**
 * POST /api/jobs/process-manual — Manual job processing trigger with real-time feedback
 *
 * Allows users to manually trigger processing of pending jobs when sync shows
 * "150 imported, 120 processed" and they need to process the remaining 30.
 *
 * Features:
 * - Immediate processing with progress tracking
 * - Selective processing by job type or batch
 * - Real-time feedback and error handling
 * - Integration with error tracking system
 * - Safe execution with proper rate limiting
 */

import { handleAuth } from "@/lib/api";
import { JobProcessingService } from "@/server/services/job-processing.service";
import { ProcessManualSchema, JobProcessingResultSchema } from "@/server/db/business-schemas";

export const POST = handleAuth(ProcessManualSchema, JobProcessingResultSchema, async (data, userId) => {
  const { jobTypes, batchId, maxJobs, includeRetrying, skipStuckJobs, realTimeUpdates } = data;

  // Helper function to remove undefined values from object
  const removeUndefined = <T extends Record<string, unknown>>(obj: T): Partial<T> => {
    return Object.fromEntries(
      Object.entries(obj).filter(([, value]) => value !== undefined),
    ) as Partial<T>;
  };

  // Build options object with all possible keys, then filter out undefined values
  const options = removeUndefined({
    jobTypes,
    batchId,
    maxJobs,
    includeRetrying,
    skipStuckJobs,
    realTimeUpdates,
  }) as Parameters<typeof JobProcessingService.processJobsManually>[1];

  const result = await JobProcessingService.processJobsManually(userId, options);

  return result;
});
