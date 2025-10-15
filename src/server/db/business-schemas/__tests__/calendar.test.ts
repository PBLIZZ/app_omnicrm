/**
 * Tests for Calendar Business Schemas
 */

import { describe, it, expect } from "vitest";
import {
  CalendarOAuthQuerySchema,
  CalendarSyncRequestSchema,
  CalendarSyncResponseSchema,
  CalendarSyncBlockingRequestSchema,
  CalendarSyncBlockingResponseSchema,
  CalendarImportRequestSchema,
  CalendarStatusResponseSchema,
  CalendarEventsQuerySchema,
  CalendarEventsResponseSchema,
  CalendarListQuerySchema,
  CalendarListResponseSchema,
  CalendarItemSchema,
  ClientSchema,
  AppointmentSchema,
  WeeklyStatsSchema,
} from "../calendar";

describe("CalendarOAuthQuerySchema", () => {
  it("validates OAuth query with all fields", () => {
    const query = {
      code: "4/0AY0e-g7xyz",
      state: "random-state-123",
      error: undefined,
    };

    const result = CalendarOAuthQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it("validates OAuth error query", () => {
    const query = {
      error: "access_denied",
      state: "random-state-123",
    };

    const result = CalendarOAuthQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });

  it("validates empty OAuth query", () => {
    const query = {};

    const result = CalendarOAuthQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
  });
});

describe("CalendarSyncRequestSchema", () => {
  it("validates sync request with default values", () => {
    const request = {};

    const result = CalendarSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.daysPast).toBe(180);
      expect(result.data.daysFuture).toBe(365);
      expect(result.data.maxResults).toBe(2500);
    }
  });

  it("validates sync request with custom values", () => {
    const request = {
      daysPast: 90,
      daysFuture: 180,
      maxResults: 1000,
    };

    const result = CalendarSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.daysPast).toBe(90);
      expect(result.data.daysFuture).toBe(180);
      expect(result.data.maxResults).toBe(1000);
    }
  });

  it("rejects daysPast over maximum", () => {
    const request = {
      daysPast: 731, // Max is 730
    };

    const result = CalendarSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it("rejects daysPast below minimum", () => {
    const request = {
      daysPast: 0,
    };

    const result = CalendarSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it("rejects maxResults over maximum", () => {
    const request = {
      maxResults: 2501,
    };

    const result = CalendarSyncRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

describe("CalendarSyncResponseSchema", () => {
  it("validates complete sync response", () => {
    const response = {
      message: "Successfully synced calendar events",
      stats: {
        syncedEvents: 42,
        processedJobs: 10,
        daysPast: 180,
        daysFuture: 365,
        maxResults: 2500,
        batchId: "550e8400-e29b-41d4-a716-446655440000",
      },
    };

    const result = CalendarSyncResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates sync response without optional fields", () => {
    const response = {
      message: "Sync completed",
      stats: {
        syncedEvents: 0,
        daysPast: 180,
        daysFuture: 365,
        maxResults: 2500,
      },
    };

    const result = CalendarSyncResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("rejects sync response with missing required fields", () => {
    const response = {
      message: "Sync completed",
      stats: {
        syncedEvents: 10,
        // Missing daysPast, daysFuture, maxResults
      },
    };

    const result = CalendarSyncResponseSchema.safeParse(response);
    expect(result.success).toBe(false);
  });
});

describe("CalendarSyncBlockingRequestSchema", () => {
  it("validates blocking sync request with preferences", () => {
    const request = {
      preferences: {
        calendarIds: ["calendar-1", "calendar-2"],
        calendarIncludeOrganizerSelf: true,
        calendarIncludePrivate: false,
        calendarTimeWindowDays: 365,
        calendarFutureDays: 180,
      },
      daysPast: 180,
      daysFuture: 365,
      maxResults: 2500,
    };

    const result = CalendarSyncBlockingRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates minimal blocking sync request", () => {
    const request = {
      maxResults: 1000,
    };

    const result = CalendarSyncBlockingRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.maxResults).toBe(1000);
    }
  });
});

describe("CalendarSyncBlockingResponseSchema", () => {
  it("validates complete blocking sync response", () => {
    const response = {
      sessionId: "session-123",
      message: "Sync completed successfully",
      stats: {
        syncedEvents: 100,
        processedJobs: 25,
        daysPast: 180,
        daysFuture: 365,
        maxResults: 2500,
        batchId: "550e8400-e29b-41d4-a716-446655440000",
      },
      partialFailure: false,
    };

    const result = CalendarSyncBlockingResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates blocking sync response with partial failure", () => {
    const response = {
      sessionId: "session-456",
      message: "Sync completed with errors",
      stats: {
        syncedEvents: 50,
        processedJobs: 10,
        daysPast: 180,
        daysFuture: 365,
        maxResults: 2500,
        batchId: "550e8400-e29b-41d4-a716-446655440001",
      },
      partialFailure: true,
    };

    const result = CalendarSyncBlockingResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("CalendarImportRequestSchema", () => {
  it("validates import request with calendar IDs", () => {
    const request = {
      calendarIds: ["primary", "work-calendar", "personal-calendar"],
      daysPast: 90,
      daysFuture: 180,
    };

    const result = CalendarImportRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("validates empty import request", () => {
    const request = {};

    const result = CalendarImportRequestSchema.safeParse(request);
    expect(result.success).toBe(true);
  });

  it("rejects empty calendar IDs", () => {
    const request = {
      calendarIds: ["", "valid-id"],
    };

    const result = CalendarImportRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });

  it("rejects daysPast over maximum", () => {
    const request = {
      daysPast: 366,
    };

    const result = CalendarImportRequestSchema.safeParse(request);
    expect(result.success).toBe(false);
  });
});

describe("CalendarStatusResponseSchema", () => {
  it("validates connected status", () => {
    const response = {
      isConnected: true,
      lastSyncTime: "2024-01-15T10:00:00Z",
      totalEvents: 150,
      recentErrorCount: 0,
      reason: "connected" as const,
      expiryDate: "2024-02-15T10:00:00Z",
      hasRefreshToken: true,
      autoRefreshed: false,
      service: "calendar",
    };

    const result = CalendarStatusResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates disconnected status", () => {
    const response = {
      isConnected: false,
      lastSyncTime: null,
      totalEvents: 0,
      recentErrorCount: 2,
      reason: "no_integration" as const,
      expiryDate: null,
    };

    const result = CalendarStatusResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("CalendarEventsQuerySchema", () => {
  it("validates query with default limit", () => {
    const query = {
      startDate: "2024-01-01",
      endDate: "2024-01-31",
    };

    const result = CalendarEventsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(50);
    }
  });

  it("validates query with custom limit", () => {
    const query = {
      limit: "25",
    };

    const result = CalendarEventsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(25);
      expect(typeof result.data.limit).toBe("number");
    }
  });

  it("rejects limit over 100", () => {
    const query = {
      limit: "101",
    };

    const result = CalendarEventsQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });
});

describe("CalendarEventsResponseSchema", () => {
  it("validates complete events response", () => {
    const response = {
      events: [
        {
          id: "550e8400-e29b-41d4-a716-446655440000",
          googleEventId: "google-event-123",
          title: "Team Meeting",
          description: "Weekly sync",
          startTime: "2024-01-15T10:00:00Z",
          endTime: "2024-01-15T11:00:00Z",
          attendees: [
            {
              email: "user@example.com",
              name: "John Doe",
              responseStatus: "accepted",
            },
          ],
          location: "Conference Room A",
          status: "confirmed",
          eventType: "meeting",
          businessCategory: "internal",
        },
      ],
      total: 1,
    };

    const result = CalendarEventsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates minimal events response", () => {
    const response = {
      events: [
        {
          id: "550e8400-e29b-41d4-a716-446655440001",
          title: "Quick Call",
          startTime: "2024-01-15T14:00:00Z",
          endTime: "2024-01-15T14:30:00Z",
          attendees: null,
        },
      ],
      total: 1,
    };

    const result = CalendarEventsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates empty events response", () => {
    const response = {
      events: [],
      total: 0,
    };

    const result = CalendarEventsResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("CalendarListQuerySchema", () => {
  it("validates query with default includeHidden", () => {
    const query = {};

    const result = CalendarListQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeHidden).toBe(false);
    }
  });

  it("coerces string to boolean", () => {
    const query = {
      includeHidden: "true",
    };

    const result = CalendarListQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.includeHidden).toBe(true);
      expect(typeof result.data.includeHidden).toBe("boolean");
    }
  });
});

describe("CalendarListResponseSchema", () => {
  it("validates complete calendar list response", () => {
    const response = {
      calendars: [
        {
          id: "primary",
          summary: "Primary Calendar",
          description: "Main calendar",
          timeZone: "America/New_York",
          primary: true,
          accessRole: "owner",
          backgroundColor: "#9fc6e7",
          foregroundColor: "#000000",
        },
        {
          id: "work-calendar",
          summary: "Work",
          timeZone: "America/New_York",
        },
      ],
      total: 2,
    };

    const result = CalendarListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates empty calendar list", () => {
    const response = {
      calendars: [],
      total: 0,
    };

    const result = CalendarListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});

describe("CalendarItemSchema", () => {
  it("validates calendar item", () => {
    const item = {
      id: "primary",
      summary: "Primary Calendar",
      primary: true,
      accessRole: "owner",
    };

    const result = CalendarItemSchema.safeParse(item);
    expect(result.success).toBe(true);
  });
});

describe("ClientSchema", () => {
  it("validates complete client", () => {
    const client = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      name: "Jane Smith",
      email: "jane@example.com",
      avatar: "https://example.com/avatar.jpg",
      totalSessions: 12,
      totalSpent: 1200,
      lastSessionDate: "2024-01-10T10:00:00Z",
      nextSessionDate: "2024-01-20T14:00:00Z",
      status: "active" as const,
      satisfaction: 5,
      preferences: {
        preferredTimes: ["morning", "afternoon"],
        preferredServices: ["massage", "yoga"],
        goals: ["stress relief", "flexibility"],
      },
    };

    const result = ClientSchema.safeParse(client);
    expect(result.success).toBe(true);
  });

  it("validates minimal client", () => {
    const client = {
      id: "550e8400-e29b-41d4-a716-446655440001",
      name: "Bob Jones",
      email: "bob@example.com",
      totalSessions: 0,
      totalSpent: 0,
      lastSessionDate: "2024-01-01T00:00:00Z",
      status: "prospect" as const,
      satisfaction: 3,
    };

    const result = ClientSchema.safeParse(client);
    expect(result.success).toBe(true);
  });

  it("rejects invalid satisfaction score", () => {
    const client = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      name: "Invalid Client",
      email: "invalid@example.com",
      totalSessions: 1,
      totalSpent: 100,
      lastSessionDate: "2024-01-01T00:00:00Z",
      status: "active" as const,
      satisfaction: 6, // Max is 5
    };

    const result = ClientSchema.safeParse(client);
    expect(result.success).toBe(false);
  });

  it("rejects invalid status", () => {
    const client = {
      id: "550e8400-e29b-41d4-a716-446655440003",
      name: "Invalid Status",
      email: "status@example.com",
      totalSessions: 1,
      totalSpent: 100,
      lastSessionDate: "2024-01-01T00:00:00Z",
      status: "archived",
      satisfaction: 3,
    };

    const result = ClientSchema.safeParse(client);
    expect(result.success).toBe(false);
  });
});

describe("AppointmentSchema", () => {
  it("validates complete appointment with business intelligence", () => {
    const appointment = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      title: "Massage Therapy Session",
      startTime: "2024-01-20T14:00:00Z",
      endTime: "2024-01-20T15:00:00Z",
      location: "Wellness Center Room 2",
      attendees: [
        { email: "client@example.com", name: "Jane Smith" },
      ],
      eventType: "session",
      businessCategory: "massage",
      description: "60-minute deep tissue massage",
      clientContext: {
        clientId: "550e8400-e29b-41d4-a716-446655440001",
        clientName: "Jane Smith",
        sessionNumber: 12,
        lastSessionDate: "2024-01-10T14:00:00Z",
        totalSessions: 11,
        notes: "Prefers extra focus on shoulders",
        preparationNeeded: ["Heat therapy room", "Lavender oil"],
        estimatedRevenue: 120,
      },
      businessInsights: {
        isHighValue: true,
        isRepeatClient: true,
        requiresPreparation: true,
        suggestedActions: ["Send reminder 24h before", "Prepare therapy room"],
      },
    };

    const result = AppointmentSchema.safeParse(appointment);
    expect(result.success).toBe(true);
  });

  it("validates minimal appointment", () => {
    const appointment = {
      id: "550e8400-e29b-41d4-a716-446655440002",
      title: "Consultation",
      startTime: "2024-01-22T10:00:00Z",
      endTime: "2024-01-22T10:30:00Z",
    };

    const result = AppointmentSchema.safeParse(appointment);
    expect(result.success).toBe(true);
  });
});

describe("WeeklyStatsSchema", () => {
  it("validates complete weekly statistics", () => {
    const stats = {
      totalAppointments: 25,
      totalRevenue: 3000,
      totalHours: 30,
      busiestDay: "Wednesday",
      clientRetention: 0.85,
      newClients: 3,
      averageSessionValue: 120,
      avgSessionLength: 1.2,
      utilizationRate: 0.75,
    };

    const result = WeeklyStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
  });

  it("validates weekly statistics with zero values", () => {
    const stats = {
      totalAppointments: 0,
      totalRevenue: 0,
      totalHours: 0,
      busiestDay: "N/A",
      clientRetention: 0,
      newClients: 0,
      averageSessionValue: 0,
      avgSessionLength: 0,
      utilizationRate: 0,
    };

    const result = WeeklyStatsSchema.safeParse(stats);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const stats = {
      totalAppointments: 10,
      totalRevenue: 1000,
      // Missing other required fields
    };

    const result = WeeklyStatsSchema.safeParse(stats);
    expect(result.success).toBe(false);
  });
});
