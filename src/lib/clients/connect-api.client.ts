// src/lib/clients/connect-api.client.ts
import { apiClient } from "@/lib/api/client";
import type {
  ConnectConnectionStatus,
  ConnectDashboardState,
  EmailPreview,
  SearchResult,
  EmailInsights,
} from "@/server/db/business-schemas";

/**
 * Unified Connect API Client (browser-side or isomorphic HTTP wrapper)
 * Consolidates the old GmailApiService + OmniConnectApiService into one place.
 *
 * NOTE: This is intentionally a "client" (HTTP) wrapper – keep server-only logic out of here.
 */

/* ---------------------------------- Types --------------------------------- */

interface SyncStatusResponse {
  lastSync?: { gmail?: string | null };
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
}

interface RawEventsResponse {
  total: number;
}

interface ContactSuggestionsResponse<T = unknown> {
  suggestions: T[];
}

interface EmbedResponse {
  message?: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface InsightsResponse {
  insights: EmailInsights | null;
}

interface EmailPreviewData {
  sampleEmails?: Array<{
    id?: string;
    subject?: string;
    from?: string;
    date?: string;
    snippet?: string;
    hasAttachments?: boolean;
    labels?: string[];
  }>;
  sampleSubjects?: Array<{
    id?: string;
    subject?: string;
    from?: string;
    date?: string;
  }>;
  dateRange?: { from: string; to: string };
}

/* ------------------------------- Implementation ---------------------------- */

export class ConnectApiClient {
  /* --------------------------- Status / Connection ------------------------- */

  /** Canonical Gmail status getter */
  static async getGmailStatus(): Promise<ConnectConnectionStatus> {
    const syncData = await apiClient.get<SyncStatusResponse>("/api/google/status", {
      showErrorToast: false,
    });

    const gmail = syncData?.services?.gmail;
    const isConnected = Boolean(gmail?.connected);
    const lastSync = gmail?.lastSync ?? syncData?.lastSync?.gmail ?? null;

    return {
      isConnected,
      lastSync: lastSync ?? undefined,
      emailCount: 0,
      contactCount: 0,
      ...(isConnected
        ? {}
        : { error: gmail ? "Gmail tokens have expired" : "Gmail not connected" }),
    };
  }

  /** Back-compat aliases */
  static async fetchGmailStats(): Promise<ConnectConnectionStatus> {
    return this.getGmailStatus();
  }
  static async checkGmailStatus(): Promise<ConnectConnectionStatus> {
    return this.getGmailStatus();
  }

  /** Starts OAuth flow (browser) */
  static connectGmail(): void {
    window.location.href = "/api/google/gmail/oauth";
  }

  /* ---------------------------------- Jobs --------------------------------- */

  static async getJobStatus(): Promise<ConnectDashboardState["jobs"]> {
    const data = await apiClient.get<ConnectDashboardState>("/api/jobs/status");
    return data.jobs;
  }
  /** Back-compat aliases */
  static async fetchJobStatus(): Promise<ConnectDashboardState["jobs"]> {
    return this.getJobStatus();
  }
  static async checkJobStatus(): Promise<ConnectDashboardState["jobs"]> {
    return this.getJobStatus();
  }

  static async runJobProcessor(): Promise<void> {
    await apiClient.post<Record<string, unknown>>("/api/jobs/runner", {});
  }

  static async syncApprove(): Promise<void> {
    await apiClient.post<Record<string, unknown>>("/api/sync/approve/gmail", {});
  }

  /* --------------------------------- Gmail --------------------------------- */

  static async syncGmail(): Promise<{ message: string }> {
    const result = await apiClient.post<{
      message?: string;
      stats: { inserted: number };
    }>("/api/google/gmail/sync", {});
    return {
      message:
        result.message ?? `Gmail sync completed - ${result.stats?.inserted ?? 0} emails processed`,
    };
  }

  static async generateEmbeddings(): Promise<{ message: string }> {
    const data = await apiClient.post<EmbedResponse>("/api/gmail/embed", { regenerate: false });
    return { message: data.message ?? "Embeddings generated successfully" };
  }

  static async searchGmail(query: string, limit: number = 5): Promise<SearchResult[]> {
    const data = await apiClient.post<SearchResponse>("/api/gmail/search", { query, limit });
    return data.results ?? [];
  }

  static async loadInsights(): Promise<EmailInsights | null> {
    const data = await apiClient.get<InsightsResponse>("/api/gmail/insights");
    return data.insights;
  }

  /** Count of raw Gmail events + suggested contacts (used for dashboard metrics) */
  static async updateProcessedCounts(): Promise<{ emailCount: number; contactCount: number }> {
    const events = await apiClient.get<RawEventsResponse>(
      "/api/google/gmail/raw-events?provider=gmail&pageSize=1",
      { showErrorToast: false },
    );
    const suggestions = await apiClient.post<ContactSuggestionsResponse<SearchResult>>(
      "/api/contacts-new/suggestions",
      {},
      { showErrorToast: false },
    );
    return {
      emailCount: events?.total ?? 0,
      contactCount: Array.isArray(suggestions?.suggestions) ? suggestions.suggestions.length : 0,
    };
  }

  /** Triggers contacts processing on server */
  static async processContacts(): Promise<{ message: string }> {
    return await apiClient.post<{ message: string }>("/api/gmail/process-contacts", {});
  }

  /* ---------------------------- Email Previews ----------------------------- */

  /**
   * Returns preview emails + date range from server preview endpoint.
   * Useful for UI summaries before a full sync.
   */
  static async getPreviewEmails(): Promise<{
    emails: EmailPreview[];
    dateRange: { from: string; to: string } | null;
  }> {
    const data = await apiClient.post<EmailPreviewData>("/api/sync/preview/gmail", {});

    const rich = Array.isArray(data.sampleEmails) ? data.sampleEmails : [];
    let emails: EmailPreview[] = rich.slice(0, 5).map((e, i) => ({
      id: e.id ?? `email-${i}`,
      subject: e.subject ?? `Email ${i + 1}`,
      from: e.from ?? "Unknown sender",
      date: e.date ?? new Date(Date.now() - i * 86400000).toISOString(),
      snippet: e.snippet ?? "",
      hasAttachments: Boolean(e.hasAttachments),
      labels: Array.isArray(e.labels) ? e.labels : [],
    }));

    if (emails.length === 0 && Array.isArray(data.sampleSubjects)) {
      emails = data.sampleSubjects.slice(0, 5).map((s, i) => ({
        id: s.id ?? `email-${i}`,
        subject: s.subject ?? `Email ${i + 1}`,
        from: s.from ?? "Unknown sender",
        date: s.date ?? new Date(Date.now() - i * 86400000).toISOString(),
        snippet: `This is a preview of email ${i + 1}...`,
        hasAttachments: false,
        labels: ["INBOX"],
      }));
    }

    let dateRange: { from: string; to: string } | null = null;
    if (emails.length > 0) {
      const from =
        data?.dateRange?.from ??
        new Date(
          Math.min(...emails.map((e) => new Date(e.date).getTime() || Date.now())),
        ).toISOString();
      const to =
        data?.dateRange?.to ??
        new Date(
          Math.max(...emails.map((e) => new Date(e.date).getTime() || Date.now())),
        ).toISOString();
      dateRange = { from, to };
    }

    return { emails, dateRange };
  }

  /**
   * Back-compat: return just the array of previews (used to be a stub in OmniConnect).
   * Prefer `getPreviewEmails()` going forward.
   */
  static async fetchRecentEmails(): Promise<EmailPreview[]> {
    const { emails } = await this.getPreviewEmails();
    return emails;
  }
}
