/**
 * Unit tests for CalendarEventsRepository
 * Tests calendar event CRUD operations, filtering, and date range queries
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CalendarEventsRepository } from "../calendar-events.repo";
import type { CalendarEvent, CreateCalendarEvent } from "@/server/db/schema";
import * as dbClient from "@/server/db/client";

// Mock the database client
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("CalendarEventsRepository", () => {
  const mockUserId = "test-user-123";
  const mockEventId = "event-123";
  const mockGoogleEventId = "google-event-123";

  const mockCalendarEvent: CalendarEvent = {
    id: mockEventId,
    userId: mockUserId,
    googleEventId: mockGoogleEventId,
    title: "Team Meeting",
    description: "Weekly team sync",
    startTime: new Date("2025-01-15T10:00:00Z"),
    endTime: new Date("2025-01-15T11:00:00Z"),
    attendees: ["attendee1@example.com", "attendee2@example.com"],
    location: "Conference Room A",
    status: "confirmed",
    timeZone: "America/New_York",
    isAllDay: false,
    visibility: "public",
    eventType: "meeting",
    businessCategory: "client_session",
    keywords: ["team", "sync", "weekly"],
    googleUpdated: new Date("2025-01-14T12:00:00Z"),
    lastSynced: new Date("2025-01-14T12:05:00Z"),
    createdAt: new Date("2025-01-10T10:00:00Z"),
    updatedAt: new Date("2025-01-14T12:05:00Z"),
  };

  const createMockDb = () => {
    const mockSelect = vi.fn().mockReturnThis();
    const mockFrom = vi.fn().mockReturnThis();
    const mockWhere = vi.fn().mockReturnThis();
    const mockOrderBy = vi.fn().mockReturnThis();
    const mockLimit = vi.fn().mockReturnThis();
    const mockInsert = vi.fn().mockReturnThis();
    const mockValues = vi.fn().mockReturnThis();
    const mockReturning = vi.fn();
    const mockUpdate = vi.fn().mockReturnThis();
    const mockSet = vi.fn().mockReturnThis();
    const mockDelete = vi.fn();

    return {
      select: mockSelect,
      from: mockFrom,
      where: mockWhere,
      orderBy: mockOrderBy,
      limit: mockLimit,
      insert: mockInsert,
      values: mockValues,
      returning: mockReturning,
      update: mockUpdate,
      set: mockSet,
      delete: mockDelete,
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listCalendarEvents", () => {
    it("should list all calendar events for a user", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockCalendarEvent]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0]).toEqual(mockCalendarEvent);
      }
    });

    it("should filter events by date range", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockCalendarEvent]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const fromDate = new Date("2025-01-01");
      const toDate = new Date("2025-01-31");

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId, {
        fromDate,
        toDate,
      });

      expect(result.success).toBe(true);
      expect(mockDb.select).toHaveBeenCalled();
    });

    it("should filter events by event type", async () => {
      const mockDb = createMockDb();
      mockDb.orderBy.mockResolvedValue([mockCalendarEvent]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId, {
        eventType: "meeting",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0]?.eventType).toBe("meeting");
      }
    });

    it("should handle database errors", async () => {
      vi.mocked(dbClient.getDb).mockRejectedValue(new Error("Database connection failed"));

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
        expect(result.error.message).toContain("Database connection failed");
      }
    });
  });

  describe("createCalendarEvent", () => {
    const createEventData: CreateCalendarEvent = {
      googleEventId: "new-google-event-123",
      title: "New Meeting",
      description: "New meeting description",
      startTime: new Date("2025-02-01T14:00:00Z"),
      endTime: new Date("2025-02-01T15:00:00Z"),
    };

    it("should create a new calendar event", async () => {
      const newEvent = { ...mockCalendarEvent, ...createEventData, id: "new-event-123" };
      const mockDb = createMockDb();
      mockDb.returning.mockResolvedValue([newEvent]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await CalendarEventsRepository.createCalendarEvent(
        mockUserId,
        createEventData,
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(createEventData.title);
        expect(result.data.userId).toBe(mockUserId);
      }
    });

    it("should handle database errors during creation", async () => {
      vi.mocked(dbClient.getDb).mockRejectedValue(new Error("Insert failed"));

      const result = await CalendarEventsRepository.createCalendarEvent(
        mockUserId,
        createEventData,
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
        expect(result.error.message).toContain("Insert failed");
      }
    });
  });
});