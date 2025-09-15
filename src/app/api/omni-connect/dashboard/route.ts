/**
 * GET /api/omni-connect/dashboard — unified dashboard endpoint (auth required)
 *
 * Consolidates data from:
 * - /api/google/gmail/status
 * - /api/settings/sync/status
 * - /api/sync/preview/gmail
 * - /api/jobs/status
 */
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userIntegrations, rawEvents, syncAudit, jobs } from "@/server/db/schema";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import { ensureError } from "@/lib/utils/error-handler";
import type {
  OmniConnectDashboardState,
  JobStatusResponse,
  ConnectConnectionStatus,
} from "@/app/(authorisedRoute)/omni-connect/_components/types";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "omni_connect_dashboard" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("omni_connect_dashboard", requestId);

  try {
    const db = await getDb();

    // Run all data fetching operations in parallel for optimal performance
    const [connectionData, syncStatusData, activeJobsData] = await Promise.all([
      getGmailConnectionStatus(db, userId),
      getSyncStatus(db, userId),
      getActiveJobs(db, userId),
    ]);

    const dashboardState: OmniConnectDashboardState = {
      connection: connectionData,
      syncStatus: syncStatusData,
      emailPreview: { emails: [], range: null }, // No preview needed
      activeJobs: activeJobsData,
      jobs: {
        active: activeJobsData.jobs,
        summary: {
          queued: 0,
          running: 0,
          completed: 0,
          failed: 0,
        },
        currentBatch: activeJobsData.currentBatch,
        ...(activeJobsData.totalEmails !== undefined && {
          totalEmails: activeJobsData.totalEmails,
        }),
        ...(activeJobsData.processedEmails !== undefined && {
          processedEmails: activeJobsData.processedEmails,
        }),
      },
      hasConfiguredSettings: true, // Always true now - no settings needed
    };

    return api.success(dashboardState);
  } catch (error) {
    return api.error(
      "Failed to load dashboard data",
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

// Helper function to get Gmail connection status (reuses existing logic)
async function getGmailConnectionStatus(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
): Promise<ConnectConnectionStatus> {
  // Check if user has Gmail integration (check both gmail-specific and unified)
  const [gmailIntegration, unifiedIntegration] = await Promise.all([
    db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "gmail"),
        ),
      )
      .limit(1),
    db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "unified"),
        ),
      )
      .limit(1),
  ]);

  // Use unified integration if available, otherwise use gmail-specific
  const integration = unifiedIntegration[0] ?? gmailIntegration[0];

  if (!integration) {
    return {
      isConnected: false,
      error: "No Gmail integration found",
      expiryDate: undefined,
      hasRefreshToken: undefined,
      autoRefreshed: undefined,
      service: undefined,
    };
  }

  // Check if token is expired
  const now = new Date();
  const isExpired = integration.expiryDate && integration.expiryDate < now;

  // If token is expired but we have a refresh token, attempt to refresh automatically
  if (isExpired && integration.refreshToken) {
    try {
      // Attempt automatic token refresh using the GoogleGmailService
      await GoogleGmailService.getAuth(userId);

      // Re-check the integration after refresh attempt
      const refreshedIntegration = await db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, integration.service),
          ),
        )
        .limit(1);

      if (refreshedIntegration[0]) {
        const stillExpired =
          refreshedIntegration[0].expiryDate && refreshedIntegration[0].expiryDate < now;

        return {
          isConnected: !stillExpired,
          expiryDate: refreshedIntegration[0].expiryDate?.toISOString() ?? undefined,
          hasRefreshToken: !!refreshedIntegration[0].refreshToken,
          autoRefreshed: !stillExpired,
          service: integration.service,
        };
      }
    } catch (refreshError) {
      console.warn("Automatic Gmail token refresh failed:", refreshError);

      // Check if this was due to revoked tokens (integration deleted)
      const integrationStillExists = await db
        .select({ id: userIntegrations.userId })
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, integration.service),
          ),
        )
        .limit(1);

      if (integrationStillExists.length === 0) {
        // Tokens were revoked and cleared - return disconnected state
        return {
          isConnected: false,
          error: "Gmail connection was revoked. Please reconnect.",
          expiryDate: undefined,
          hasRefreshToken: undefined,
          autoRefreshed: undefined,
          service: undefined,
        };
      }
    }
  }

  // Get count of emails successfully imported to raw_events and last sync date
  const [emailsImported, lastSyncData] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
      .limit(1),
    db
      .select({ createdAt: rawEvents.createdAt })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
      .orderBy(desc(rawEvents.createdAt))
      .limit(1),
  ]);

  return {
    isConnected: !isExpired,
    expiryDate: integration.expiryDate?.toISOString(),
    hasRefreshToken: !!integration.refreshToken,
    autoRefreshed: undefined,
    service: integration.service,
    emailCount: emailsImported[0]?.count ?? 0,
    lastSync: lastSyncData[0]?.createdAt?.toISOString(),
  };
}

