/**
 * Tests for Gmail Business Schemas
 */

import { describe, it, expect } from "vitest";
import {
  GmailOAuthStartResponseSchema,
  GmailStatusResponseSchema,
  GmailSyncRequestSchema,
  GmailSyncResponseSchema,
  GmailSyncDirectResponseSchema,
  GmailSyncBlockingResponseSchema,
  GmailPreviewRequestSchema,
  GmailPreviewResponseSchema,
  GmailLabelsResponseSchema,
  GmailRawEventsQuerySchema,
  GmailRawEventsResponseSchema,
  GmailTestResponseSchema,
  GmailRefreshResponseSchema,
  GmailIngestionResultDTOSchema,
  CreateRawEventDTOSchema,
  EmailClassificationSchema,
  EmailPreviewSchema,
  PreviewRangeSchema,
  ConnectConnectionStatusSchema,
  JobSchema,
  ConnectDashboardStateSchema,
  SearchResultSchema,
  ContactDataSchema,
  EmailInsightsSchema,
} from "../gmail";

describe("GmailOAuthStartResponseSchema", () => {
  it("validates OAuth start response", () => {
    const response = {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth?client_id=123",
      state: "random-state-123",
    };

    const result = GmailOAuthStartResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("rejects invalid URL", () => {
    const response = {
      authUrl: "not-a-url",
      state: "state-123",
    };

    const result = GmailOAuthStartResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

describe("GmailStatusResponseSchema", () => {
  it("validates connected status", () => {
    const response = {
      isConnected: true,
      reason: "connected" as const,
      expiryDate: "2024-02-15T10:00:00Z",
      hasRefreshToken: true,
      autoRefreshed: false,
      service: "gmail",
    };

    const result = GmailStatusResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates disconnected status", () => {
    const response = {
      isConnected: false,
      reason: "no_integration" as const,
      expiryDate: null,
    };

    const result = GmailStatusResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("rejects invalid reason enum", () => {
    const response = {
      isConnected: true,
      reason: "invalid_reason",
    };

    const result = GmailStatusResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

describe("GmailSyncRequestSchema", () => {
  it("validates sync request with defaults", () => {
    const request = {};

    const result = GmailSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.incremental).toBe(true);
      expect(result.data.overlapHours).toBe(0);
    }
  });

  it("validates sync request with custom values", () => {
    const request = {
      incremental: false,
      overlapHours: 24,
      daysBack: 30,
    };

    const result = GmailSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("rejects overlapHours over maximum", () => {
    const request = {
      overlapHours: 73, // Max is 72
    };

    const result = GmailSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it("rejects daysBack over maximum", () => {
    const request = {
      daysBack: 366, // Max is 365
    };

    const result = GmailSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

describe("GmailSyncResponseSchema", () => {
  it("validates successful sync response", () => {
    const response = {
      success: true,
      messagesProcessed: 100,
      rawEventsCreated: 95,
      errors: [],
      duration: 5000,
      lastSyncTime: "2024-01-15T10:00:00Z",
    };

    const result = GmailSyncResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates sync response with errors", () => {
    const response = {
      success: false,
      messagesProcessed: 50,
      rawEventsCreated: 45,
      errors: ["Failed to process message 123", "Network timeout"],
      duration: 3000,
    };

    const result = GmailSyncResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const response = {
      success: true,
      // Missing messagesProcessed, rawEventsCreated, duration
    };

    const result = GmailSyncResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

describe("GmailSyncDirectResponseSchema", () => {
  it("validates complete direct sync response", () => {
    const response = {
      message: "Sync completed successfully",
      stats: {
        inserted: 100,
        updated: 5,
        skipped: 10,
        errors: 2,
      },
    };

    const result = GmailSyncDirectResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates minimal direct sync response", () => {
    const response = {
      message: "No new messages",
      stats: {
        inserted: 0,
      },
    };

    const result = GmailSyncDirectResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("GmailSyncBlockingResponseSchema", () => {
  it("validates successful blocking sync response", () => {
    const response = {
      sessionId: "550e8400-e29b-41d4-a716-446655440000",
      success: true,
      messagesProcessed: 250,
      normalizedInteractions: 240,
      duration: 15000,
      errors: [],
    };

    const result = GmailSyncBlockingResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates blocking sync with errors", () => {
    const response = {
      sessionId: "550e8400-e29b-41d4-a716-446655440001",
      success: false,
      messagesProcessed: 100,
      normalizedInteractions: 90,
      duration: 8000,
      errors: ["Failed to normalize some messages"],
    };

    const result = GmailSyncBlockingResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("rejects invalid UUID for sessionId", () => {
    const response = {
      sessionId: "not-a-uuid",
      success: true,
      messagesProcessed: 10,
      normalizedInteractions: 10,
      duration: 1000,
    };

    const result = GmailSyncBlockingResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

describe("GmailPreviewRequestSchema", () => {
  it("validates preview request with defaults", () => {
    const request = {};

    const result = GmailPreviewRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.count).toBe(10);
      expect(result.data.includeBody).toBe(false);
    }
  });

  it("validates custom preview request", () => {
    const request = {
      count: 25,
      includeBody: true,
    };

    const result = GmailPreviewRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("rejects count over maximum", () => {
    const request = {
      count: 51,
    };

    const result = GmailPreviewRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

describe("GmailPreviewResponseSchema", () => {
  it("validates complete preview response", () => {
    const response = {
      messages: [
        {
          id: "msg-123",
          threadId: "thread-456",
          subject: "Meeting tomorrow",
          from: "john@example.com",
          to: "jane@example.com",
          date: "2024-01-15T10:00:00Z",
          snippet: "Let's meet at 2pm",
          body: "Full email body here",
        },
      ],
      totalCount: 1,
      hasMore: false,
    };

    const result = GmailPreviewResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates preview with null fields", () => {
    const response = {
      messages: [
        {
          id: "msg-456",
          threadId: "thread-789",
          subject: null,
          from: null,
          to: null,
          date: "2024-01-15T11:00:00Z",
        },
      ],
      totalCount: 1,
      hasMore: true,
    };

    const result = GmailPreviewResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("GmailLabelsResponseSchema", () => {
  it("validates complete labels response", () => {
    const response = {
      labels: [
        {
          id: "INBOX",
          name: "Inbox",
          type: "system" as const,
          messagesTotal: 1000,
          messagesUnread: 50,
          threadsTotal: 800,
          threadsUnread: 40,
        },
        {
          id: "Label_1",
          name: "Work",
          type: "user" as const,
          messagesTotal: 250,
          messagesUnread: 10,
        },
      ],
    };

    const result = GmailLabelsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates minimal labels response", () => {
    const response = {
      labels: [
        {
          id: "SENT",
          name: "Sent",
          type: "system" as const,
        },
      ],
    };

    const result = GmailLabelsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("GmailRawEventsQuerySchema", () => {
  it("validates query with defaults", () => {
    const query = {};

    const result = GmailRawEventsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(25);
      expect(result.data.provider).toBe("gmail");
      expect(result.data.sort).toBe("occurredAt");
      expect(result.data.order).toBe("desc");
    }
  });

  it("validates query with all parameters", () => {
    const query = {
      page: "2",
      pageSize: "50",
      provider: "custom",
      sort: "createdAt",
      order: "asc",
      occurredAtFilter: "2024-01-01",
    };

    const result = GmailRawEventsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
      expect(typeof result.data.page).toBe("number");
    }
  });

  it("rejects pageSize over 100", () => {
    const query = {
      pageSize: "101",
    };

    const result = GmailRawEventsQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });
});

describe("GmailRawEventsResponseSchema", () => {
  it("validates complete raw events response", () => {
    const response = {
      items: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          userId: "550e8400-e29b-41d4-a716-446655440001",
          provider: "gmail",
          payload: { messageId: "msg-123", subject: "Test" },
          contactId: "550e8400-e29b-41d4-a716-446655440002",
          occurredAt: "2024-01-15T10:00:00Z",
          sourceMeta: { threadId: "thread-456" },
          batchId: "550e8400-e29b-41d4-a716-446655440003",
          sourceId: "source-123",
          createdAt: "2024-01-15T10:01:00Z",
        },
      ],
      total: 1,
    };

    const result = GmailRawEventsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates raw events with null fields", () => {
    const response = {
      items: [
        {
          id: "550e8400-e29b-41d4-a716-446655440004",
          userId: "550e8400-e29b-41d4-a716-446655440005",
          provider: "gmail",
          payload: {},
          contactId: null,
          occurredAt: "2024-01-15T10:00:00Z",
          batchId: null,
          sourceId: null,
          createdAt: "2024-01-15T10:01:00Z",
        },
      ],
      total: 1,
    };

    const result = GmailRawEventsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("GmailTestResponseSchema", () => {
  it("validates successful test response", () => {
    const response = {
      isConnected: true,
      message: "Gmail connection is healthy",
      timestamp: "2024-01-15T10:00:00Z",
    };

    const result = GmailTestResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates failed test response", () => {
    const response = {
      isConnected: false,
      message: "Connection failed",
      errorCode: "TOKEN_EXPIRED",
      timestamp: "2024-01-15T10:00:00Z",
    };

    const result = GmailTestResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("GmailRefreshResponseSchema", () => {
  it("validates successful refresh", () => {
    const response = {
      success: true,
      message: "Token refreshed successfully",
    };

    const result = GmailRefreshResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates failed refresh", () => {
    const response = {
      success: false,
      message: "Failed to refresh token",
    };

    const result = GmailRefreshResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("GmailIngestionResultDTOSchema", () => {
  it("validates successful ingestion result", () => {
    const result = {
      success: true,
      processed: 100,
      errors: [],
      duration: 5000,
    };

    const parsed = GmailIngestionResultDTOSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("validates ingestion result with errors", () => {
    const result = {
      success: false,
      processed: 50,
      errors: ["Error 1", "Error 2"],
      duration: 3000,
    };

    const parsed = GmailIngestionResultDTOSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe("CreateRawEventDTOSchema", () => {
  it("validates complete raw event creation", () => {
    const dto = {
      userId: "550e8400-e29b-41d4-a716-446655440000",
      sourceType: "gmail",
      sourceId: "msg-123",
      eventType: "email",
      eventData: { subject: "Test", from: "test@example.com" },
      processedAt: new Date("2024-01-15T10:00:00Z"),
    };

    const result = CreateRawEventDTOSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("validates raw event without processedAt", () => {
    const dto = {
      userId: "550e8400-e29b-41d4-a716-446655440001",
      sourceType: "gmail",
      sourceId: "msg-456",
      eventType: "email",
      eventData: {},
    };

    const result = CreateRawEventDTOSchema.safeParse(dto);
    expect(result.success).toBe(true);
  });

  it("coerces date string to Date", () => {
    const dto = {
      userId: "550e8400-e29b-41d4-a716-446655440002",
      sourceType: "gmail",
      sourceId: "msg-789",
      eventType: "email",
      eventData: {},
      processedAt: "2024-01-15T10:00:00Z",
    };

    const result = CreateRawEventDTOSchema.safeParse(dto);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.processedAt).toBeInstanceOf(Date);
    }
  });
});

describe("EmailClassificationSchema", () => {
  it("validates complete email classification", () => {
    const classification = {
      primaryCategory: "client_communication",
      subCategory: "appointment_request",
      confidence: 0.95,
      businessRelevance: 0.9,
      reasoning: "Email contains appointment scheduling language",
      extractedMetadata: {
        senderDomain: "client.com",
        hasAppointmentLanguage: true,
        hasPaymentLanguage: false,
        isFromClient: true,
        urgencyLevel: "high" as const,
      },
    };

    const result = EmailClassificationSchema.safeParse(classification);
    expect(result.success).toBe(true);
  });

  it("validates minimal classification", () => {
    const classification = {
      primaryCategory: "newsletter",
      subCategory: "marketing",
      confidence: 0.6,
      businessRelevance: 0.2,
      reasoning: "Marketing content detected",
      extractedMetadata: {},
    };

    const result = EmailClassificationSchema.safeParse(classification);
    expect(result.success).toBe(true);
  });

  it("rejects confidence out of range", () => {
    const classification = {
      primaryCategory: "spam",
      subCategory: "junk",
      confidence: 1.5, // Must be 0-1
      businessRelevance: 0.1,
      reasoning: "Spam detected",
      extractedMetadata: {},
    };

    const result = EmailClassificationSchema.safeParse(classification);
    expect(result.success).toBe(false);
  });
});

describe("EmailPreviewSchema", () => {
  it("validates complete email preview", () => {
    const preview = {
      id: "msg-123",
      subject: "Project Update",
      from: "john@example.com",
      to: ["jane@example.com", "bob@example.com"],
      date: "2024-01-15T10:00:00Z",
      snippet: "Quick update on the project status",
      hasAttachments: true,
      labels: ["INBOX", "Work"],
    };

    const result = EmailPreviewSchema.safeParse(preview);
    expect(result.success).toBe(true);
  });

  it("validates minimal email preview", () => {
    const preview = {
      id: "msg-456",
      subject: "Hi",
      from: "test@example.com",
      date: "2024-01-15T11:00:00Z",
      snippet: "Hello",
      hasAttachments: false,
      labels: [],
    };

    const result = EmailPreviewSchema.safeParse(preview);
    expect(result.success).toBe(true);
  });
});

describe("PreviewRangeSchema", () => {
  it("validates preview range", () => {
    const range = {
      from: "2024-01-01",
      to: "2024-01-31",
    };

    const result = PreviewRangeSchema.safeParse(range);
    expect(result.success).toBe(true);
  });
});

describe("ConnectConnectionStatusSchema", () => {
  it("validates complete connection status", () => {
    const status = {
      isConnected: true,
      emailCount: 1000,
      contactCount: 250,
      lastSync: "2024-01-15T10:00:00Z",
      expiryDate: "2024-02-15T10:00:00Z",
      hasRefreshToken: true,
      autoRefreshed: false,
      service: "gmail",
    };

    const result = ConnectConnectionStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });

  it("validates disconnected status", () => {
    const status = {
      isConnected: false,
      error: "Token expired",
    };

    const result = ConnectConnectionStatusSchema.safeParse(status);
    expect(result.success).toBe(true);
  });
});

describe("JobSchema", () => {
  it("validates complete job", () => {
    const job = {
      id: "job-123",
      kind: "gmail_sync",
      status: "running" as const,
      batchId: "batch-456",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:05:00Z",
    };

    const result = JobSchema.safeParse(job);
    expect(result.success).toBe(true);
  });

  it("validates minimal job", () => {
    const job = {
      id: "job-456",
      kind: "normalize",
      status: "queued" as const,
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    };

    const result = JobSchema.safeParse(job);
    expect(result.success).toBe(true);
  });

  it("rejects invalid status", () => {
    const job = {
      id: "job-789",
      kind: "embed",
      status: "cancelled", // Not a valid enum value
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-15T10:00:00Z",
    };

    const result = JobSchema.safeParse(job);
    expect(result.success).toBe(false);
  });
});

describe("ConnectDashboardStateSchema", () => {
  it("validates complete dashboard state", () => {
    const state = {
      connection: {
        isConnected: true,
        emailCount: 1000,
        contactCount: 250,
        lastSync: "2024-01-15T10:00:00Z",
      },
      hasConfiguredSettings: true,
      syncStatus: {
        googleConnected: true,
        serviceTokens: {
          google: true,
          gmail: true,
          calendar: true,
          unified: true,
        },
        flags: {
          gmail: true,
          calendar: true,
        },
        lastSync: {
          gmail: "2024-01-15T10:00:00Z",
          calendar: "2024-01-15T09:00:00Z",
        },
        lastBatchId: "batch-123",
        grantedScopes: {
          gmail: ["https://www.googleapis.com/auth/gmail.readonly"],
          calendar: ["https://www.googleapis.com/auth/calendar.readonly"],
        },
        jobs: {
          queued: 5,
          done: 100,
          error: 2,
        },
        embedJobs: {
          queued: 10,
          done: 50,
          error: 1,
        },
      },
      jobs: {
        active: [],
        summary: {
          queued: 5,
          running: 2,
          completed: 100,
          failed: 2,
        },
        currentBatch: "batch-123",
        totalEmails: 1000,
        processedEmails: 900,
      },
      emailPreview: {
        emails: [
          {
            id: "msg-1",
            subject: "Test",
            from: "test@example.com",
            date: "2024-01-15T10:00:00Z",
            snippet: "Test email",
            hasAttachments: false,
            labels: ["INBOX"],
          },
        ],
        range: {
          from: "2024-01-01",
          to: "2024-01-31",
        },
        previewRange: {
          from: "2024-01-01",
          to: "2024-01-31",
        },
      },
      weeklyDigest: null,
      marketingWikiCount: 10,
      wikiInsightsCount: 5,
      templateStats: null,
    };

    const result = ConnectDashboardStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it("validates minimal dashboard state", () => {
    const state = {
      connection: {
        isConnected: false,
      },
      jobs: null,
      emailPreview: {
        emails: [],
        range: null,
      },
    };

    const result = ConnectDashboardStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });
});

describe("SearchResultSchema", () => {
  it("validates complete search result", () => {
    const result = {
      subject: "Project Update",
      date: "2024-01-15T10:00:00Z",
      snippet: "Quick update on project",
      similarity: 0.95,
      contactInfo: {
        displayName: "John Doe",
      },
    };

    const parsed = SearchResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });

  it("validates search result without contact info", () => {
    const result = {
      subject: "Newsletter",
      date: "2024-01-15T11:00:00Z",
      snippet: "Monthly newsletter",
      similarity: 0.6,
    };

    const parsed = SearchResultSchema.safeParse(result);
    expect(parsed.success).toBe(true);
  });
});

describe("ContactDataSchema", () => {
  it("validates complete contact data", () => {
    const contact = {
      displayName: "Jane Smith",
      email: "jane@example.com",
      emailCount: 50,
    };

    const result = ContactDataSchema.safeParse(contact);
    expect(result.success).toBe(true);
  });

  it("validates contact data without display name", () => {
    const contact = {
      email: "unknown@example.com",
      emailCount: 5,
    };

    const result = ContactDataSchema.safeParse(contact);
    expect(result.success).toBe(true);
  });
});

describe("EmailInsightsSchema", () => {
  it("validates complete email insights", () => {
    const insights = {
      patterns: ["Most emails on Monday", "Peak hours 9-11 AM"],
      emailVolume: {
        total: 1000,
        thisWeek: 150,
        trend: "up" as const,
      },
      topContacts: [
        {
          displayName: "John Doe",
          email: "john@example.com",
          emailCount: 50,
        },
        {
          email: "jane@example.com",
          emailCount: 40,
        },
      ],
    };

    const result = EmailInsightsSchema.safeParse(insights);
    expect(result.success).toBe(true);
  });

  it("validates minimal insights", () => {
    const insights = {};

    const result = EmailInsightsSchema.safeParse(insights);
    expect(result.success).toBe(true);
  });

  it("rejects invalid trend value", () => {
    const insights = {
      emailVolume: {
        total: 1000,
        thisWeek: 150,
        trend: "increasing", // Should be "up", "down", or "stable"
      },
    };

    const result = EmailInsightsSchema.safeParse(insights);
    expect(result.success).toBe(false);
  });
});
