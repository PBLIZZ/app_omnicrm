import { getDb } from "@/server/db/client";
import {
  getStatusService,
  type GoogleIntegrationStatus,
} from "@/server/services/google-integration.service";
import { AppError } from "@/lib/errors/app-error";
import {
  createRawEventsRepository,
  createUserIntegrationsRepository,
  createJobsRepository,
  createContactsRepository,
} from "@repo";
import type {
  ConnectDashboardState,
  EmailPreview,
  Job,
  ConnectConnectionStatus,
} from "@/server/db/business-schemas";

/**
 * OmniConnect Dashboard Service
 * Aggregates data from multiple sources for the unified OmniConnect dashboard
 */

/**
 * Get complete dashboard state for a user
 */
export async function getDashboardStateService(userId: string): Promise<ConnectDashboardState> {
  try {
    const db = await getDb();

    // CRITICAL: Refresh tokens FIRST and await completion to prevent race condition
    const googleStatus: GoogleIntegrationStatus = await getStatusService(userId, {
      autoRefresh: true,
    });

    // Create repository instances
    const rawEventsRepo = createRawEventsRepository(db);
    const userIntegrationsRepo = createUserIntegrationsRepository(db);
    const contactsRepo = createContactsRepository(db);

    // Now run remaining queries in parallel, using refreshed googleStatus
    const [connection, emailsData, jobsData] = await Promise.all([
      getConnectionStatus(userId, googleStatus, rawEventsRepo, userIntegrationsRepo, contactsRepo),
      getEmailPreviews(rawEventsRepo, userId),
      getActiveJobs(db, userId),
    ]);

    return {
      connection,
      emailPreview: emailsData,
      jobs: jobsData,
      syncStatus: {
        googleConnected: googleStatus.gmail.connected || googleStatus.calendar.connected,
        serviceTokens: {
          google: googleStatus.gmail.connected || googleStatus.calendar.connected,
          gmail: googleStatus.gmail.connected,
          calendar: googleStatus.calendar.connected,
          unified: googleStatus.gmail.connected && googleStatus.calendar.connected,
        },
        flags: {
          gmail: googleStatus.gmail.connected,
          calendar: googleStatus.calendar.connected,
        },
        lastSync: {
          gmail: connection.lastSync ?? undefined,
          calendar: undefined,
        },
        lastBatchId: jobsData?.currentBatch ?? null,
        grantedScopes: {
          gmail: connection.grantedScopes?.gmail ?? undefined,
          calendar: connection.grantedScopes?.calendar ?? undefined,
        },
        jobs: {
          queued: jobsData?.summary.queued ?? 0,
          done: jobsData?.summary.completed ?? 0,
          error: jobsData?.summary.failed ?? 0,
        },
        embedJobs: {
          queued: jobsData?.embedJobs.queued ?? 0,
          done: jobsData?.embedJobs.done ?? 0,
          error: jobsData?.embedJobs.error ?? 0,
        },
      },
      hasConfiguredSettings: connection.isConnected, // If connected, settings are configured
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get dashboard state",
      "DASHBOARD_ERROR",
      "database",
      false,
      500,
    );
  }
}

/**
 * Get Gmail connection status with email count
 * Uses googleStatus (post-refresh) as source of truth for connection state
 */
async function getConnectionStatus(
  userId: string,
  googleStatus: GoogleIntegrationStatus,
  rawEventsRepo: ReturnType<typeof createRawEventsRepository>,
  userIntegrationsRepo: ReturnType<typeof createUserIntegrationsRepository>,
  contactsRepo: ReturnType<typeof createContactsRepository>,
): Promise<ConnectConnectionStatus> {
  try {
    // Get Gmail integration metadata from repository
    const gmailIntegration = await userIntegrationsRepo.getUserIntegration(
      userId,
      "google",
      "gmail",
    );

    if (!gmailIntegration) {
      return {
        isConnected: false,
        emailCount: 0,
        contactCount: 0,
        grantedScopes: {
          gmail: null,
          calendar: null,
        },
      };
    }

    // CRITICAL: Use googleStatus.gmail.connected (post-refresh) as source of truth
    // This prevents false "disconnected" states due to stale database reads
    const isConnected: boolean = googleStatus.gmail.connected;

    // Get email count from repository
    const emailCount: number = await rawEventsRepo.getEmailCountByProvider(userId, "gmail");

    // Get last sync time from repository
    const latestEvent = await rawEventsRepo.getLatestEventByProvider(userId, "gmail");

    // Get granted scopes from config
    const grantedScopes = (gmailIntegration.config as { scopes?: string })?.scopes
      ? (gmailIntegration.config as { scopes: string }).scopes.split(" ")
      : [];

    // Get contact count
    const contactCount = await contactsRepo.countContacts(userId);

    return {
      isConnected,
      emailCount,
      contactCount,
      lastSync: latestEvent?.createdAt?.toISOString(),
      expiryDate: gmailIntegration.expiryDate?.toISOString() ?? undefined,
      hasRefreshToken: !!gmailIntegration.refreshToken,
      service: gmailIntegration.service ?? undefined,
      grantedScopes: {
        gmail: grantedScopes,
        calendar: undefined,
      },
    };
  } catch (error) {
    console.error("Failed to get connection status:", error);
    return {
      isConnected: false,
      emailCount: 0,
      contactCount: 0,
      error: "Failed to check connection status",
    };
  }
}

