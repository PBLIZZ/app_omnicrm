import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { jobs, syncAudit } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

// GET: Check the status of a sync job by batchId
export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error) {
    console.error("Calendar sync status GET - auth error:", error);
    return new NextResponse(
      JSON.stringify({
        error: "unauthorized",
        details: error instanceof Error ? error.message : "Authentication failed",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId");

  if (!batchId) {
    return NextResponse.json(
      {
        ok: false,
        error: "missing_batch_id",
        message: "batchId parameter is required",
      },
      { status: 400 },
    );
  }

  try {
    const db = await getDb();

    // Get all jobs for this batch
    const batchJobs = await db
      .select()
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.batchId, batchId)))
      .orderBy(desc(jobs.createdAt));

    if (batchJobs.length === 0) {
      return NextResponse.json({
        ok: true,
        data: {
          batchId,
          status: "not_found",
          message: "No jobs found for this batch",
        },
      });
    }

    // Calculate aggregate status
    const jobStatuses = batchJobs.map((job) => job.status);
    const hasFailedJobs = jobStatuses.some((status) => status === "error");
    const hasProcessingJobs = jobStatuses.some((status) => status === "processing");
    const hasQueuedJobs = jobStatuses.some((status) => status === "queued");
    const allCompleted = jobStatuses.every((status) => status === "done");

    let overallStatus: string;
    if (hasFailedJobs) {
      overallStatus = "failed";
    } else if (hasProcessingJobs) {
      overallStatus = "processing";
    } else if (hasQueuedJobs) {
      overallStatus = "queued";
    } else if (allCompleted) {
      overallStatus = "completed";
    } else {
      overallStatus = "unknown";
    }

    // Get the latest sync audit entry for this batch
    const auditEntries = await db
      .select()
      .from(syncAudit)
      .where(
        and(
          eq(syncAudit.userId, userId),
          eq(syncAudit.provider, "google_calendar"),
          eq(syncAudit.action, "calendar_sync"),
        ),
      )
      .orderBy(desc(syncAudit.createdAt))
      .limit(1);

    const latestAudit = auditEntries[0];
    const auditPayload = latestAudit?.payload as any;

    // Get details from individual job types
    const normalizeJob = batchJobs.find((job) => job.kind === "normalize");
    const extractJob = batchJobs.find((job) => job.kind === "extract_contacts");

    // Calculate events processed from job payloads
    let eventsProcessed = 0;
    let timelineEntriesCreated = 0;
    
    if (normalizeJob?.payload) {
      const normalizePayload = normalizeJob.payload as any;
      eventsProcessed = normalizePayload.eventsNormalized || 0;
    }
    
    if (extractJob?.payload) {
      const extractPayload = extractJob.payload as any;
      timelineEntriesCreated = extractPayload.timelineEntriesCreated || 0;
    }

    return NextResponse.json({
      ok: true,
      data: {
        batchId,
        status: overallStatus,
        jobs: batchJobs.map((job) => ({
          id: job.id,
          kind: job.kind,
          status: job.status,
          attempts: job.attempts,
          lastError: job.lastError,
          createdAt: job.createdAt.toISOString(),
          updatedAt: job.updatedAt.toISOString(),
        })),
        summary: {
          totalJobs: batchJobs.length,
          completed: jobStatuses.filter((s) => s === "done").length,
          failed: jobStatuses.filter((s) => s === "error").length,
          processing: jobStatuses.filter((s) => s === "processing").length,
          queued: jobStatuses.filter((s) => s === "queued").length,
          eventsProcessed,
          timelineEntriesCreated,
        },
        audit: auditPayload
          ? {
              success: auditPayload.success,
              timeMin: auditPayload.timeMin,
              timeMax: auditPayload.timeMax,
              isFirstSync: auditPayload.isFirstSync,
              error: auditPayload.error,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Calendar sync status GET - database error:", error);
    return NextResponse.json(
      {
        ok: false,
        error: "database_error",
        message: error instanceof Error ? error.message : "Failed to fetch job status",
      },
      { status: 500 },
    );
  }
}
