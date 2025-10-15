/**
 * Tests for Interaction Business Schemas
 */

import { describe, it, expect } from "vitest";
import {
  InteractionSchema,
  CreateInteractionBodySchema,
  UpdateInteractionBodySchema,
  GetInteractionsQuerySchema,
  InteractionListResponseSchema,
  GmailSourceMetaSchema,
  CalendarSourceMetaSchema,
} from "../interactions";

describe("InteractionSchema", () => {
  it("validates a complete interaction", () => {
    const validInteraction = {
      id: "550e8400-e29b-41d4-a716-446655440000",
      contactId: "550e8400-e29b-41d4-a716-446655440001",
      userId: "550e8400-e29b-41d4-a716-446655440002",
      type: "email",
      subject: "Meeting follow-up",
      bodyText: "Thanks for the meeting today",
      occurredAt: new Date("2024-01-15T10:00:00Z"),
      source: "gmail",
      sourceId: "gmail-msg-123",
      sourceMeta: {
        messageId: "msg-123",
        threadId: "thread-456",
        from: "sender@example.com",
        to: ["recipient@example.com"],
      },
      batchId: "550e8400-e29b-41d4-a716-446655440003",
      createdAt: new Date("2024-01-15T10:01:00Z"),
    };

    const result = InteractionSchema.safeParse(validInteraction);
    expect(result.success).toBe(true);
  });

  it("validates interaction without optional fields", () => {
    const minimalInteraction = {
      id: "550e8400-e29b-41d4-a716-446655440004",
      contactId: "550e8400-e29b-41d4-a716-446655440005",
      userId: "550e8400-e29b-41d4-a716-446655440006",
      type: "email",
      subject: null,
      bodyText: null,
      occurredAt: new Date(),
      source: "gmail",
      sourceId: "gmail-msg-123",
      batchId: null,
      createdAt: new Date(),
    };

    const result = InteractionSchema.safeParse(minimalInteraction);
    expect(result.success).toBe(true);
  });

  it("validates Gmail source metadata", () => {
    const gmailMeta = {
      messageId: "msg-123",
      threadId: "thread-456",
      from: "sender@example.com",
      to: ["recipient@example.com"],
      cc: ["cc@example.com"],
      bcc: ["bcc@example.com"],
      subject: "Test Subject",
      labelIds: ["INBOX", "UNREAD"],
      fetchedAt: "2024-01-15T10:00:00Z",
      matchedQuery: "from:user@example.com",
    };

    const result = GmailSourceMetaSchema.safeParse(gmailMeta);
    expect(result.success).toBe(true);
  });

  it("validates Calendar source metadata", () => {
    const calendarMeta = {
      eventId: "event-123",
      summary: "Team Meeting",
      description: "Weekly sync",
      location: "Conference Room A",
      startTime: "2024-01-15T10:00:00Z",
      endTime: "2024-01-15T11:00:00Z",
      attendees: [
        { email: "user1@example.com", responseStatus: "accepted" },
        { email: "user2@example.com", responseStatus: "tentative" },
      ],
      organizer: { email: "organizer@example.com" },
      status: "confirmed",
      isAllDay: false,
      recurring: false,
      fetchedAt: "2024-01-15T09:00:00Z",
    };

    const result = CalendarSourceMetaSchema.safeParse(calendarMeta);
    expect(result.success).toBe(true);
  });
});

