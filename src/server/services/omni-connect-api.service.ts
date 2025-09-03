import { fetchGet, fetchPost, buildUrl } from "@/lib/api";
import {
  GmailStats,
  JobStatus,
  EmailPreview,
  SearchResult,
  Insights,
} from "../../app/(authorisedRoute)/omni-connect/_components/omni-connect-types";

export class OmniConnectApiService {
  static async fetchGmailStats(): Promise<GmailStats> {
    // Get sync status using the API utility
    const syncData = await fetchGet<{
      lastSync?: { gmail?: string };
      serviceTokens?: { gmail?: boolean };
    }>("/api/settings/sync/status", { showErrorToast: false });

    // Get raw events count for emails processed
    const eventsUrl = buildUrl("/api/google/gmail/raw-events", {
      provider: "gmail",
      pageSize: 1,
    });
    const eventsData = await fetchGet<{ total: number }>(eventsUrl, { showErrorToast: false });
    const emailsProcessed = eventsData.total || 0;

    // Get contacts suggestions for suggested contacts count
    const contactsData = await fetchPost<{ suggestions: unknown[] }>(
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
      lastSync: syncData.lastSync?.gmail || null,
      isConnected: syncData.serviceTokens?.gmail || false,
    };
  }

  static async syncGmail(): Promise<{ message: string }> {
    // First preview the sync
    const preview = await fetchPost<{
      countByLabel?: Record<string, number>;
      sampleSubjects?: any[];
    }>("/api/sync/preview/gmail", {});

    // Calculate total emails from countByLabel
    const totalEmails = Object.values(preview?.countByLabel || {}).reduce(
      (sum: number, count: any) => sum + (typeof count === "number" ? count : 0),
      0,
    );

    // Show preview to user and ask for confirmation
    const sampleCount = preview?.sampleSubjects?.length || 0;
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
    const result = await fetchPost<{ message: string }>("/api/sync/approve/gmail", {});
    return { message: result.message || "Gmail sync approved and processing started" };
  }

  static async generateEmbeddings(): Promise<{ message: string }> {
    const data = await fetchPost<{ message: string }>("/api/gmail/embed", { regenerate: false });
    return { message: data.message || "Embeddings generated successfully" };
  }

  static async searchGmail(query: string, limit: number = 5): Promise<SearchResult[]> {
    const data = await fetchPost<{ results: SearchResult[] }>("/api/gmail/search", {
      query,
      limit,
    });
    return data.results || [];
  }

  static async loadInsights(): Promise<Insights | null> {
    const data = await fetchGet<{ insights: Insights | null }>("/api/gmail/insights");
    return data.insights;
  }

  static async fetchJobStatus(): Promise<JobStatus> {
    return await fetchGet<JobStatus>("/api/jobs/status");
  }

  static async fetchRecentEmails(): Promise<EmailPreview[]> {
    const data = await fetchPost<{
      sampleSubjects?: any[];
    }>("/api/sync/preview/gmail", {});

    // Extract sample subjects from the preview data
    if (
      data?.sampleSubjects &&
      Array.isArray(data.sampleSubjects) &&
      data.sampleSubjects.length > 0
    ) {
      return data.sampleSubjects.slice(0, 5).map((emailObj: any, index: number) => ({
        id: emailObj.id || `email-${index}`,
        subject: emailObj.subject || `Email ${index + 1}`,
        from: emailObj.from || "Sample Sender",
        date: emailObj.date || new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        snippet: `This is a preview of email ${index + 1}...`,
      }));
    }

    return [];
  }
}
