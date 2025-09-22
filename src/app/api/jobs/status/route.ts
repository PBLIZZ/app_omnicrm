/**
 * GET /api/jobs/status — Enhanced job status with error tracking and data freshness
 *
 * Provides comprehensive status information about job processing including:
 * - Current job queue counts by status and type
 * - Processing progress and estimated completion times
 * - Recent job history and error summaries
 * - Data freshness indicators for UI components
 * - Health monitoring and stuck job detection
 */
import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { JobStatusService } from "@/server/services/job-status.service";
import { ComprehensiveJobStatusDTOSchema } from "@omnicrm/contracts";
import { z } from "zod";

const jobStatusQuerySchema = z.object({
  includeHistory: z.coerce.boolean().optional().default(false),
  includeFreshness: z.coerce.boolean().optional().default(true),
  batchId: z.string().optional(), // For tracking specific sync session jobs
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getServerUserId();
    const { searchParams } = new URL(request.url);

    const validation = jobStatusQuerySchema.safeParse({
      includeHistory: searchParams.get('includeHistory'),
      includeFreshness: searchParams.get('includeFreshness'),
      batchId: searchParams.get('batchId'),
    });

    if (!validation.success) {
      return NextResponse.json({
        error: "Invalid query parameters",
        details: validation.error.issues
      }, { status: 400 });
    }

    const { includeHistory, includeFreshness, batchId } = validation.data;
    const result = await JobStatusService.getComprehensiveJobStatus(userId, {
      includeHistory,
      includeFreshness,
      ...(batchId !== undefined && { batchId }),
    });

    // Validate response with schema
    const validatedResult = ComprehensiveJobStatusDTOSchema.parse(result);

    return NextResponse.json(validatedResult);
  } catch {
    // Return safe, empty state so UI doesn't break
    const emptyState = {
      queue: {
        statusCounts: {
          queued: 0,
          processing: 0,
          completed: 0,
          failed: 0,
          retrying: 0,
        },
        kindCounts: {
          normalize: 0,
          embed: 0,
          insight: 0,
          sync_gmail: 0,
          sync_calendar: 0,
          google_gmail_sync: 0,
        },
        totalJobs: 0,
        pendingJobs: 0,
        failedJobs: 0,
      },
      pendingJobs: [],
      dataFreshness: null,
      estimatedCompletion: null,
      stuckJobs: [],
      health: {
        score: 0,
        status: "critical" as const,
        issues: ["Unable to fetch job status"],
      },
      jobs: [],
      currentBatch: null,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(emptyState, { status: 503 });
  }
}
