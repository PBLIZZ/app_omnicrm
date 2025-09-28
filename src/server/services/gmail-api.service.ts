import { apiClient } from "@/lib/api/client";
import { logger } from "@/lib/observability";
import {
  ConnectConnectionStatus as GmailConnectionStatus,
  EmailPreview,
  ConnectDashboardState,
  SearchResult,
  EmailInsights as GmailInsights,
} from "@/server/db/business-schemas";

/**
 * Gmail API Service with integrated rate limiting
 *
 * All Gmail API calls made through this service are automatically rate-limited
 * at the server level via withRateLimit wrapper in the underlying Google API services.
 * This ensures compliance with Gmail API quotas and prevents rate limit errors.
 */

interface SampleEmail {
  id?: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
  hasAttachments?: boolean;
  labels?: string[];
}

interface EmailPreviewData {
  sampleEmails?: SampleEmail[];
  sampleSubjects?: SampleEmail[];
  dateRange?: { from: string; to: string };
}

export class GmailApiService {
  /**
   * Rate-limited Gmail status check
   * Server-side rate limiting applied to underlying Google API calls
   */
  static async checkGmailStatus(): Promise<GmailConnectionStatus> {
    try {
      // Use the unified Google status endpoint with proper token expiry handling
      const syncData = await apiClient.get<{
        services?: {
          gmail?: {
            connected: boolean;
            autoRefreshed?: boolean;
            integration?: {
              service?: string;
              expiryDate?: string;
              hasRefreshToken?: boolean;
            };
            lastSync?: string;
          };
        };
        lastSync?: { gmail?: string };
      }>("/api/google/status", { showErrorToast: false });

      const gmailService = syncData?.services?.gmail;
      const data = gmailService ? {
        isConnected: gmailService.connected,
        reason: gmailService.connected ? "connected" : "token_expired",
        autoRefreshed: gmailService.autoRefreshed,
        expiryDate: gmailService.integration?.expiryDate,
        hasRefreshToken: gmailService.integration?.hasRefreshToken,
        service: gmailService.integration?.service,
      } : { isConnected: false, reason: "no_integration" };

      if (data.isConnected) {

        return {
          isConnected: true,
          ...(gmailService?.lastSync && { lastSync: gmailService.lastSync }),
          ...(syncData.lastSync?.gmail && !gmailService?.lastSync && { lastSync: syncData.lastSync.gmail }),
          emailCount: 0,
          contactCount: 0,
        };
      } else {
        return {
          isConnected: false,
          ...(data.reason === "token_expired" && { error: "Gmail tokens have expired" }),
        };
      }
    } catch (error) {
      await logger.error(
        "Failed to check Gmail status",
        {
          operation: "gmail_api.check_status",
          additionalData: {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      return { isConnected: false, error: "Failed to check status" };
    }
  }

  static async fetchRecentEmails(): Promise<{
    emails: EmailPreview[];
    dateRange: { from: string; to: string } | null;
  }> {
    try {
      const data = await apiClient.post<EmailPreviewData>("/api/sync/preview/gmail", {});

      const richEmails: SampleEmail[] = Array.isArray(data.sampleEmails) ? data.sampleEmails : [];
      let samples = richEmails.slice(0, 5).map((e, index: number) => ({
        id: e?.id ?? `email-${index}`,
        subject: e?.subject ?? `Email ${index + 1}`,
        from: e?.from ?? "Sample Sender",
        date: e?.date ?? new Date(Date.now() - index * 86400000).toISOString(),
        snippet: e?.snippet ?? "",
        hasAttachments: Boolean(e?.hasAttachments),
        labels: Array.isArray(e?.labels) ? e.labels : [],
      }));

      if (samples.length === 0 && Array.isArray(data.sampleSubjects)) {
        samples = data.sampleSubjects.slice(0, 5).map((emailObj, index: number) => ({
          id: emailObj.id ?? `email-${index}`,
          subject: emailObj.subject ?? `Email ${index + 1}`,
          from: emailObj.from ?? "Sample Sender",
          date: emailObj.date ?? new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
          snippet: `This is a preview of email ${index + 1}...`,
          hasAttachments: false,
          labels: ["INBOX"],
        }));
      }

      let dateRange = null;
      if (Array.isArray(samples) && samples.length > 0) {
        const from =
          data?.dateRange?.from ??
          new Date(
            Math.min(...samples.map((e) => new Date(e.date).getTime() || Date.now())),
          ).toISOString();
        const to =
          data?.dateRange?.to ??
          new Date(
            Math.max(...samples.map((e) => new Date(e.date).getTime() || Date.now())),
          ).toISOString();
        dateRange = { from, to };
      }

      return { emails: samples, dateRange };
    } catch (error) {
      await logger.error(
        "Failed to fetch recent emails",
        {
          operation: "gmail_api.fetch_recent",
          additionalData: {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  static async updateProcessedCounts(): Promise<{ emailCount: number; contactCount: number }> {
    try {
      // Get email count
      const eventsData = await apiClient.get<{ total: number }>(
        "/api/google/gmail/raw-events?provider=gmail&pageSize=1",
        { showErrorToast: false },
      );
      const emailCount = eventsData.total || 0;

      // Get contact count
      const suggestionsData = await apiClient.post<{ suggestions: SearchResult[] }>(
        "/api/contacts-new/suggestions",
        {},
        { showErrorToast: false },
      );
      const contactCount = Array.isArray(suggestionsData.suggestions)
        ? suggestionsData.suggestions.length
        : 0;

      return { emailCount, contactCount };
    } catch (error) {
      await logger.error(
        "Failed to update processed counts",
        {
          operation: "gmail_api.update_counts",
          additionalData: {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      return { emailCount: 0, contactCount: 0 };
    }
  }

  static async connectGmail(): Promise<void> {
    window.location.href = "/api/google/gmail/oauth";
  }

  static async syncApprove(): Promise<void> {
    await apiClient.post<Record<string, unknown>>("/api/sync/approve/gmail", {});
  }

  static async runJobProcessor(): Promise<void> {
    await apiClient.post<Record<string, unknown>>("/api/jobs/runner", {});
  }

  static async checkJobStatus(): Promise<ConnectDashboardState["jobs"]> {
    try {
      const data = await apiClient.get<ConnectDashboardState>("/api/jobs/status");
      return data.jobs;
    } catch (error) {
      await logger.error(
        "Failed to check job status",
        {
          operation: "gmail_api.check_job_status",
          additionalData: {
            errorType: error instanceof Error ? error.constructor.name : typeof error,
          },
        },
        error instanceof Error ? error : undefined,
      );
      return {
        active: [],
        summary: {
          queued: 0,
          running: 0,
          completed: 0,
          failed: 0,
        },
        currentBatch: null,
      };
    }
  }

  static async searchGmail(query: string, limit: number = 5): Promise<SearchResult[]> {
    const data = await apiClient.post<{ results: SearchResult[] }>("/api/gmail/search", {
      query,
      limit,
    });
    return data.results || [];
  }

  static async loadInsights(): Promise<GmailInsights> {
    const data = await apiClient.get<{ insights: GmailInsights }>("/api/gmail/insights");
    return data.insights;
  }

  static async generateEmbeddings(): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>("/api/gmail/embed", { regenerate: false });
  }

  static async processContacts(): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>("/api/gmail/process-contacts", {});
  }
}
