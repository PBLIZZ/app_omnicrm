/**
 * Calendar Tools Tests
 *
 * Comprehensive tests for calendar event management tools.
 * Tests tool handlers, parameter validation, permission checks, and repository integration.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getUpcomingSessionsHandler,
  getEventHandler,
  createEventHandler,
  updateEventHandler,
  deleteEventHandler,
} from "../calendar";
import type { ToolExecutionContext } from "../../types";
import { AppError } from "@/lib/errors/app-error";

// Mock dependencies
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

vi.mock("@repo/calendar.repo", () => ({
  createCalendarRepository: vi.fn(),
}));

import { getDb } from "@/server/db/client";
import { createCalendarRepository } from "@repo";

const mockDb = {} as never;
const mockContext: ToolExecutionContext = {
  userId: "test-user-id",
  timestamp: new Date("2025-01-15T10:00:00Z"),
  requestId: "test-request-id",
};

describe("Calendar Tools", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDb).mockResolvedValue(mockDb);
  });

  // ============================================================================
  // get_upcoming_sessions Tests
  // ============================================================================

  describe("get_upcoming_sessions", () => {
    it("should get upcoming sessions with default days_ahead", async () => {
      const mockEvents = [
        {
          id: "event-1",
          userId: "test-user-id",
          contactId: "contact-1",
          type: "calendar_event",
          subject: "Yoga Session",
          occurredAt: new Date("2025-01-16T14:00:00Z"),
          sourceMeta: {
            startTime: "2025-01-16T14:00:00Z",
            endTime: "2025-01-16T15:00:00Z",
            eventType: "yoga",
          },
        },
      ];

      const mockRepo = {
        getUpcomingSessions: vi.fn().mockResolvedValue(mockEvents),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await getUpcomingSessionsHandler({}, mockContext);

      expect(mockRepo.getUpcomingSessions).toHaveBeenCalledWith(
        "test-user-id",
        7, // default
        undefined,
        undefined,
      );
      expect(result).toEqual(mockEvents);
    });

    it("should filter by contact_id and event_type", async () => {
      const mockEvents = [
        {
          id: "123e4567-e89b-12d3-a456-426614174022",
          userId: "test-user-id",
          contactId: "123e4567-e89b-12d3-a456-426614174023",
          type: "calendar_event",
          subject: "Yoga Session",
          occurredAt: new Date("2025-01-16T14:00:00Z"),
          sourceMeta: {
            startTime: "2025-01-16T14:00:00Z",
            endTime: "2025-01-16T15:00:00Z",
            eventType: "yoga",
          },
        },
      ];

      const mockRepo = {
        getUpcomingSessions: vi.fn().mockResolvedValue(mockEvents),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await getUpcomingSessionsHandler(
        {
          days_ahead: 3,
          contact_id: "123e4567-e89b-12d3-a456-426614174023",
          event_type: "yoga",
        },
        mockContext,
      );

      expect(mockRepo.getUpcomingSessions).toHaveBeenCalledWith(
        "test-user-id",
        3,
        "123e4567-e89b-12d3-a456-426614174023",
        "yoga",
      );
      expect(result).toEqual(mockEvents);
    });

    it("should validate days_ahead max value", async () => {
      await expect(getUpcomingSessionsHandler({ days_ahead: 400 }, mockContext)).rejects.toThrow();
    });

    it("should return empty array when no upcoming events", async () => {
      const mockRepo = {
        getUpcomingSessions: vi.fn().mockResolvedValue([]),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await getUpcomingSessionsHandler({}, mockContext);

      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // get_event Tests
  // ============================================================================

  describe("get_event", () => {
    it("should get event by ID", async () => {
      const mockEvent = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        userId: "test-user-id",
        contactId: "123e4567-e89b-12d3-a456-426614174021",
        type: "calendar_event",
        subject: "Yoga Session",
        occurredAt: new Date("2025-01-16T14:00:00Z"),
        sourceMeta: {
          startTime: "2025-01-16T14:00:00Z",
          endTime: "2025-01-16T15:00:00Z",
          location: "Studio A",
          eventType: "yoga",
        },
      };

      const mockRepo = {
        getEventById: vi.fn().mockResolvedValue(mockEvent),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await getEventHandler(
        { event_id: "123e4567-e89b-12d3-a456-426614174000" },
        mockContext,
      );

      expect(mockRepo.getEventById).toHaveBeenCalledWith(
        "test-user-id",
        "123e4567-e89b-12d3-a456-426614174000",
      );
      expect(result).toEqual(mockEvent);
    });

    it("should throw EVENT_NOT_FOUND when event does not exist", async () => {
      const mockRepo = {
        getEventById: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      await expect(
        getEventHandler({ event_id: "123e4567-e89b-12d3-a456-426614174099" }, mockContext),
      ).rejects.toThrow(AppError);

      try {
        await getEventHandler({ event_id: "123e4567-e89b-12d3-a456-426614174099" }, mockContext);
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe("EVENT_NOT_FOUND");
      }
    });

    it("should validate event_id is a UUID", async () => {
      await expect(getEventHandler({ event_id: "invalid-uuid" }, mockContext)).rejects.toThrow();
    });
  });

  // ============================================================================
  // create_event Tests
  // ============================================================================

  describe("create_event", () => {
    it("should create event with all parameters", async () => {
      const mockEvent = {
        id: "123e4567-e89b-12d3-a456-426614174010",
        userId: "test-user-id",
        contactId: "123e4567-e89b-12d3-a456-426614174011",
        type: "calendar_event",
        subject: "Yoga Session",
        bodyText: "Initial consultation",
        occurredAt: new Date("2025-01-20T14:00:00Z"),
        sourceMeta: {
          startTime: "2025-01-20T14:00:00Z",
          endTime: "2025-01-20T15:00:00Z",
          location: "Studio A",
          description: "Initial consultation",
          eventType: "yoga",
          attendees: ["client@example.com"],
        },
      };

      const mockRepo = {
        createEvent: vi.fn().mockResolvedValue(mockEvent),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await createEventHandler(
        {
          title: "Yoga Session",
          start_time: "2025-01-20T14:00:00Z",
          end_time: "2025-01-20T15:00:00Z",
          contact_id: "123e4567-e89b-12d3-a456-426614174011",
          location: "Studio A",
          description: "Initial consultation",
          event_type: "yoga",
          attendees: ["client@example.com"],
        },
        mockContext,
      );

      expect(mockRepo.createEvent).toHaveBeenCalledWith("test-user-id", {
        contactId: "123e4567-e89b-12d3-a456-426614174011",
        title: "Yoga Session",
        startTime: new Date("2025-01-20T14:00:00Z"),
        endTime: new Date("2025-01-20T15:00:00Z"),
        location: "Studio A",
        description: "Initial consultation",
        eventType: "yoga",
        attendees: ["client@example.com"],
      });
      expect(result).toEqual(mockEvent);
    });

    it("should create event with only required parameters", async () => {
      const mockEvent = {
        id: "123e4567-e89b-12d3-a456-426614174012",
        userId: "test-user-id",
        contactId: "123e4567-e89b-12d3-a456-426614174013",
        type: "calendar_event",
        subject: "Team Meeting",
        occurredAt: new Date("2025-01-20T14:00:00Z"),
        sourceMeta: {
          startTime: "2025-01-20T14:00:00Z",
          endTime: "2025-01-20T15:00:00Z",
        },
      };

      const mockRepo = {
        createEvent: vi.fn().mockResolvedValue(mockEvent),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await createEventHandler(
        {
          title: "Team Meeting",
          start_time: "2025-01-20T14:00:00Z",
          end_time: "2025-01-20T15:00:00Z",
          contact_id: "123e4567-e89b-12d3-a456-426614174013",
        },
        mockContext,
      );

      expect(result).toEqual(mockEvent);
    });

    it("should reject when end_time is before start_time", async () => {
      await expect(
        createEventHandler(
          {
            title: "Invalid Event",
            contact_id: "123e4567-e89b-12d3-a456-426614174014",
            start_time: "2025-01-20T15:00:00Z",
            end_time: "2025-01-20T14:00:00Z", // Before start time
          },
          mockContext,
        ),
      ).rejects.toThrow(AppError);

      await expect(
        createEventHandler(
          {
            title: "Invalid Event",
            contact_id: "123e4567-e89b-12d3-a456-426614174014",
            start_time: "2025-01-20T15:00:00Z",
            end_time: "2025-01-20T14:00:00Z",
          },
          mockContext,
        ),
      ).rejects.toThrow("Event end time must be after start time");
    });

    it("should reject when end_time equals start_time", async () => {
      await expect(
        createEventHandler(
          {
            title: "Invalid Event",
            contact_id: "123e4567-e89b-12d3-a456-426614174015",
            start_time: "2025-01-20T14:00:00Z",
            end_time: "2025-01-20T14:00:00Z", // Same time
          },
          mockContext,
        ),
      ).rejects.toThrow(AppError);
    });

    it("should reject invalid date format", async () => {
      await expect(
        createEventHandler(
          {
            title: "Invalid Event",
            contact_id: "123e4567-e89b-12d3-a456-426614174016",
            start_time: "invalid-date",
            end_time: "2025-01-20T15:00:00Z",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it("should validate title length", async () => {
      const longTitle = "a".repeat(501);
      await expect(
        createEventHandler(
          {
            title: longTitle,
            contact_id: "123e4567-e89b-12d3-a456-426614174017",
            start_time: "2025-01-20T14:00:00Z",
            end_time: "2025-01-20T15:00:00Z",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it("should validate attendee email format", async () => {
      await expect(
        createEventHandler(
          {
            title: "Event",
            contact_id: "123e4567-e89b-12d3-a456-426614174018",
            start_time: "2025-01-20T14:00:00Z",
            end_time: "2025-01-20T15:00:00Z",
            attendees: ["invalid-email"],
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // update_event Tests
  // ============================================================================

  describe("update_event", () => {
    it("should update event title", async () => {
      const mockUpdatedEvent = {
        id: "123e4567-e89b-12d3-a456-426614174001",
        userId: "test-user-id",
        type: "calendar_event",
        subject: "Updated Title",
        occurredAt: new Date("2025-01-20T14:00:00Z"),
        sourceMeta: {
          startTime: "2025-01-20T14:00:00Z",
          endTime: "2025-01-20T15:00:00Z",
        },
      };

      const mockRepo = {
        updateEvent: vi.fn().mockResolvedValue(mockUpdatedEvent),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await updateEventHandler(
        {
          event_id: "123e4567-e89b-12d3-a456-426614174001",
          title: "Updated Title",
        },
        mockContext,
      );

      expect(mockRepo.updateEvent).toHaveBeenCalledWith(
        "test-user-id",
        "123e4567-e89b-12d3-a456-426614174001",
        {
          title: "Updated Title",
        },
      );
      expect(result).toEqual(mockUpdatedEvent);
    });

    it("should update event times", async () => {
      const mockUpdatedEvent = {
        id: "123e4567-e89b-12d3-a456-426614174002",
        userId: "test-user-id",
        type: "calendar_event",
        subject: "Event",
        occurredAt: new Date("2025-01-20T16:00:00Z"),
        sourceMeta: {
          startTime: "2025-01-20T16:00:00Z",
          endTime: "2025-01-20T17:00:00Z",
        },
      };

      const mockRepo = {
        updateEvent: vi.fn().mockResolvedValue(mockUpdatedEvent),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await updateEventHandler(
        {
          event_id: "123e4567-e89b-12d3-a456-426614174002",
          start_time: "2025-01-20T16:00:00Z",
          end_time: "2025-01-20T17:00:00Z",
        },
        mockContext,
      );

      expect(mockRepo.updateEvent).toHaveBeenCalledWith(
        "test-user-id",
        "123e4567-e89b-12d3-a456-426614174002",
        {
          startTime: new Date("2025-01-20T16:00:00Z"),
          endTime: new Date("2025-01-20T17:00:00Z"),
        },
      );
      expect(result).toEqual(mockUpdatedEvent);
    });

    it("should update multiple fields at once", async () => {
      const mockUpdatedEvent = {
        id: "123e4567-e89b-12d3-a456-426614174003",
        userId: "test-user-id",
        type: "calendar_event",
        subject: "Updated Event",
        bodyText: "New description",
        occurredAt: new Date("2025-01-20T16:00:00Z"),
        sourceMeta: {
          startTime: "2025-01-20T16:00:00Z",
          endTime: "2025-01-20T17:00:00Z",
          location: "Studio B",
          description: "New description",
        },
      };

      const mockRepo = {
        updateEvent: vi.fn().mockResolvedValue(mockUpdatedEvent),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await updateEventHandler(
        {
          event_id: "123e4567-e89b-12d3-a456-426614174003",
          title: "Updated Event",
          start_time: "2025-01-20T16:00:00Z",
          end_time: "2025-01-20T17:00:00Z",
          location: "Studio B",
          description: "New description",
        },
        mockContext,
      );

      expect(result).toEqual(mockUpdatedEvent);
    });

    it("should throw EVENT_NOT_FOUND when event does not exist", async () => {
      const mockRepo = {
        updateEvent: vi.fn().mockResolvedValue(null),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      await expect(
        updateEventHandler(
          {
            event_id: "123e4567-e89b-12d3-a456-426614174098",
            title: "New Title",
          },
          mockContext,
        ),
      ).rejects.toThrow(AppError);

      try {
        await updateEventHandler(
          {
            event_id: "123e4567-e89b-12d3-a456-426614174098",
            title: "New Title",
          },
          mockContext,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe("EVENT_NOT_FOUND");
      }
    });

    it("should reject invalid date format", async () => {
      await expect(
        updateEventHandler(
          {
            event_id: "123e4567-e89b-12d3-a456-426614174020",
            start_time: "invalid-date",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it("should validate event_id is a UUID", async () => {
      await expect(
        updateEventHandler(
          {
            event_id: "invalid-uuid",
            title: "New Title",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });
  });

  // ============================================================================
  // delete_event Tests
  // ============================================================================

  describe("delete_event", () => {
    it("should delete event successfully", async () => {
      const mockRepo = {
        deleteEvent: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await deleteEventHandler(
        {
          event_id: "123e4567-e89b-12d3-a456-426614174004",
        },
        mockContext,
      );

      expect(mockRepo.deleteEvent).toHaveBeenCalledWith(
        "test-user-id",
        "123e4567-e89b-12d3-a456-426614174004",
      );
      expect(result).toEqual({
        success: true,
        event_id: "123e4567-e89b-12d3-a456-426614174004",
        message: "Calendar event deleted successfully",
        reason: undefined,
      });
    });

    it("should delete event with reason", async () => {
      const mockRepo = {
        deleteEvent: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      const result = await deleteEventHandler(
        {
          event_id: "123e4567-e89b-12d3-a456-426614174005",
          reason: "Client requested cancellation",
        },
        mockContext,
      );

      expect(result).toEqual({
        success: true,
        event_id: "123e4567-e89b-12d3-a456-426614174005",
        message: "Calendar event deleted successfully",
        reason: "Client requested cancellation",
      });
    });

    it("should throw EVENT_NOT_FOUND when event does not exist", async () => {
      const mockRepo = {
        deleteEvent: vi.fn().mockResolvedValue(false),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      await expect(
        deleteEventHandler(
          {
            event_id: "123e4567-e89b-12d3-a456-426614174097",
          },
          mockContext,
        ),
      ).rejects.toThrow(AppError);

      try {
        await deleteEventHandler(
          {
            event_id: "123e4567-e89b-12d3-a456-426614174097",
          },
          mockContext,
        );
      } catch (error) {
        expect(error).toBeInstanceOf(AppError);
        expect((error as AppError).code).toBe("EVENT_NOT_FOUND");
      }
    });

    it("should validate event_id is a UUID", async () => {
      await expect(
        deleteEventHandler(
          {
            event_id: "invalid-uuid",
          },
          mockContext,
        ),
      ).rejects.toThrow();
    });

    it("should be idempotent - calling twice should not cause errors", async () => {
      const mockRepo = {
        deleteEvent: vi.fn().mockResolvedValueOnce(true).mockResolvedValueOnce(false),
      };
      vi.mocked(createCalendarRepository).mockReturnValue(mockRepo as never);

      // First call succeeds
      const result1 = await deleteEventHandler(
        {
          event_id: "123e4567-e89b-12d3-a456-426614174006",
        },
        mockContext,
      );
      expect(result1.success).toBe(true);

      // Second call should throw not found
      await expect(
        deleteEventHandler(
          {
            event_id: "123e4567-e89b-12d3-a456-426614174006",
          },
          mockContext,
        ),
      ).rejects.toThrow(AppError);
    });
  });
});