/**
 * Get email previews from recent raw events
 */
async function getEmailPreviews(
  rawEventsRepo: ReturnType<typeof createRawEventsRepository>,
  userId: string,
): Promise<{
  emails: EmailPreview[];
  range: { from: string; to: string } | null;
  previewRange: { from: string; to: string } | null;
}> {
  try {
    const result = await rawEventsRepo.listRawEvents(userId, {
      provider: ["gmail"],
      sort: "occurredAt",
      order: "desc",
      pageSize: 10,
    });

    const recentEmails = result.items;

    const emails: EmailPreview[] = recentEmails.map((event) => {
      const payload = event.payload as Record<string, unknown>;
      const message = (payload?.["message"] as Record<string, unknown>) || {};

      return {
        id: event.sourceId || event.id,
        subject: (message["subject"] as string) || "No Subject",
        from: (message["from"] as string) || "Unknown Sender",
        date:
          event.occurredAt?.toISOString() ||
          event.createdAt?.toISOString() ||
          new Date().toISOString(),
        snippet: (message["snippet"] as string) || (message["bodyText"] as string) || "",
        labels: (message["labels"] as string[]) || [],
        hasAttachments: Boolean(
          message["attachments"] &&
            Array.isArray(message["attachments"]) &&
            message["attachments"].length > 0,
        ),
      };
    });

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
    console.error("Failed to get email previews:", error);
    return { emails: [], range: null, previewRange: null };
  }
}

/**
 * Get active jobs for user
 */
async function getActiveJobs(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: string,
): Promise<{
  active: Job[];
  summary: {
    queued: number;
    running: number;
    completed: number;
    failed: number;
  };
  embedJobs: {
    queued: number;
    done: number;
    error: number;
  };
  currentBatch: string | null;
  totalEmails?: number;
  processedEmails?: number;
} | null> {
  try {
    const jobsRepo = createJobsRepository(db);

    // Get recent jobs for active list
    const activeJobs = await jobsRepo.getRecentJobs(userId, undefined, 20);

    // Get job counts for summary
    const jobCounts = await jobsRepo.getJobCounts(userId);

    const jobsList: Job[] = activeJobs.map((job) => ({
      id: job.id,
      kind: job.kind,
      status: job.status as "queued" | "running" | "completed" | "error",
      batchId: job.batchId ?? undefined,
      createdAt: job.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: job.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    const summary = {
      queued: jobCounts.statusCounts["queued"] ?? 0,
      running: jobCounts.statusCounts["running"] ?? 0,
      completed: jobCounts.statusCounts["completed"] ?? 0,
      failed: jobCounts.statusCounts["error"] ?? 0,
    };

    // Calculate embed job counts using filtered getJobCounts
    const embedCounts = await jobsRepo.getJobCounts(userId, undefined, ["embed"]);
    const embedJobs = {
      queued: embedCounts.statusCounts["queued"] ?? 0,
      done: embedCounts.statusCounts["completed"] ?? 0,
      error: embedCounts.statusCounts["error"] ?? 0,
    };

    const currentBatch =
      activeJobs.find((j) => j.status === "running" && j.batchId)?.batchId || null;

    return {
      active: jobsList,
      summary,
      embedJobs,
      currentBatch,
    };
  } catch (error) {
    console.error("Failed to get active jobs:", error);
    return null;
  }
}