// Helper function to get sync status (reuses existing logic)
async function getSyncStatus(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
): Promise<NonNullable<OmniConnectDashboardState["syncStatus"]>> {
  // Connection status - check for both auth and service-specific tokens
  const [authIntegration, unifiedIntegration, gmailIntegration, calendarIntegration] =
    await Promise.all([
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "auth"),
          ),
        )
        .limit(1),
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "unified"),
          ),
        )
        .limit(1),
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "gmail"),
          ),
        )
        .limit(1),
      db
        .select()
        .from(userIntegrations)
        .where(
          and(
            eq(userIntegrations.userId, userId),
            eq(userIntegrations.provider, "google"),
            eq(userIntegrations.service, "calendar"),
          ),
        )
        .limit(1),
    ]);

  const googleConnected = !!authIntegration[0];

  // Check for valid (non-expired) tokens
  const now = new Date();

  // Unified integration provides Gmail access, legacy gmail integration also works
  const gmailIntegrationToCheck = unifiedIntegration[0] ?? gmailIntegration[0];
  const hasGmailToken =
    !!gmailIntegrationToCheck &&
    (!gmailIntegrationToCheck.expiryDate || gmailIntegrationToCheck.expiryDate > now);

  const hasCalendarToken =
    !!calendarIntegration[0] &&
    (!calendarIntegration[0].expiryDate || calendarIntegration[0].expiryDate > now);

  // Get last sync, job counts, and other data in parallel
  const [
    gmailLast,
    calendarLast,
    gmailApprove,
    calendarApprove,
    queued,
    done,
    error,
    embedQueued,
    embedDone,
    embedError,
    lastBatch,
  ] = await Promise.all([
    // Last sync per provider
    db
      .select({ createdAt: rawEvents.createdAt })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
      .orderBy(desc(rawEvents.createdAt))
      .limit(1),
    db
      .select({ createdAt: rawEvents.createdAt })
      .from(rawEvents)
      .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "google_calendar")))
      .orderBy(desc(rawEvents.createdAt))
      .limit(1),

    // Last approved scopes from audit
    db
      .select({ payload: syncAudit.payload })
      .from(syncAudit)
      .where(
        and(
          eq(syncAudit.userId, userId),
          eq(syncAudit.provider, "gmail"),
          eq(syncAudit.action, "approve"),
        ),
      )
      .orderBy(desc(syncAudit.createdAt))
      .limit(1),
    db
      .select({ payload: syncAudit.payload })
      .from(syncAudit)
      .where(
        and(
          eq(syncAudit.userId, userId),
          eq(syncAudit.provider, "calendar"),
          eq(syncAudit.action, "approve"),
        ),
      )
      .orderBy(desc(syncAudit.createdAt))
      .limit(1),

    // Job counts for Google-related kinds
    db
      .select({ n: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.status, "queued"),
          inArray(jobs.kind, [
            "google_gmail_sync",
            "google_calendar_sync",
            "normalize_google_email",
            "normalize_google_event",
          ]),
        ),
      )
      .limit(1),
    db
      .select({ n: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.status, "done"),
          inArray(jobs.kind, [
            "google_gmail_sync",
            "google_calendar_sync",
            "normalize_google_email",
            "normalize_google_event",
          ]),
        ),
      )
      .limit(1),
    db
      .select({ n: sql<number>`count(*)` })
      .from(jobs)
      .where(
        and(
          eq(jobs.userId, userId),
          eq(jobs.status, "error"),
          inArray(jobs.kind, [
            "google_gmail_sync",
            "google_calendar_sync",
            "normalize_google_email",
            "normalize_google_event",
          ]),
        ),
      )
      .limit(1),

    // Embedding job metrics
    db
      .select({ n: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.status, "queued"), eq(jobs.kind, "embed")))
      .limit(1),
    db
      .select({ n: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.status, "done"), eq(jobs.kind, "embed")))
      .limit(1),
    db
      .select({ n: sql<number>`count(*)` })
      .from(jobs)
      .where(and(eq(jobs.userId, userId), eq(jobs.status, "error"), eq(jobs.kind, "embed")))
      .limit(1),

    // Last batch ID
    db
      .select({ batchId: jobs.batchId })
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(1),
  ]);

  return {
    googleConnected,
    serviceTokens: {
      google: googleConnected,
      gmail: hasGmailToken,
      calendar: hasCalendarToken,
      unified: !!unifiedIntegration[0],
    },
    flags: {
      gmail: process.env["FEATURE_GOOGLE_GMAIL_RO"] === "1",
      calendar: process.env["FEATURE_GOOGLE_CALENDAR_RO"] === "1",
    },
    lastSync: {
      gmail: gmailLast[0]?.createdAt?.toISOString() ?? null,
      calendar: calendarLast[0]?.createdAt?.toISOString() ?? null,
    },
    lastBatchId: lastBatch[0]?.batchId ?? null,
    grantedScopes: {
      gmail: (gmailApprove[0]?.payload as Record<string, unknown>)?.["grantedScopes"] ?? null,
      calendar: (calendarApprove[0]?.payload as Record<string, unknown>)?.["grantedScopes"] ?? null,
    },
    jobs: {
      queued: queued[0]?.n ?? 0,
      done: done[0]?.n ?? 0,
      error: error[0]?.n ?? 0,
    },
    embedJobs: {
      queued: embedQueued[0]?.n ?? 0,
      done: embedDone[0]?.n ?? 0,
      error: embedError[0]?.n ?? 0,
    },
  };
}

