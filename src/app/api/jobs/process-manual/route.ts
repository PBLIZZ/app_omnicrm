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

import { NextResponse } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { JobProcessingService } from "@/server/services/job-processing.service";
import { z } from "zod";

const processManualSchema = z.object({
  // Optional filters for selective processing
  jobTypes: z.array(z.enum(['normalize', 'embed', 'insight', 'sync_gmail', 'sync_calendar'])).optional(),
  batchId: z.string().optional(), // Process only jobs from specific batch
  maxJobs: z.number().int().min(1).max(100).optional().default(25), // Limit for safety

  // Processing options
  includeRetrying: z.boolean().optional().default(true), // Include jobs in retrying state
  skipStuckJobs: z.boolean().optional().default(false), // Skip jobs stuck in processing

  // Feedback options
  realTimeUpdates: z.boolean().optional().default(true), // Enable progress tracking
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "manual_job_processing" },
  validation: { body: processManualSchema },
})(async ({ userId, validated, requestId }) => {
  const {
    jobTypes,
    batchId,
    maxJobs,
    includeRetrying,
    skipStuckJobs,
    realTimeUpdates
  } = validated.body;

  try {
    const result = await JobProcessingService.processJobsManually(userId, {
      jobTypes,
      batchId,
      maxJobs,
      includeRetrying,
      skipStuckJobs,
      realTimeUpdates,
    }, requestId);

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: "Failed to start job processing",
      details: "The job processing system encountered an error. Please try again or contact support if the problem persists.",
      suggestions: [
        "Wait a few minutes and try again",
        "Try processing fewer jobs at once",
        "Check the job status for stuck jobs",
        "Contact support if errors persist"
      ]
    }, { status: 500 });
  }
});

