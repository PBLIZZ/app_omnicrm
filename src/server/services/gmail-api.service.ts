import { fetchGet, fetchPost } from "@/lib/api";
import {
  GmailConnectionStatus,
  EmailPreview,
  JobStatus,
  SearchResult,
  GmailInsights,
} from "../../app/(authorisedRoute)/omni-connect/_components/types";

export class GmailApiService {
  static async checkGmailStatus(): Promise<GmailConnectionStatus> {
    try {
      const data = await fetchGet<{
        serviceTokens?: { gmail?: boolean };
        lastSync?: { gmail?: string };
      }>("/api/settings/sync/status");

      const hasGmailToken = data?.serviceTokens?.gmail;
      const lastSync = data?.lastSync?.gmail;

      if (hasGmailToken) {
        return {
          isConnected: true,
          lastSync: lastSync,
          emailCount: 0,
          contactCount: 0,
        };
      } else {
        return { isConnected: false };
      }
    } catch (error) {
      console.error("Error checking Gmail status:", error);
      return { isConnected: false, error: "Failed to check status" };
    }
  }

  static async fetchRecentEmails(): Promise<{
    emails: EmailPreview[];
    dateRange: { from: string; to: string } | null;
  }> {
    try {
      const data = await fetchPost<{
        sampleEmails?: any[];
        sampleSubjects?: any[];
        dateRange?: { from: string; to: string };
      }>("/api/sync/preview/gmail", {});

      const richEmails: any[] = Array.isArray(data.sampleEmails) ? data.sampleEmails : [];
      let samples = richEmails.slice(0, 5).map((e: any, index: number) => ({
        id: e?.id ?? `email-${index}`,
        subject: e?.subject ?? `Email ${index + 1}`,
        from: e?.from ?? "Sample Sender",
        date: e?.date ?? new Date(Date.now() - index * 86400000).toISOString(),
        snippet: e?.snippet ?? "",
        hasAttachments: Boolean(e?.hasAttachments),
        labels: Array.isArray(e?.labels) ? e.labels : [],
      }));

      if (samples.length === 0 && Array.isArray(data.sampleSubjects)) {
        samples = data.sampleSubjects.slice(0, 5).map((emailObj: any, index: number) => ({
          id: emailObj.id || `email-${index}`,
          subject: emailObj.subject || `Email ${index + 1}`,
          from: emailObj.from || "Sample Sender",
          date: emailObj.date || new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
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
            Math.min(...samples.map((e: any) => new Date(e.date).getTime() || Date.now())),
          ).toISOString();
        const to =
          data?.dateRange?.to ??
          new Date(
            Math.max(...samples.map((e: any) => new Date(e.date).getTime() || Date.now())),
          ).toISOString();
        dateRange = { from, to };
      }

      return { emails: samples, dateRange };
    } catch (error) {
      console.error("Error fetching recent emails:", error);
      throw error;
    }
  }

  static async updateProcessedCounts(): Promise<{ emailCount: number; contactCount: number }> {
    try {
      // Get email count
      const eventsData = await fetchGet<{ total: number }>(
        "/api/google/gmail/raw-events?provider=gmail&pageSize=1",
        { showErrorToast: false },
      );
      const emailCount = eventsData.total || 0;

      // Get contact count
      const suggestionsData = await fetchPost<{ suggestions: any[] }>(
        "/api/contacts-new/suggestions",
        {},
        { showErrorToast: false },
      );
      const contactCount = Array.isArray(suggestionsData.suggestions)
        ? suggestionsData.suggestions.length
        : 0;

      return { emailCount, contactCount };
    } catch (error) {
      console.error("Failed to update processed counts:", error);
      return { emailCount: 0, contactCount: 0 };
    }
  }

  static async connectGmail(): Promise<void> {
    window.location.href = "/api/google/gmail/oauth";
  }

  static async syncApprove(): Promise<void> {
    await fetchPost<any>("/api/sync/approve/gmail", {});
  }

  static async runJobProcessor(): Promise<void> {
    await fetchPost<any>("/api/jobs/runner", {});
  }

  static async checkJobStatus(): Promise<JobStatus> {
    try {
      return await fetchGet<JobStatus>("/api/jobs/status");
    } catch (error) {
      console.error("Error checking job status:", error);
      return {};
    }
  }

  static async searchGmail(query: string, limit: number = 5): Promise<SearchResult[]> {
    const data = await fetchPost<{ results: SearchResult[] }>("/api/gmail/search", {
      query,
      limit,
    });
    return data.results || [];
  }

  static async loadInsights(): Promise<GmailInsights> {
    const data = await fetchGet<{ insights: GmailInsights }>("/api/gmail/insights");
    return data.insights;
  }

  static async generateEmbeddings(): Promise<{ message: string }> {
    return await fetchPost<{ message: string }>("/api/gmail/embed", { regenerate: false });
  }

  static async processContacts(): Promise<{ message: string }> {
    return await fetchPost<{ message: string }>("/api/gmail/process-contacts", {});
  }
}