// No preview needed - sync happens automatically on connection

// Helper function to get active jobs (reuses existing logic)
async function getActiveJobs(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
): Promise<OmniConnectDashboardState["activeJobs"]> {
  // Get recent jobs for this user (limit to most recent 50)
  const recentJobs = await db
    .select({
      id: jobs.id,
      kind: jobs.kind,
      status: jobs.status,
      batchId: jobs.batchId,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      payload: jobs.payload,
      error: jobs.lastError,
    })
    .from(jobs)
    .where(eq(jobs.userId, userId))
    .orderBy(desc(jobs.createdAt))
    .limit(50);

  // Determine current batch if any job is queued/running
  const currentBatch =
    recentJobs.find((job) => job.status === "queued" || job.status === "running")?.batchId ?? null;

  let totalEmails = 0;
  let processedEmails = 0;

  if (currentBatch) {
    // Count raw gmail events written for progress
    const eventStats = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(rawEvents)
      .where(
        and(
          eq(rawEvents.userId, userId),
          eq(rawEvents.batchId, currentBatch),
          eq(rawEvents.provider, "gmail"),
        ),
      );

    processedEmails = eventStats[0]?.count ?? 0;

    // Try to read an estimated total from the gmail sync job payload if present
    const gmailSyncJob = recentJobs.find(
      (job) => job.kind === "google_gmail_sync" && job.batchId === currentBatch,
    );
    if (gmailSyncJob?.payload && typeof gmailSyncJob.payload === "object") {
      const payload = gmailSyncJob.payload as Record<string, unknown>;
      const n = payload?.["totalEmails"];
      if (typeof n === "number") totalEmails = n;
    }
  }

  // Serialize for client
  const jobStatuses: JobStatusResponse[] = recentJobs.map((job) => {
    const createdAt =
      job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt ?? "");
    const updatedAt =
      job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt ?? "");

    let extras: Partial<JobStatusResponse> = {};
    if (job.kind === "google_gmail_sync" && job.payload && typeof job.payload === "object") {
      const p = job.payload as Record<string, unknown>;
      const total = typeof p["totalEmails"] === "number" ? p["totalEmails"] : undefined;
      const done = typeof p["processedEmails"] === "number" ? p["processedEmails"] : undefined;
      const newEmails = typeof p["newEmails"] === "number" ? p["newEmails"] : undefined;
      const chunkSize = typeof p["chunkSize"] === "number" ? p["chunkSize"] : undefined;
      const chunksTotal = typeof p["chunksTotal"] === "number" ? p["chunksTotal"] : undefined;
      const chunksProcessed =
        typeof p["chunksProcessed"] === "number" ? p["chunksProcessed"] : undefined;
      const progress =
        total && done ? Math.max(1, Math.min(99, Math.round((done / total) * 100))) : undefined;
      extras = {
        ...(total && { totalEmails: total }),
        ...(done && { processedEmails: done }),
        ...(newEmails && { newEmails }),
        ...(chunkSize && { chunkSize }),
        ...(chunksTotal && { chunksTotal }),
        ...(chunksProcessed && { chunksProcessed }),
        ...(progress && { progress }),
      };
    }

    return {
      id: job.id,
      kind: job.kind,
      status: job.status as JobStatusResponse["status"],
      ...(job.batchId && { batchId: job.batchId }),
      createdAt,
      updatedAt,
      ...(typeof job.error === "string" && { message: job.error }),
      ...extras,
    };
  });

  return {
    jobs: jobStatuses,
    currentBatch,
    ...(totalEmails > 0 && { totalEmails }),
    ...(processedEmails > 0 && { processedEmails }),
  };
}