describe("CreateInteractionBodySchema", () => {
  it("validates valid create request", () => {
    const validRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      type: "email",
      subject: "Meeting follow-up",
      bodyText: "Thanks for the meeting",
      occurredAt: new Date("2024-01-15T10:00:00Z"),
      source: "gmail",
      sourceId: "gmail-msg-123",
      sourceMeta: {
        messageId: "msg-123",
        threadId: "thread-456",
        from: "sender@example.com",
        to: ["recipient@example.com"],
      },
      batchId: "550e8400-e29b-41d4-a716-446655440001",
    };

    const result = CreateInteractionBodySchema.safeParse(validRequest);
    expect(result.success).toBe(true);
  });

  it("validates minimal create request", () => {
    const minimalRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      type: "email",
      occurredAt: new Date(),
      source: "gmail",
      sourceId: "gmail-msg-123",
    };

    const result = CreateInteractionBodySchema.safeParse(minimalRequest);
    expect(result.success).toBe(true);
  });

  it("rejects missing required fields", () => {
    const invalidRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      type: "email",
      // Missing occurredAt, source, sourceId
    };

    const result = CreateInteractionBodySchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });

  it("rejects invalid UUID format", () => {
    const invalidRequest = {
      contactId: "not-a-uuid",
      type: "email",
      occurredAt: new Date(),
      source: "gmail",
      sourceId: "gmail-msg-123",
    };

    const result = CreateInteractionBodySchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it("rejects empty type", () => {
    const invalidRequest = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      type: "",
      occurredAt: new Date(),
      source: "gmail",
      sourceId: "gmail-msg-123",
    };

    const result = CreateInteractionBodySchema.safeParse(invalidRequest);
    expect(result.success).toBe(false);
  });

  it("coerces date strings to Date objects", () => {
    const request = {
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      type: "email",
      occurredAt: "2024-01-15T10:00:00Z",
      source: "gmail",
      sourceId: "gmail-msg-123",
    };

    const result = CreateInteractionBodySchema.safeParse(request);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occurredAt).toBeInstanceOf(Date);
    }
  });
});

describe("UpdateInteractionBodySchema", () => {
  it("validates single field update", () => {
    const validUpdate = {
      subject: "Updated subject",
    };

    const result = UpdateInteractionBodySchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("validates multiple field update", () => {
    const validUpdate = {
      type: "meeting",
      subject: "Updated subject",
      bodyText: "Updated body",
    };

    const result = UpdateInteractionBodySchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("allows null values for optional fields", () => {
    const validUpdate = {
      subject: null,
      bodyText: null,
    };

    const result = UpdateInteractionBodySchema.safeParse(validUpdate);
    expect(result.success).toBe(true);
  });

  it("rejects empty update (no fields)", () => {
    const invalidUpdate = {};

    const result = UpdateInteractionBodySchema.safeParse(invalidUpdate);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("At least one field must be provided");
    }
  });

  it("coerces date strings for occurredAt", () => {
    const update = {
      occurredAt: "2024-01-15T10:00:00Z",
    };

    const result = UpdateInteractionBodySchema.safeParse(update);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.occurredAt).toBeInstanceOf(Date);
    }
  });
});

describe("GetInteractionsQuerySchema", () => {
  it("validates query with default values", () => {
    const query = {};

    const result = GetInteractionsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.pageSize).toBe(20); // Interactions have max 100, default 20
      expect(result.data.sort).toBe("occurredAt");
    }
  });

  it("validates query with all filters", () => {
    const query = {
      page: "2",
      pageSize: "50",
      sort: "createdAt",
      contactId: "550e8400-e29b-41d4-a716-446655440000",
      type: ["email", "meeting"],
      source: ["gmail", "calendar"],
      search: "meeting notes",
    };

    const result = GetInteractionsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.pageSize).toBe(50);
      expect(result.data.type).toEqual(["email", "meeting"]);
    }
  });

  it("rejects pageSize over 100", () => {
    const query = {
      pageSize: "150",
    };

    const result = GetInteractionsQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it("rejects invalid sort value", () => {
    const query = {
      sort: "invalidSort",
    };

    const result = GetInteractionsQuerySchema.safeParse(query);
    expect(result.success).toBe(false);
  });

  it("coerces string numbers to integers", () => {
    const query = {
      page: "3",
      pageSize: "25",
    };

    const result = GetInteractionsQuerySchema.safeParse(query);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(3);
      expect(result.data.pageSize).toBe(25);
      expect(typeof result.data.page).toBe("number");
    }
  });
});

describe("InteractionListResponseSchema", () => {
  it("validates complete response", () => {
    const response = {
      items: [
        {
          id: "550e8400-e29b-41d4-a716-446655440007",
          contactId: "550e8400-e29b-41d4-a716-446655440008",
          userId: "550e8400-e29b-41d4-a716-446655440009",
          type: "email",
          subject: "Test",
          bodyText: "Body",
          occurredAt: new Date(),
          source: "gmail",
          sourceId: "msg-1",
          batchId: null,
          createdAt: new Date(),
        },
      ],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
    };

    const result = InteractionListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });

  it("validates empty response", () => {
    const response = {
      items: [],
      pagination: {
        page: 1,
        pageSize: 20,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };

    const result = InteractionListResponseSchema.safeParse(response);
    expect(result.success).toBe(true);
  });
});
