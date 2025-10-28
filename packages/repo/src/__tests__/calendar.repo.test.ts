/**
 * Calendar Repository Tests
 *
 * Comprehensive tests for CalendarRepository.
 * Tests CRUD operations, date range queries, availability checks, and session prep.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { CalendarRepository, createCalendarRepository } from "../calendar.repo";
import { createMockDbClient, type MockDbClient } from "@packages/testing";
import type { CalendarEvent, CalendarEventMeta } from "../calendar.repo";

describe("CalendarRepository", () => {
  let mockDb: MockDbClient;
  let repo: CalendarRepository;
  const mockUserId = "user-123";
  const mockEventId = "event-456";
  const mockContactId = "contact-789";

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = new CalendarRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("getUpcomingSessions", () => {
    it("should get upcoming sessions with default 7 days ahead", async () => {
      const now = new Date("2025-01-15T10:00:00Z");
      const mockEvents = [
        {
          id: mockEventId,
          userId: mockUserId,
          contactId: mockContactId,
          type: "calendar_event",
          subject: "Team Meeting",
          bodyText: "Weekly sync",
          occurredAt: new Date("2025-01-16T14:00:00Z"),
          source: "calendar",
          sourceId: "cal-123",
          sourceMeta: {
            startTime: "2025-01-16T14:00:00Z",
            endTime: "2025-01-16T15:00:00Z",
            location: "Conference Room A",
          },
          batchId: null,
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockEvents);

      vi.useFakeTimers();
      vi.setSystemTime(now);

      const result = await repo.getUpcomingSessions(mockUserId);

      expect(result).toEqual(mockEvents);
      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it("should filter by contactId when provided", async () => {
      const mockEvents: CalendarEvent[] = [];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockEvents);

      const result = await repo.getUpcomingSessions(mockUserId, 7, mockContactId);

      expect(result).toEqual(mockEvents);
      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should filter by eventType when provided", async () => {
      const mockEvents = [
        {
          id: "event-1",
          userId: mockUserId,
          contactId: mockContactId,
          type: "calendar_event",
          subject: "Consultation",
          bodyText: null,
          occurredAt: new Date("2025-01-16T14:00:00Z"),
          source: "calendar",
          sourceId: "cal-1",
          sourceMeta: {
            startTime: "2025-01-16T14:00:00Z",
            endTime: "2025-01-16T15:00:00Z",
            eventType: "consultation",
          } as CalendarEventMeta,
          batchId: null,
          createdAt: new Date(),
        },
        {
          id: "event-2",
          userId: mockUserId,
          contactId: mockContactId,
          type: "calendar_event",
          subject: "Follow-up",
          bodyText: null,
          occurredAt: new Date("2025-01-17T14:00:00Z"),
          source: "calendar",
          sourceId: "cal-2",
          sourceMeta: {
            startTime: "2025-01-17T14:00:00Z",
            endTime: "2025-01-17T15:00:00Z",
            eventType: "follow-up",
          } as CalendarEventMeta,
          batchId: null,
          createdAt: new Date(),
        },
      ];

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockEvents);

      const result = await repo.getUpcomingSessions(mockUserId, 7, undefined, "consultation");

      expect(result).toHaveLength(1);
      expect(result[0]?.subject).toBe("Consultation");
    });

    it("should use custom daysAhead parameter", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue([]);

      await repo.getUpcomingSessions(mockUserId, 14);

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("getEventById", () => {
    it("should return event when found", async () => {
      const mockEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Team Meeting",
        bodyText: "Weekly sync",
        occurredAt: new Date("2025-01-16T14:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-16T14:00:00Z",
          endTime: "2025-01-16T15:00:00Z",
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([mockEvent]);

      const result = await repo.getEventById(mockUserId, mockEventId);

      expect(result).toEqual(mockEvent);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalledWith(1);
    });

    it("should return null when event not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.getEventById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createEvent", () => {
    it("should create a new calendar event", async () => {
      const eventData = {
        contactId: mockContactId,
        title: "Client Meeting",
        startTime: new Date("2025-01-20T10:00:00Z"),
        endTime: new Date("2025-01-20T11:00:00Z"),
        location: "Office",
        description: "Quarterly review",
        eventType: "consultation",
        attendees: ["client@example.com"],
      };

      const mockCreatedEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: eventData.title,
        bodyText: eventData.description,
        occurredAt: eventData.startTime,
        source: "calendar",
        sourceId: expect.any(String),
        sourceMeta: {
          startTime: eventData.startTime.toISOString(),
          endTime: eventData.endTime.toISOString(),
          location: eventData.location,
          description: eventData.description,
          eventType: eventData.eventType,
          attendees: eventData.attendees,
        },
        batchId: null,
        createdAt: new Date(),
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockCreatedEvent]);

      const result = await repo.createEvent(mockUserId, eventData);

      expect(result).toEqual(mockCreatedEvent);
      expect(mockDb.insert).toHaveBeenCalled();
      expect(mockDb.values).toHaveBeenCalled();
    });

    it("should create event without optional fields", async () => {
      const eventData = {
        title: "Quick Meeting",
        startTime: new Date("2025-01-20T10:00:00Z"),
        endTime: new Date("2025-01-20T10:30:00Z"),
      };

      const mockCreatedEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: null,
        type: "calendar_event",
        subject: eventData.title,
        bodyText: null,
        occurredAt: eventData.startTime,
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: eventData.startTime.toISOString(),
          endTime: eventData.endTime.toISOString(),
        },
        batchId: null,
        createdAt: new Date(),
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([mockCreatedEvent]);

      const result = await repo.createEvent(mockUserId, eventData);

      expect(result.contactId).toBeNull();
      expect(result.subject).toBe(eventData.title);
    });

    it("should throw error when endTime is before startTime", async () => {
      const eventData = {
        title: "Invalid Event",
        startTime: new Date("2025-01-20T11:00:00Z"),
        endTime: new Date("2025-01-20T10:00:00Z"), // Before start time
      };

      await expect(repo.createEvent(mockUserId, eventData)).rejects.toThrow(
        "Event end time must be after start time"
      );
    });

    it("should throw error when endTime equals startTime", async () => {
      const sameTime = new Date("2025-01-20T10:00:00Z");
      const eventData = {
        title: "Invalid Event",
        startTime: sameTime,
        endTime: sameTime,
      };

      await expect(repo.createEvent(mockUserId, eventData)).rejects.toThrow(
        "Event end time must be after start time"
      );
    });

    it("should throw error when insert returns no data", async () => {
      const eventData = {
        title: "Test Event",
        startTime: new Date("2025-01-20T10:00:00Z"),
        endTime: new Date("2025-01-20T11:00:00Z"),
      };

      mockDb.insert.mockReturnThis();
      mockDb.values.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      await expect(repo.createEvent(mockUserId, eventData)).rejects.toThrow(
        "Insert returned no data"
      );
    });
  });

  describe("updateEvent", () => {
    it("should update event fields", async () => {
      const existingEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Old Title",
        bodyText: "Old description",
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
          location: "Office",
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      const updates = {
        title: "New Title",
        description: "New description",
        location: "Remote",
      };

      const updatedEvent = {
        ...existingEvent,
        subject: updates.title,
        bodyText: updates.description,
        sourceMeta: {
          ...existingEvent.sourceMeta,
          location: updates.location,
          description: updates.description,
        },
      };

      // Mock getEventById
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([existingEvent]);

      // Mock update
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([updatedEvent]);

      const result = await repo.updateEvent(mockUserId, mockEventId, updates);

      expect(result?.subject).toBe(updates.title);
      expect(mockDb.update).toHaveBeenCalled();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it("should return null when event not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.updateEvent(mockUserId, "non-existent", { title: "New" });

      expect(result).toBeNull();
    });

    it("should update startTime and endTime", async () => {
      const existingEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Meeting",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      const newStart = new Date("2025-01-20T14:00:00Z");
      const newEnd = new Date("2025-01-20T15:00:00Z");

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([existingEvent]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.returning.mockResolvedValue([
        {
          ...existingEvent,
          occurredAt: newStart,
          sourceMeta: {
            startTime: newStart.toISOString(),
            endTime: newEnd.toISOString(),
          },
        },
      ]);

      const result = await repo.updateEvent(mockUserId, mockEventId, {
        startTime: newStart,
        endTime: newEnd,
      });

      expect(result).not.toBeNull();
      expect(mockDb.set).toHaveBeenCalled();
    });

    it("should throw error when updated endTime is before startTime", async () => {
      const existingEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Meeting",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([existingEvent]);

      await expect(
        repo.updateEvent(mockUserId, mockEventId, {
          endTime: new Date("2025-01-20T09:00:00Z"), // Before existing start
        })
      ).rejects.toThrow("Event end time must be after start time");
    });

    it("should return existing event when no changes provided", async () => {
      const existingEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Meeting",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([existingEvent]);

      const result = await repo.updateEvent(mockUserId, mockEventId, {});

      expect(result).toEqual(existingEvent);
    });
  });

  describe("deleteEvent", () => {
    it("should delete event and return true", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([{ id: mockEventId }]);

      const result = await repo.deleteEvent(mockUserId, mockEventId);

      expect(result).toBe(true);
      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should return false when event not found", async () => {
      mockDb.delete.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([]);

      const result = await repo.deleteEvent(mockUserId, "non-existent");

      expect(result).toBe(false);
    });
  });

  describe("searchEvents", () => {
    it("should search events with date range", async () => {
      const startDate = new Date("2025-01-01T00:00:00Z");
      const endDate = new Date("2025-01-31T23:59:59Z");

      const mockEvents: CalendarEvent[] = [];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue(mockEvents);

      const result = await repo.searchEvents(mockUserId, { startDate, endDate });

      expect(result).toEqual(mockEvents);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.limit).toHaveBeenCalled();
    });

    it("should filter by contactId", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      await repo.searchEvents(mockUserId, { contactId: mockContactId });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it("should use custom limit", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      await repo.searchEvents(mockUserId, { limit: 50 });

      expect(mockDb.limit).toHaveBeenCalledWith(50);
    });

    it("should use default limit of 100", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      await repo.searchEvents(mockUserId, {});

      expect(mockDb.limit).toHaveBeenCalledWith(100);
    });
  });

  describe("getEventsInRange", () => {
    it("should get events in date range", async () => {
      const startDate = new Date("2025-01-15T00:00:00Z");
      const endDate = new Date("2025-01-20T23:59:59Z");

      const mockEvents: CalendarEvent[] = [];
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue(mockEvents);

      const result = await repo.getEventsInRange(mockUserId, startDate, endDate);

      expect(result).toEqual(mockEvents);
      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe("findAvailability", () => {
    it("should find available time slots", async () => {
      const startDate = new Date("2025-01-20T00:00:00Z");
      const endDate = new Date("2025-01-21T00:00:00Z");

      // No events = all slots available
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue([]);

      const result = await repo.findAvailability(mockUserId, {
        startDate,
        endDate,
        durationMinutes: 60,
      });

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty("startTime");
      expect(result[0]).toHaveProperty("endTime");
      expect(result[0]).toHaveProperty("durationMinutes");
    });

    it("should exclude busy slots", async () => {
      const startDate = new Date("2025-01-20T00:00:00Z");
      const endDate = new Date("2025-01-21T00:00:00Z");

      // Event from 10am-11am
      const busyEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Busy",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockResolvedValue([busyEvent]);

      const result = await repo.findAvailability(mockUserId, {
        startDate,
        endDate,
        durationMinutes: 60,
      });

      // Should have slots, but none should overlap with 10am-11am
      const conflictingSlot = result.find((slot) => {
        const slotStart = new Date(slot.startTime);
        const slotEnd = new Date(slot.endTime);
        return (
          (slotStart >= new Date("2025-01-20T10:00:00Z") &&
            slotStart < new Date("2025-01-20T11:00:00Z")) ||
          (slotEnd > new Date("2025-01-20T10:00:00Z") &&
            slotEnd <= new Date("2025-01-20T11:00:00Z"))
        );
      });

      expect(conflictingSlot).toBeUndefined();
    });
  });

  describe("addEventAttendee", () => {
    it("should add attendee to event", async () => {
      const existingEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Meeting",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
          attendees: ["existing@example.com"],
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      const newContactId = "contact-new";
      const newContact = {
        primaryEmail: "new@example.com",
        displayName: "New Attendee",
      };

      // Mock getEventById
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([existingEvent]);

      // Mock contact lookup
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([newContact]);

      // Mock update
      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([
        {
          ...existingEvent,
          sourceMeta: {
            ...existingEvent.sourceMeta,
            attendees: ["existing@example.com", "new@example.com"],
          },
        },
      ]);

      const result = await repo.addEventAttendee(mockUserId, mockEventId, newContactId);

      expect(result).not.toBeNull();
      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should not add duplicate attendee", async () => {
      const existingEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Meeting",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
          attendees: ["existing@example.com"],
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      const contact = {
        primaryEmail: "existing@example.com",
        displayName: "Existing Attendee",
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([existingEvent]);
      mockDb.limit.mockResolvedValueOnce([contact]);

      const result = await repo.addEventAttendee(mockUserId, mockEventId, mockContactId);

      expect(result).toEqual(existingEvent);
      expect(mockDb.update).not.toHaveBeenCalled();
    });

    it("should return null when event not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.addEventAttendee(mockUserId, "non-existent", mockContactId);

      expect(result).toBeNull();
    });
  });

  describe("removeEventAttendee", () => {
    it("should remove attendee from event", async () => {
      const existingEvent = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Meeting",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
          attendees: ["keep@example.com", "remove@example.com"],
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      const contact = {
        primaryEmail: "remove@example.com",
      };

      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([existingEvent]);
      mockDb.limit.mockResolvedValueOnce([contact]);

      mockDb.update.mockReturnThis();
      mockDb.set.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.returning.mockResolvedValue([
        {
          ...existingEvent,
          sourceMeta: {
            ...existingEvent.sourceMeta,
            attendees: ["keep@example.com"],
          },
        },
      ]);

      const result = await repo.removeEventAttendee(mockUserId, mockEventId, mockContactId);

      expect(result).not.toBeNull();
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe("getSessionPrep", () => {
    it("should get session preparation data", async () => {
      const event = {
        id: mockEventId,
        userId: mockUserId,
        contactId: mockContactId,
        type: "calendar_event",
        subject: "Meeting",
        bodyText: null,
        occurredAt: new Date("2025-01-20T10:00:00Z"),
        source: "calendar",
        sourceId: "cal-123",
        sourceMeta: {
          startTime: "2025-01-20T10:00:00Z",
          endTime: "2025-01-20T11:00:00Z",
        } as CalendarEventMeta,
        batchId: null,
        createdAt: new Date(),
      };

      const contact = {
        id: mockContactId,
        displayName: "John Doe",
        primaryEmail: "john@example.com",
        primaryPhone: "+1234567890",
        photoUrl: null,
        healthContext: {},
        preferences: {},
      };

      const notes = [
        { id: "note-1", contentPlain: "First note", createdAt: new Date() },
      ];

      const tasks = [
        {
          id: "task-1",
          name: "Follow up",
          priority: "high",
          dueDate: "2025-01-25",
        },
      ];

      const goals = [
        {
          id: "goal-1",
          name: "Complete program",
          status: "active",
          targetDate: "2025-06-01",
        },
      ];

      // Mock getEventById
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([event]);

      // Mock contact lookup
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce([contact]);

      // Mock notes lookup
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce(notes);

      // Mock tasks lookup
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValueOnce(tasks);

      // Mock goals lookup
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.orderBy.mockReturnThis();
      mockDb.limit.mockResolvedValue(goals);

      const result = await repo.getSessionPrep(mockUserId, mockEventId);

      expect(result).not.toBeNull();
      expect(result?.event).toEqual(event);
      expect(result?.contact).toEqual(contact);
      expect(result?.recentNotes).toEqual(notes);
      expect(result?.pendingTasks).toEqual(tasks);
      expect(result?.relatedGoals).toEqual(goals);
    });

    it("should return null when event not found", async () => {
      mockDb.select.mockReturnThis();
      mockDb.from.mockReturnThis();
      mockDb.where.mockReturnThis();
      mockDb.limit.mockResolvedValue([]);

      const result = await repo.getSessionPrep(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createCalendarRepository factory", () => {
    it("should create a CalendarRepository instance", () => {
      const repo = createCalendarRepository(mockDb as any);
      expect(repo).toBeInstanceOf(CalendarRepository);
    });
  });
});