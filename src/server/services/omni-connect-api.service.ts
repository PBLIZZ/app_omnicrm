import { apiClient } from "@/lib/api/client";
import {
  GmailStats,
  JobStatus,
  EmailPreview,
  SearchResult,
  Insights,
} from "../../app/(authorisedRoute)/omni-connect/_components/types";

/**
 * OmniConnect API Service with integrated rate limiting
 *
 * All Google API operations (Gmail and Calendar) triggered through this service
 * are automatically rate-limited at the server level via withRateLimit wrapper
 * in the underlying Google API services. This ensures compliance with Google API
 * quotas and prevents rate limit errors during sync and data processing operations.
 */

// Type definitions for API responses
interface SyncPreviewResponse {
  countByLabel?: Record<string, number>;
  sampleSubjects?: EmailSample[];
}

interface EmailSample {
  id?: string;
  subject?: string;
  from?: string;
  date?: string;
}

interface SyncStatusResponse {
  lastSync?: { gmail?: string };
  serviceTokens?: { gmail?: boolean };
}

interface RawEventsResponse {
  total: number;
}

interface ContactSuggestionsResponse {
  suggestions: unknown[];
}

interface SyncApproveResponse {
  message: string;
}

interface EmbeddingsResponse {
  message: string;
}

interface SearchResponse {
  results: SearchResult[];
}

interface InsightsResponse {
  insights: Insights | null;
}

export class OmniConnectApiService {
  /**
   * Fetch Gmail statistics with rate-limited Google API calls
   */
  static async fetchGmailStats(): Promise<GmailStats> {
    // Get Gmail connection status with proper token expiry handling
    const gmailStatusData = await apiClient.get<{
      isConnected: boolean;
      reason?: string;
      expiryDate?: string;
      hasRefreshToken?: boolean;
      autoRefreshed?: boolean;
      service?: string;
    }>("/api/google/gmail/status", { showErrorToast: false });

    // Get sync status for lastSync info
    const syncData = await apiClient.get<SyncStatusResponse>("/api/settings/sync/status", {
      showErrorToast: false,
    });

    // Get raw events count for emails processed
    const eventsUrl = apiClient.buildUrl("/api/google/gmail/raw-events", {
      provider: "gmail",
      pageSize: 1,
    });
    const eventsData = await apiClient.get<RawEventsResponse>(eventsUrl, { showErrorToast: false });
    const emailsProcessed = eventsData.total || 0;

    // Get contacts suggestions for suggested contacts count
    const contactsData = await apiClient.post<ContactSuggestionsResponse>(
      "/api/contacts-new/suggestions",
      {},
      { showErrorToast: false },
    );
    const suggestedContacts = Array.isArray(contactsData.suggestions)
      ? contactsData.suggestions.length
      : 0;

    return {
      emailsProcessed,
      suggestedContacts,
      lastSync: syncData.lastSync?.gmail ?? null,
      isConnected: gmailStatusData.isConnected,
    };
  }

  static async syncGmail(): Promise<{ message: string }> {
    // First preview the sync
    const preview = await apiClient.post<SyncPreviewResponse>("/api/sync/preview/gmail", {});

    // Calculate total emails from countByLabel
    const totalEmails = Object.values(preview?.countByLabel ?? {}).reduce(
      (sum: number, count: unknown) => {
        return sum + (typeof count === "number" ? count : 0);
      },
      0,
    );

    // Show preview to user and ask for confirmation
    const sampleCount = preview?.sampleSubjects?.length ?? 0;
    const confirmed = window.confirm(
      `Gmail Sync Preview:\n\n` +
        `• Total emails found: ${totalEmails}\n` +
        `• Sample emails retrieved: ${sampleCount}\n` +
        `• Jobs will process automatically after approval\n\n` +
        `Proceed with sync? This will create background jobs to process your Gmail data.`,
    );

    if (!confirmed) {
      throw new Error("Sync cancelled by user");
    }

    // Proceed with sync
    const result = await apiClient.post<SyncApproveResponse>("/api/sync/approve/gmail", {});
    return { message: result.message ?? "Gmail sync approved and processing started" };
  }

  static async generateEmbeddings(): Promise<{ message: string }> {
    const data = await apiClient.post<EmbeddingsResponse>("/api/gmail/embed", {
      regenerate: false,
    });
    return { message: data.message ?? "Embeddings generated successfully" };
  }

  static async searchGmail(query: string, limit: number = 5): Promise<SearchResult[]> {
    const data = await apiClient.post<SearchResponse>("/api/gmail/search", {
      query,
      limit,
    });
    return data.results || [];
  }

  static async loadInsights(): Promise<Insights | null> {
    const data = await apiClient.get<InsightsResponse>("/api/gmail/insights");
    return data.insights;
  }

  static async fetchJobStatus(): Promise<JobStatus> {
    return await apiClient.get<JobStatus>("/api/jobs/status");
  }

  static async fetchRecentEmails(): Promise<EmailPreview[]> {
    const data = await apiClient.post<SyncPreviewResponse>("/api/sync/preview/gmail", {});

    // Extract sample subjects from the preview data
    if (
      data?.sampleSubjects &&
      Array.isArray(data.sampleSubjects) &&
      data.sampleSubjects.length > 0
    ) {
      return data.sampleSubjects.slice(0, 5).map((emailObj: EmailSample, index: number) => ({
        id: emailObj.id ?? `email-${index}`,
        subject: emailObj.subject ?? `Email ${index + 1}`,
        from: emailObj.from ?? "Sample Sender",
        date: emailObj.date ?? new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        snippet: `This is a preview of email ${index + 1}...`,
        hasAttachments: false,
        labels: ["INBOX"],
      }));
    }

    return [];
  }
}
