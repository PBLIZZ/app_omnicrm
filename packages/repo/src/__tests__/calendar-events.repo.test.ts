import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { CalendarEventsRepository } from "../calendar-events.repo";
import * as clientModule from "@/server/db/client";
import { ok, err } from "@/lib/utils/result";

// Mock the database client
vi.mock("@/server/db/client");

describe("CalendarEventsRepository", () => {
  const mockUserId = "test-user-id";
  const mockEventId = "test-event-id";
  const mockDb = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(clientModule.getDb).mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("listCalendarEvents", () => {
    it("should list calendar events for a user without filters", async () => {
      const mockEvents = [
        {
          id: "event-1",
          userId: mockUserId,
          googleEventId: "google-event-1",
          title: "Team Meeting",
          description: "Weekly sync",
          startTime: new Date("2024-01-15T10:00:00Z"),
          endTime: new Date("2024-01-15T11:00:00Z"),
          attendees: ["user1@example.com", "user2@example.com"],
          location: "Conference Room A",
          status: "confirmed",
          timeZone: "America/New_York",
          isAllDay: false,
          visibility: "public",
          eventType: "meeting",
          businessCategory: "client_session",
          keywords: ["team", "sync"],
          googleUpdated: new Date("2024-01-14T12:00:00Z"),
          lastSynced: new Date("2024-01-14T13:00:00Z"),
          createdAt: new Date("2024-01-01T00:00:00Z"),
          updatedAt: new Date("2024-01-14T13:00:00Z"),
        },
      ];

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].title).toBe("Team Meeting");
      }
    });

    it("should filter calendar events by date range", async () => {
      const fromDate = new Date("2024-01-01T00:00:00Z");
      const toDate = new Date("2024-01-31T23:59:59Z");

      const mockEvents = [
        {
          id: "event-1",
          userId: mockUserId,
          googleEventId: "google-event-1",
          title: "January Event",
          description: null,
          startTime: new Date("2024-01-15T10:00:00Z"),
          endTime: new Date("2024-01-15T11:00:00Z"),
          attendees: [],
          location: null,
          status: "confirmed",
          timeZone: "UTC",
          isAllDay: false,
          visibility: "public",
          eventType: null,
          businessCategory: null,
          keywords: [],
          googleUpdated: new Date(),
          lastSynced: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId, {
        fromDate,
        toDate,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(mockQuery.where).toHaveBeenCalled();
      }
    });

    it("should filter calendar events by event type", async () => {
      const mockEvents = [
        {
          id: "event-1",
          userId: mockUserId,
          googleEventId: "google-event-1",
          title: "Client Session",
          description: null,
          startTime: new Date("2024-01-15T10:00:00Z"),
          endTime: new Date("2024-01-15T11:00:00Z"),
          attendees: [],
          location: null,
          status: "confirmed",
          timeZone: "UTC",
          isAllDay: false,
          visibility: "public",
          eventType: "appointment",
          businessCategory: "client_session",
          keywords: [],
          googleUpdated: new Date(),
          lastSynced: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId, {
        eventType: "appointment",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].eventType).toBe("appointment");
      }
    });

    it("should return error when database query fails", async () => {
      const mockError = new Error("Database connection failed");
      mockDb.select.mockImplementation(() => {
        throw mockError;
      });

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
        expect(result.error.message).toContain("Failed to list calendar events");
      }
    });

    it("should return empty array when no events found", async () => {
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should filter by multiple criteria simultaneously", async () => {
      const fromDate = new Date("2024-01-01T00:00:00Z");
      const toDate = new Date("2024-01-31T23:59:59Z");

      const mockEvents = [
        {
          id: "event-1",
          userId: mockUserId,
          googleEventId: "google-event-1",
          title: "Client Consultation",
          description: null,
          startTime: new Date("2024-01-15T10:00:00Z"),
          endTime: new Date("2024-01-15T11:00:00Z"),
          attendees: [],
          location: null,
          status: "confirmed",
          timeZone: "UTC",
          isAllDay: false,
          visibility: "public",
          eventType: "appointment",
          businessCategory: "client_session",
          keywords: [],
          googleUpdated: new Date(),
          lastSynced: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue(mockEvents),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId, {
        fromDate,
        toDate,
        eventType: "appointment",
        businessCategory: "client_session",
        status: "confirmed",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].businessCategory).toBe("client_session");
        expect(result.data[0].eventType).toBe("appointment");
      }
    });
  });

  describe("getCalendarEventById", () => {
    it("should return a single calendar event by ID", async () => {
      const mockEvent = {
        id: mockEventId,
        userId: mockUserId,
        googleEventId: "google-event-1",
        title: "Important Meeting",
        description: "Quarterly review",
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T11:00:00Z"),
        attendees: ["user@example.com"],
        location: "Office",
        status: "confirmed",
        timeZone: "America/New_York",
        isAllDay: false,
        visibility: "public",
        eventType: "meeting",
        businessCategory: "internal",
        keywords: ["quarterly", "review"],
        googleUpdated: new Date(),
        lastSynced: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockEvent]),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.getCalendarEventById(
        mockUserId,
        mockEventId,
      );

      expect(result).toEqual(mockEvent);
    });

    it("should return null when event not found", async () => {
      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.getCalendarEventById(
        mockUserId,
        "non-existent-id",
      );

      expect(result).toBeNull();
    });

    it("should handle database errors gracefully", async () => {
      const mockError = new Error("Database connection timeout");
      mockDb.select.mockImplementation(() => {
        throw mockError;
      });

      await expect(
        CalendarEventsRepository.getCalendarEventById(mockUserId, mockEventId),
      ).rejects.toThrow("Database connection timeout");
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle events with minimal data", async () => {
      const minimalEvent = {
        id: "event-1",
        userId: mockUserId,
        googleEventId: null,
        title: "Minimal Event",
        description: null,
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T10:30:00Z"),
        attendees: [],
        location: null,
        status: "tentative",
        timeZone: "UTC",
        isAllDay: false,
        visibility: "private",
        eventType: null,
        businessCategory: null,
        keywords: [],
        googleUpdated: null,
        lastSynced: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([minimalEvent]),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].attendees).toEqual([]);
      }
    });

    it("should handle all-day events correctly", async () => {
      const allDayEvent = {
        id: "event-1",
        userId: mockUserId,
        googleEventId: "google-event-1",
        title: "Birthday",
        description: null,
        startTime: new Date("2024-01-15T00:00:00Z"),
        endTime: new Date("2024-01-15T23:59:59Z"),
        attendees: [],
        location: null,
        status: "confirmed",
        timeZone: "UTC",
        isAllDay: true,
        visibility: "public",
        eventType: "personal",
        businessCategory: null,
        keywords: [],
        googleUpdated: new Date(),
        lastSynced: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([allDayEvent]),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].isAllDay).toBe(true);
      }
    });

    it("should handle events with many attendees", async () => {
      const attendees = Array.from({ length: 50 }, (_, i) => `user${i}@example.com`);

      const eventWithManyAttendees = {
        id: "event-1",
        userId: mockUserId,
        googleEventId: "google-event-1",
        title: "Company All-Hands",
        description: "Monthly meeting",
        startTime: new Date("2024-01-15T10:00:00Z"),
        endTime: new Date("2024-01-15T11:00:00Z"),
        attendees,
        location: "Auditorium",
        status: "confirmed",
        timeZone: "UTC",
        isAllDay: false,
        visibility: "public",
        eventType: "meeting",
        businessCategory: "internal",
        keywords: ["all-hands", "monthly"],
        googleUpdated: new Date(),
        lastSynced: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockQuery = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockResolvedValue([eventWithManyAttendees]),
      };

      mockDb.select.mockReturnValue(mockQuery);

      const result = await CalendarEventsRepository.listCalendarEvents(mockUserId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data[0].attendees).toHaveLength(50);
      }
    });
  });
});