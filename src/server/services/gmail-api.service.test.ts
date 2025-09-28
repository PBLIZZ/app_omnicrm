import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { GmailApiService } from "./gmail-api.service";
import type {
  SearchResult,
  EmailInsights as GmailInsights,
} from "@/server/db/business-schemas";

// Mock the API client
vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

// Mock the logger
vi.mock("@/lib/observability", () => ({
  logger: {
    error: vi.fn(),
  },
}));

// Mock window.location for OAuth redirect
const mockLocation = {
  href: "",
};
Object.defineProperty(window, "location", {
  value: mockLocation,
  writable: true,
});

describe("GmailApiService", () => {
  // Get references to the mocked modules
  let apiClient: { get: ReturnType<typeof vi.fn>; post: ReturnType<typeof vi.fn> };
  let logger: { error: ReturnType<typeof vi.fn> };

  beforeAll(async () => {
    const apiModule = await import("@/lib/api/client");
    const loggerModule = await import("@/lib/observability");
    apiClient = apiModule.apiClient;
    logger = loggerModule.logger;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = "";
  });

  describe("checkGmailStatus", () => {
    it("returns connected status with sync data", async () => {
      const mockStatusData = {
        isConnected: true,
        expiryDate: "2024-12-31T23:59:59Z",
        hasRefreshToken: true,
        autoRefreshed: false,
        service: "gmail",
      };

      const mockSyncData = {
        lastSync: {
          gmail: "2024-01-15T10:30:00Z",
        },
      };

      apiClient.get.mockResolvedValueOnce(mockStatusData).mockResolvedValueOnce(mockSyncData);

      const result = await GmailApiService.checkGmailStatus();

      expect(result).toEqual({
        isConnected: true,
        lastSync: "2024-01-15T10:30:00Z",
        emailCount: 0,
        contactCount: 0,
      });

      expect(apiClient.get).toHaveBeenCalledWith("/api/google/gmail/status", {
        showErrorToast: false,
      });
      expect(apiClient.get).toHaveBeenCalledWith("/api/google/status", {
        showErrorToast: false,
      });
    });

    it("returns connected status without sync data", async () => {
      const mockStatusData = {
        isConnected: true,
        expiryDate: "2024-12-31T23:59:59Z",
        hasRefreshToken: true,
      };

      apiClient.get.mockResolvedValueOnce(mockStatusData).mockResolvedValueOnce({ lastSync: {} });

      const result = await GmailApiService.checkGmailStatus();

      expect(result).toEqual({
        isConnected: true,
        emailCount: 0,
        contactCount: 0,
      });
    });

    it("returns disconnected status with token expired error", async () => {
      apiClient.get.mockResolvedValueOnce({
        isConnected: false,
        reason: "token_expired",
      });

      const result = await GmailApiService.checkGmailStatus();

      expect(result).toEqual({
        isConnected: false,
        error: "Gmail tokens have expired",
      });

      expect(apiClient.get).toHaveBeenCalledTimes(1);
    });

    it("returns disconnected status without specific error", async () => {
      apiClient.get.mockResolvedValueOnce({
        isConnected: false,
        reason: "no_tokens",
      });

      const result = await GmailApiService.checkGmailStatus();

      expect(result).toEqual({
        isConnected: false,
      });
    });

    it("handles API errors gracefully", async () => {
      const mockError = new Error("Network error");
      apiClient.get.mockRejectedValueOnce(mockError);

      const result = await GmailApiService.checkGmailStatus();

      expect(result).toEqual({
        isConnected: false,
        error: "Failed to check status",
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to check Gmail status",
        expect.objectContaining({
          operation: "gmail_api.check_status",
          additionalData: expect.objectContaining({
            errorType: "Error",
          }),
        }),
        mockError,
      );
    });

    it("handles sync status API errors gracefully", async () => {
      apiClient.get.mockResolvedValueOnce({ isConnected: true }).mockRejectedValueOnce(new Error("Sync API error"));

      // Should still return connected status even if sync data fails
      const result = await GmailApiService.checkGmailStatus();

      expect(result.isConnected).toBe(true);
    });
  });

  describe("fetchRecentEmails", () => {
    it("returns formatted emails with date range", async () => {
      const mockPreviewData = {
        sampleEmails: [
          {
            id: "email-1",
            subject: "Meeting Invitation",
            from: "john@example.com",
            date: "2024-01-15T10:00:00Z",
            snippet: "You're invited to our weekly team meeting...",
            hasAttachments: true,
            labels: ["INBOX", "IMPORTANT"],
          },
          {
            id: "email-2",
            subject: "Project Update",
            from: "sarah@example.com",
            date: "2024-01-14T14:30:00Z",
            snippet: "Here's the latest update on the project...",
            hasAttachments: false,
            labels: ["INBOX"],
          },
        ],
        dateRange: {
          from: "2024-01-14T00:00:00Z",
          to: "2024-01-15T23:59:59Z",
        },
      };

      apiClient.post.mockResolvedValueOnce(mockPreviewData);

      const result = await GmailApiService.fetchRecentEmails();

      expect(result.emails).toHaveLength(2);
      expect(result.emails[0]).toEqual({
        id: "email-1",
        subject: "Meeting Invitation",
        from: "john@example.com",
        date: "2024-01-15T10:00:00Z",
        snippet: "You're invited to our weekly team meeting...",
        hasAttachments: true,
        labels: ["INBOX", "IMPORTANT"],
      });

      expect(result.dateRange).toEqual({
        from: "2024-01-14T00:00:00Z",
        to: "2024-01-15T23:59:59Z",
      });

      expect(apiClient.post).toHaveBeenCalledWith("/api/sync/preview/gmail", {});
    });

    it("fallbacks to sample subjects when no sample emails", async () => {
      apiClient.post.mockResolvedValueOnce({
        sampleEmails: [],
        sampleSubjects: [
          {
            id: "subj-1",
            subject: "Welcome Email",
            from: "welcome@example.com",
            date: "2024-01-15T09:00:00Z",
          },
          {
            id: "subj-2",
            subject: "Newsletter",
            from: "news@example.com",
            date: "2024-01-14T12:00:00Z",
          },
        ],
      });

      const result = await GmailApiService.fetchRecentEmails();

      expect(result.emails).toHaveLength(2);
      expect(result.emails[0]).toEqual({
        id: "subj-1",
        subject: "Welcome Email",
        from: "welcome@example.com",
        date: "2024-01-15T09:00:00Z",
        snippet: "This is a preview of email 1...",
        hasAttachments: false,
        labels: ["INBOX"],
      });
    });

    it("handles missing data with sensible defaults", async () => {
      apiClient.post.mockResolvedValueOnce({
        sampleEmails: [
          {
            // Missing most fields
            subject: "Partial Email",
          },
          {
            // Empty object
          },
        ],
      });

      const result = await GmailApiService.fetchRecentEmails();

      expect(result.emails).toHaveLength(2);
      expect(result.emails[0]).toEqual({
        id: "email-0",
        subject: "Partial Email",
        from: "Sample Sender",
        date: expect.any(String),
        snippet: "",
        hasAttachments: false,
        labels: [],
      });

      expect(result.emails[1]).toEqual({
        id: "email-1",
        subject: "Email 2",
        from: "Sample Sender",
        date: expect.any(String),
        snippet: "",
        hasAttachments: false,
        labels: [],
      });
    });

    it("limits emails to maximum of 5", async () => {
      apiClient.post.mockResolvedValueOnce({
        sampleEmails: Array.from({ length: 10 }, (_, i) => ({
          id: `email-${i}`,
          subject: `Email ${i + 1}`,
          from: `sender${i}@example.com`,
          date: new Date(Date.now() - i * 86400000).toISOString(),
        })),
      });

      const result = await GmailApiService.fetchRecentEmails();

      expect(result.emails).toHaveLength(5);
    });

    it("calculates date range from email dates when not provided", async () => {
      apiClient.post.mockResolvedValueOnce({
        sampleEmails: [
          {
            id: "email-1",
            subject: "Oldest Email",
            date: "2024-01-10T10:00:00Z",
          },
          {
            id: "email-2",
            subject: "Newest Email",
            date: "2024-01-20T15:00:00Z",
          },
        ],
      });

      const result = await GmailApiService.fetchRecentEmails();

      expect(result.dateRange).toEqual({
        from: "2024-01-10T10:00:00.000Z",
        to: "2024-01-20T15:00:00.000Z",
      });
    });

    it("returns null date range when no emails", async () => {
      apiClient.post.mockResolvedValueOnce({
        sampleEmails: [],
        sampleSubjects: [],
      });

      const result = await GmailApiService.fetchRecentEmails();

      expect(result.emails).toHaveLength(0);
      expect(result.dateRange).toBeNull();
    });

    it("handles API errors", async () => {
      const mockError = new Error("Preview API failed");
      apiClient.post.mockRejectedValueOnce(mockError);

      await expect(GmailApiService.fetchRecentEmails()).rejects.toThrow("Preview API failed");

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to fetch recent emails",
        expect.objectContaining({
          operation: "gmail_api.fetch_recent",
        }),
        mockError,
      );
    });
  });

  describe("updateProcessedCounts", () => {
    it("returns email and contact counts", async () => {
      apiClient.get.mockResolvedValueOnce({ total: 150 });
      apiClient.post.mockResolvedValueOnce({
        suggestions: [
          { id: "contact-1", name: "John Doe" },
          { id: "contact-2", name: "Jane Smith" },
          { id: "contact-3", name: "Bob Wilson" },
        ],
      });

      const result = await GmailApiService.updateProcessedCounts();

      expect(result).toEqual({
        emailCount: 150,
        contactCount: 3,
      });

      expect(apiClient.get).toHaveBeenCalledWith(
        "/api/google/gmail/raw-events?provider=gmail&pageSize=1",
        { showErrorToast: false },
      );
      expect(apiClient.post).toHaveBeenCalledWith(
        "/api/contacts-new/suggestions",
        {},
        { showErrorToast: false },
      );
    });

    it("handles missing totals gracefully", async () => {
      apiClient.get.mockResolvedValueOnce({}); // No total field
      apiClient.post.mockResolvedValueOnce({ suggestions: null }); // Not an array

      const result = await GmailApiService.updateProcessedCounts();

      expect(result).toEqual({
        emailCount: 0,
        contactCount: 0,
      });
    });

    it("handles API errors gracefully", async () => {
      const mockError = new Error("Counts API failed");
      apiClient.get.mockRejectedValueOnce(mockError);

      const result = await GmailApiService.updateProcessedCounts();

      expect(result).toEqual({
        emailCount: 0,
        contactCount: 0,
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to update processed counts",
        expect.objectContaining({
          operation: "gmail_api.update_counts",
        }),
        mockError,
      );
    });

    it("handles partial API failures", async () => {
      apiClient.get.mockResolvedValueOnce({ total: 100 });
      apiClient.post.mockRejectedValueOnce(new Error("Suggestions API failed"));

      const result = await GmailApiService.updateProcessedCounts();

      expect(result).toEqual({
        emailCount: 0, // Should be 0 due to overall failure
        contactCount: 0,
      });
    });
  });

  describe("connectGmail", () => {
    it("redirects to OAuth URL", async () => {
      await GmailApiService.connectGmail();

      expect(mockLocation.href).toBe("/api/google/gmail/oauth");
    });
  });

  describe("syncApprove", () => {
    it("calls sync approve API", async () => {
      apiClient.post.mockResolvedValueOnce({ success: true });

      await GmailApiService.syncApprove();

      expect(apiClient.post).toHaveBeenCalledWith("/api/sync/approve/gmail", {});
    });

    it("handles sync approve errors", async () => {
      const mockError = new Error("Sync approve failed");
      apiClient.post.mockRejectedValueOnce(mockError);

      await expect(GmailApiService.syncApprove()).rejects.toThrow("Sync approve failed");
    });
  });

  describe("runJobProcessor", () => {
    it("calls job runner API", async () => {
      apiClient.post.mockResolvedValueOnce({ message: "Jobs processed" });

      await GmailApiService.runJobProcessor();

      expect(apiClient.post).toHaveBeenCalledWith("/api/jobs/runner", {});
    });

    it("handles job runner errors", async () => {
      const mockError = new Error("Job runner failed");
      apiClient.post.mockRejectedValueOnce(mockError);

      await expect(GmailApiService.runJobProcessor()).rejects.toThrow("Job runner failed");
    });
  });

  describe("checkJobStatus", () => {
    it("returns job status", async () => {
      const mockJobStatus: JobStatus = {
        jobs: [
          {
            id: "job-1",
            kind: "insight",
            status: "completed",
            progress: 100,
            createdAt: "2024-01-15T10:00:00Z",
            updatedAt: "2024-01-15T10:00:00Z",
          },
          {
            id: "job-2",
            kind: "embed",
            status: "running",
            progress: 75,
            createdAt: "2024-01-15T10:05:00Z",
            updatedAt: "2024-01-15T10:05:00Z",
          },
        ],
        currentBatch: "batch-123",
      };

      apiClient.get.mockResolvedValueOnce(mockJobStatus);

      const result = await GmailApiService.checkJobStatus();

      expect(result).toEqual(mockJobStatus);
      expect(apiClient.get).toHaveBeenCalledWith("/api/jobs/status");
    });

    it("handles job status API errors", async () => {
      const mockError = new Error("Job status API failed");
      apiClient.get.mockRejectedValueOnce(mockError);

      const result = await GmailApiService.checkJobStatus();

      expect(result).toEqual({
        jobs: [],
        currentBatch: null,
      });

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to check job status",
        expect.objectContaining({
          operation: "gmail_api.check_job_status",
        }),
        mockError,
      );
    });
  });

  describe("searchGmail", () => {
    it("searches emails with query and limit", async () => {
      const mockSearchResults: SearchResult[] = [
        {
          subject: "Meeting Notes",
          date: "2024-01-15T10:00:00Z",
          snippet: "Notes from our team meeting...",
          similarity: 0.95,
        },
        {
          subject: "Project Update",
          date: "2024-01-14T15:30:00Z",
          snippet: "Latest project status update...",
          similarity: 0.88,
        },
      ];

      const mockResponse = { results: mockSearchResults };
      apiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await GmailApiService.searchGmail("meeting", 5);

      expect(result).toEqual(mockSearchResults);
      expect(apiClient.post).toHaveBeenCalledWith("/api/gmail/search", {
        query: "meeting",
        limit: 5,
      });
    });

    it("uses default limit when not specified", async () => {
      apiClient.post.mockResolvedValueOnce({ results: [] });

      await GmailApiService.searchGmail("test query");

      expect(apiClient.post).toHaveBeenCalledWith("/api/gmail/search", {
        query: "test query",
        limit: 5,
      });
    });

    it("handles empty search results", async () => {
      apiClient.post.mockResolvedValueOnce({ results: null });

      const result = await GmailApiService.searchGmail("nonexistent");

      expect(result).toEqual([]);
    });

    it("handles search API errors", async () => {
      const mockError = new Error("Search API failed");
      apiClient.post.mockRejectedValueOnce(mockError);

      await expect(GmailApiService.searchGmail("test")).rejects.toThrow("Search API failed");
    });
  });

  describe("loadInsights", () => {
    it("returns Gmail insights", async () => {
      const mockInsights: GmailInsights = {
        patterns: ["Weekly reports", "Project updates"],
        emailVolume: {
          total: 1250,
          thisWeek: 32,
          trend: "up" as const,
        },
        topContacts: [
          { email: "john@example.com", displayName: "John Doe", emailCount: 25 },
          { email: "sarah@example.com", displayName: "Sarah Smith", emailCount: 18 },
        ],
      };

      apiClient.get.mockResolvedValueOnce({ insights: mockInsights });

      const result = await GmailApiService.loadInsights();

      expect(result).toEqual(mockInsights);
      expect(apiClient.get).toHaveBeenCalledWith("/api/gmail/insights");
    });

    it("handles insights API errors", async () => {
      const mockError = new Error("Insights API failed");
      apiClient.get.mockRejectedValueOnce(mockError);

      await expect(GmailApiService.loadInsights()).rejects.toThrow("Insights API failed");
    });
  });

  describe("generateEmbeddings", () => {
    it("generates embeddings without regeneration", async () => {
      const expectedResponse = { message: "Embeddings generated successfully" };
      apiClient.post.mockResolvedValueOnce(expectedResponse);

      const result = await GmailApiService.generateEmbeddings();

      expect(result).toEqual(expectedResponse);
      expect(apiClient.post).toHaveBeenCalledWith("/api/gmail/embed", { regenerate: false });
    });

    it("handles embedding generation errors", async () => {
      const mockError = new Error("Embedding generation failed");
      apiClient.post.mockRejectedValueOnce(mockError);

      await expect(GmailApiService.generateEmbeddings()).rejects.toThrow(
        "Embedding generation failed",
      );
    });
  });

  describe("processContacts", () => {
    it("processes contacts successfully", async () => {
      const expectedResponse = { message: "Contacts processed successfully" };
      apiClient.post.mockResolvedValueOnce(expectedResponse);

      const result = await GmailApiService.processContacts();

      expect(result).toEqual(expectedResponse);
      expect(apiClient.post).toHaveBeenCalledWith("/api/gmail/process-contacts", {});
    });

    it("handles contact processing errors", async () => {
      const mockError = new Error("Contact processing failed");
      apiClient.post.mockRejectedValueOnce(mockError);

      await expect(GmailApiService.processContacts()).rejects.toThrow("Contact processing failed");
    });
  });

  describe("error handling patterns", () => {
    it("handles non-Error objects gracefully", async () => {
      const nonErrorObject = { message: "Something went wrong", code: 500 };
      apiClient.get.mockRejectedValueOnce(nonErrorObject);

      const result = await GmailApiService.checkGmailStatus();

      expect(result.isConnected).toBe(false);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to check Gmail status",
        expect.objectContaining({
          additionalData: expect.objectContaining({
            errorType: "object",
          }),
        }),
        undefined, // Non-Error objects are not passed as the third parameter
      );
    });

    it("handles string errors gracefully", async () => {
      const stringError = "String error message";
      apiClient.get.mockRejectedValueOnce(stringError);

      const result = await GmailApiService.checkGmailStatus();

      expect(result.isConnected).toBe(false);

      expect(logger.error).toHaveBeenCalledWith(
        "Failed to check Gmail status",
        expect.objectContaining({
          additionalData: expect.objectContaining({
            errorType: "string",
          }),
        }),
        undefined,
      );
    });
  });
});
