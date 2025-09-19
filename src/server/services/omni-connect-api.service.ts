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


interface SyncStatusResponse {
  lastSync?: { gmail?: string };
  serviceTokens?: { gmail?: boolean };
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

interface ContactSuggestionsResponse {
  suggestions: unknown[];
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
    // Get unified Google status (connection + sync info)
    const syncData = await apiClient.get<SyncStatusResponse>("/api/google/status", {
      showErrorToast: false,
    });

    // Extract Gmail-specific data from unified response
    const gmailService = syncData?.services?.gmail;
    const gmailStatusData = gmailService ? {
      isConnected: gmailService.connected,
      reason: gmailService.connected ? "connected" : "token_expired",
      autoRefreshed: gmailService.autoRefreshed,
      expiryDate: gmailService.integration?.expiryDate,
      hasRefreshToken: gmailService.integration?.hasRefreshToken,
      service: gmailService.integration?.service,
    } : { isConnected: false, reason: "no_integration" };

    // Get raw events count for emails processed
    const eventsUrl = apiClient.buildUrl("/api/google/gmail/raw-events", {
      provider: "gmail",
      pageSize: 1,
    });
    const eventsData = await apiClient.get<RawEventsResponse>(eventsUrl, { showErrorToast: false });
    const emailsProcessed = eventsData.total ?? 0;

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
    // Direct sync using new consolidated endpoint
    const result = await apiClient.post<{
      message: string;
      stats: {
        totalFound: number;
        processed: number;
        inserted: number;
        errors: number;
        batchId: string;
      };
    }>("/api/google/gmail/sync", {});

    return {
      message: result.message ?? `Gmail sync completed - ${result.stats.inserted} emails processed`
    };
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
    return [];
  }
}
