import { eq, and, desc, inArray, sql } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { userIntegrations, rawEvents, syncAudit, jobs } from "@/server/db/schema";
import { GoogleGmailService } from "@/server/services/google-gmail.service";
import type {
  OmniConnectDashboardState,
  JobStatusResponse,
  ConnectConnectionStatus,
  EmailPreview,
} from "@/app/(authorisedRoute)/omni-connect/_components/types";

// Helper interface for Gmail payload structure
interface GmailPayload {
  message?: {
    subject?: string;
    snippet?: string;
    bodyText?: string;
    from?: string;
    labels?: string[];
    attachments?: unknown[];
  };
}

export class OmniConnectDashboardService {
  /**
   * Get complete dashboard data for user
   */
  static async getDashboardState(userId: string): Promise<OmniConnectDashboardState> {
    const db = await getDb();

    // Run all data fetching operations in parallel for optimal performance
    const [connectionData, syncStatusData, activeJobsData, emailPreviewData] = await Promise.all([
      this.getGmailConnectionStatus(db, userId),
      this.getSyncStatus(db, userId),
      this.getActiveJobs(db, userId),
      this.getEmailPreview(db, userId),
    ]);

    return {
      connection: connectionData,
      syncStatus: syncStatusData,
      emailPreview: emailPreviewData,
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
  }

  /**
   * Get email preview from recent Gmail interactions
   */
  private static async getEmailPreview(
    db: Awaited<ReturnType<typeof getDb>>,
    userId: string,
  ): Promise<{
    emails: EmailPreview[];
    range: { from: string; to: string } | null;
    previewRange: { from: string; to: string } | null;
  }> {
    try {
      // Get recent Gmail raw events to show as email previews
      const recentEmails = await db
        .select({
          id: rawEvents.id,
          sourceId: rawEvents.sourceId,
          payload: rawEvents.payload,
          occurredAt: rawEvents.occurredAt,
          createdAt: rawEvents.createdAt,
        })
        .from(rawEvents)
        .where(and(eq(rawEvents.userId, userId), eq(rawEvents.provider, "gmail")))
        .orderBy(desc(rawEvents.occurredAt))
        .limit(10);

      // Transform raw events into email preview format
      const emails: EmailPreview[] = recentEmails.map((event) => {
        const payload = event.payload as GmailPayload;
        const message = payload?.message || {};

        return {
          id: event.sourceId || event.id,
          subject: message.subject || "No Subject",
          from: message.from || "Unknown Sender",
          date:
            event.occurredAt?.toISOString() ||
            event.createdAt?.toISOString() ||
            new Date().toISOString(),
          snippet: message.snippet || message.bodyText || "",
          labels: message.labels || [],
          hasAttachments: Boolean(message.attachments && message.attachments.length > 0),
        };
      });

      // Calculate preview range if we have emails
      let range = null;
      let previewRange = null;
      if (emails.length > 0) {
        const dates = emails.map((e) => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
        const firstDate = dates[0];
        const lastDate = dates[dates.length - 1];
        if (firstDate && lastDate) {
          const from = firstDate.toISOString();
          const to = lastDate.toISOString();
          range = { from, to };
          previewRange = { from, to };
        }
      }

      return { emails, range, previewRange };
    } catch (error) {
      console.error("Failed to get email preview:", error);
      return { emails: [], range: null, previewRange: null };
    }
  }

  /**
   * Get Gmail connection status
   */
  private static async getGmailConnectionStatus(
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
      ...(lastSyncData[0]?.createdAt && { lastSync: lastSyncData[0].createdAt.toISOString() }),
    };
  }

  /**
   * Get sync status data
   */
  private static async getSyncStatus(
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
        gmail: this.getGrantedScopes(gmailApprove[0]?.payload),
        calendar: this.getGrantedScopes(calendarApprove[0]?.payload),
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

  /**
   * Get active jobs data
   */
  private static async getActiveJobs(
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
      if (gmailSyncJob?.payload) {
        const n = this.getNumberFromPayload(gmailSyncJob.payload, "totalEmails");
        if (n !== undefined) totalEmails = n;
      }
    }

    // Serialize for client
    const jobStatuses: JobStatusResponse[] = recentJobs.map((job) => {
      const createdAt =
        job.createdAt instanceof Date ? job.createdAt.toISOString() : String(job.createdAt ?? "");
      const updatedAt =
        job.updatedAt instanceof Date ? job.updatedAt.toISOString() : String(job.updatedAt ?? "");

      let extras: Partial<JobStatusResponse> = {};
      if (job.kind === "google_gmail_sync" && job.payload) {
        const total = this.getNumberFromPayload(job.payload, "totalEmails");
        const done = this.getNumberFromPayload(job.payload, "processedEmails");
        const newEmails = this.getNumberFromPayload(job.payload, "newEmails");
        const chunkSize = this.getNumberFromPayload(job.payload, "chunkSize");
        const chunksTotal = this.getNumberFromPayload(job.payload, "chunksTotal");
        const chunksProcessed = this.getNumberFromPayload(job.payload, "chunksProcessed");
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
        status: this.isValidJobStatus(job.status) ? job.status : "error",
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

  /**
   * Helper function to safely extract granted scopes
   */
  private static getGrantedScopes(payload: unknown): string[] | null {
    if (!payload || typeof payload !== "object") return null;
    const obj = payload as Record<string, unknown>;
    const scopes = obj["grantedScopes"];
    return Array.isArray(scopes) ? scopes.filter((s): s is string => typeof s === "string") : null;
  }

  /**
   * Helper function to safely extract number from payload
   */
  private static getNumberFromPayload(payload: unknown, key: string): number | undefined {
    if (!payload || typeof payload !== "object") return undefined;
    const obj = payload as Record<string, unknown>;
    const value = obj[key];
    return typeof value === "number" ? value : undefined;
  }

  /**
   * Helper function to safely cast job status
   */
  private static isValidJobStatus(status: string): status is JobStatusResponse["status"] {
    const validStatuses = ["queued", "running", "done", "error"] as const;
    return validStatuses.some((validStatus) => validStatus === status);
  }
}