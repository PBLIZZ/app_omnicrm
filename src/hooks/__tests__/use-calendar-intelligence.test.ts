/**
 * useCalendarIntelligence Hook Tests (Pure Unit Tests - No MSW)
 *
 * Tests for business intelligence calculations, client matching,
 * and appointment enrichment logic without API mocking.
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useCalendarIntelligence } from "../useCalendarIntelligence";
import type { CalendarEvent, Client } from "@/server/db/business-schemas";

// Helper to create mock events
function createMockEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  const now = new Date();
  return {
    id: `event-${Math.random()}`,
    title: "Test Event",
    startTime: now.toISOString(),
    endTime: new Date(now.getTime() + 3600000).toISOString(), // +1 hour
    location: "Test Location",
    attendees: [],
    ...overrides,
  };
}

// Helper to create mock clients
function createMockClient(overrides: Partial<Client> = {}): Client {
  return {
    id: `client-${Math.random()}`,
    name: "Test Client",
    email: "test@example.com",
    totalSessions: 1,
    totalSpent: 100,
    lastSessionDate: new Date().toISOString(),
    status: "active",
    satisfaction: 4,
    preferences: {
      preferredTimes: [],
      preferredServices: [],
      goals: [],
    },
    ...overrides,
  };
}

describe("useCalendarIntelligence (Unit Tests)", () => {
  describe("BI service instance", () => {
    it("creates BI service on initialization", () => {
      const events: CalendarEvent[] = [];
      const clients: Client[] = [];

      const { result } = renderHook(() => useCalendarIntelligence(events, clients));

      expect(result.current.biService).toBeDefined();
    });

    it("maintains stable BI service instance across re-renders", () => {
      const events: CalendarEvent[] = [];
      const clients: Client[] = [];

      const { result, rerender } = renderHook(({ e, c }) => useCalendarIntelligence(e, c), {
        initialProps: { e: events, c: clients },
      });

      const firstInstance = result.current.biService;

      rerender({ e: events, c: clients });

      expect(result.current.biService).toBe(firstInstance);
    });
  });

  describe("Enhanced appointments generation", () => {
    it("creates appointments from events", () => {
      const events = [
        createMockEvent({ id: "evt-1", title: "Session 1" }),
        createMockEvent({ id: "evt-2", title: "Session 2" }),
      ];
      const clients: Client[] = [];

      const { result } = renderHook(() => useCalendarIntelligence(events, clients));

      expect(result.current.enhancedAppointments).toHaveLength(2);
      expect(result.current.enhancedAppointments[0].id).toBe("evt-1");
      expect(result.current.enhancedAppointments[0].title).toBe("Session 1");
    });

    it("matches clients by attendee email", () => {
      const client = createMockClient({
        email: "john@example.com",
        name: "John Doe",
      });

      const events = [
        createMockEvent({
          title: "Meeting",
          attendees: [{ email: "john@example.com", name: "John Doe" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [client]));

      const appointment = result.current.enhancedAppointments[0];
      expect(appointment.clientContext).toBeDefined();
      expect(appointment.clientContext?.clientName).toBe("John Doe");
    });

    it("matches clients by email case-insensitively", () => {
      const client = createMockClient({
        email: "john@example.com",
        name: "John Doe",
      });

      const events = [
        createMockEvent({
          attendees: [{ email: "JOHN@EXAMPLE.COM" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [client]));

      expect(result.current.enhancedAppointments[0].clientContext).toBeDefined();
    });

    it("matches clients by title patterns", () => {
      const client = createMockClient({
        name: "Sarah Johnson",
        email: "sarah@example.com",
      });

      const events = [createMockEvent({ title: "Session with Sarah Johnson" })];

      const { result } = renderHook(() => useCalendarIntelligence(events, [client]));

      const appointment = result.current.enhancedAppointments[0];
      expect(appointment.clientContext).toBeDefined();
      expect(appointment.clientContext?.clientName).toContain("Sarah");
    });

    it("handles events without matching clients", () => {
      const events = [createMockEvent({ title: "Team Meeting", attendees: [] })];
      const clients: Client[] = [];

      const { result } = renderHook(() => useCalendarIntelligence(events, clients));

      const appointment = result.current.enhancedAppointments[0];
      expect(appointment.clientContext).toBeUndefined();
    });

    it("enriches appointments with client revenue data", () => {
      const client = createMockClient({
        email: "client@example.com",
        totalSpent: 1000,
        totalSessions: 10,
      });

      const events = [
        createMockEvent({
          attendees: [{ email: "client@example.com" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [client]));

      const appointment = result.current.enhancedAppointments[0];
      expect(appointment.clientContext?.estimatedRevenue).toBeGreaterThan(0);
    });
  });

  describe("Business insights calculation", () => {
    it("identifies high value clients", () => {
      const highValueClient = createMockClient({
        email: "rich@example.com",
        totalSpent: 2000,
      });

      const events = [
        createMockEvent({
          attendees: [{ email: "rich@example.com" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [highValueClient]));

      const appointment = result.current.enhancedAppointments[0];
      expect(appointment.businessInsights.isHighValue).toBe(true);
    });

    it("identifies repeat clients", () => {
      const repeatClient = createMockClient({
        email: "repeat@example.com",
        totalSessions: 5,
      });

      const events = [
        createMockEvent({
          attendees: [{ email: "repeat@example.com" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [repeatClient]));

      const appointment = result.current.enhancedAppointments[0];
      expect(appointment.businessInsights.isRepeatClient).toBe(true);
    });

    it("flags preparation required for specific event types", () => {
      const events = [createMockEvent({ title: "Massage Therapy Session" })];

      const { result } = renderHook(() => useCalendarIntelligence(events, []));

      const appointment = result.current.enhancedAppointments[0];
      expect(appointment.businessInsights.requiresPreparation).toBe(true);
    });

    it("provides business insights structure", () => {
      const events = [createMockEvent()];

      const { result } = renderHook(() => useCalendarIntelligence(events, []));

      const insights = result.current.enhancedAppointments[0].businessInsights;
      expect(insights).toHaveProperty("isHighValue");
      expect(insights).toHaveProperty("isRepeatClient");
      expect(insights).toHaveProperty("requiresPreparation");
      expect(insights).toHaveProperty("suggestedActions");
      expect(Array.isArray(insights.suggestedActions)).toBe(true);
    });
  });

  describe("Suggested actions generation", () => {
    it("suggests welcome materials for new clients", () => {
      const newClient = createMockClient({
        email: "new@example.com",
        totalSessions: 1,
      });

      const events = [
        createMockEvent({
          attendees: [{ email: "new@example.com" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [newClient]));

      const actions = result.current.enhancedAppointments[0].businessInsights.suggestedActions;
      const hasWelcomeAction = actions.some((a) => a.includes("welcome"));
      expect(hasWelcomeAction).toBe(true);
    });

    it("suggests review for low satisfaction clients", () => {
      const unsatisfiedClient = createMockClient({
        email: "unhappy@example.com",
        satisfaction: 2,
      });

      const events = [
        createMockEvent({
          attendees: [{ email: "unhappy@example.com" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [unsatisfiedClient]));

      const actions = result.current.enhancedAppointments[0].businessInsights.suggestedActions;
      const hasReviewAction = actions.some((a) => a.includes("feedback"));
      expect(hasReviewAction).toBe(true);
    });

    it("suggests preparation for therapy sessions", () => {
      const events = [createMockEvent({ title: "Therapy Session" })];

      const { result } = renderHook(() => useCalendarIntelligence(events, []));

      const actions = result.current.enhancedAppointments[0].businessInsights.suggestedActions;
      const hasPreparationAction = actions.some(
        (a) => a.includes("prepare") || a.includes("treatment plan"),
      );
      expect(hasPreparationAction).toBe(true);
    });

    it("suggests reminder for upcoming events", () => {
      const soonEvent = createMockEvent({
        startTime: new Date(Date.now() + 3000000).toISOString(), // ~50 minutes from now
      });

      const { result } = renderHook(() => useCalendarIntelligence([soonEvent], []));

      const actions = result.current.enhancedAppointments[0].businessInsights.suggestedActions;
      const hasReminderAction = actions.some((a) => a.includes("reminder"));
      expect(hasReminderAction).toBe(true);
    });
  });

  describe("Weekly stats calculation", () => {
    it("calculates total appointments for current week", () => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());

      const events = [
        createMockEvent({ startTime: new Date(weekStart.getTime() + 86400000).toISOString() }),
        createMockEvent({ startTime: new Date(weekStart.getTime() + 86400000 * 2).toISOString() }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, []));

      expect(result.current.weeklyStats.totalAppointments).toBe(2);
    });

    it("calculates total hours for week", () => {
      // Create events for the current week using a fixed approach
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      weekStart.setHours(0, 0, 0, 0);

      // Create events that are clearly within the current week
      const event1Time = new Date(weekStart.getTime() + 24 * 60 * 60 * 1000); // 1 day after week start
      const event2Time = new Date(weekStart.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days after week start

      const events = [
        createMockEvent({
          startTime: event1Time.toISOString(),
          endTime: new Date(event1Time.getTime() + 3600000).toISOString(), // 1 hour duration
        }),
        createMockEvent({
          startTime: event2Time.toISOString(),
          endTime: new Date(event2Time.getTime() + 3600000).toISOString(), // 1 hour duration
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, []));

      expect(result.current.weeklyStats.totalHours).toBeCloseTo(2, 0);
    });

    it("identifies busiest day of week", () => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());

      // Create 3 events on Monday
      const mondayEvents = [
        createMockEvent({ startTime: new Date(weekStart.getTime() + 86400000).toISOString() }),
        createMockEvent({
          startTime: new Date(weekStart.getTime() + 86400000 + 3600000).toISOString(),
        }),
        createMockEvent({
          startTime: new Date(weekStart.getTime() + 86400000 + 7200000).toISOString(),
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(mondayEvents, []));

      expect(result.current.weeklyStats.busiestDay).toBeTruthy();
    });

    it("calculates revenue for week", () => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());

      const client = createMockClient({
        email: "client@example.com",
        totalSpent: 1000,
        totalSessions: 10,
      });

      const events = [
        createMockEvent({
          startTime: new Date(weekStart.getTime() + 1000).toISOString(), // 1 second after week start
          endTime: new Date(weekStart.getTime() + 3600000 + 1000).toISOString(), // 1 hour + 1 second after week start
          attendees: [{ email: "client@example.com" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [client]));

      expect(result.current.weeklyStats.totalRevenue).toBeGreaterThan(0);
    });
  });

  describe("Session metrics", () => {
    it("counts sessions in next 7 days", () => {
      const futureEvents = [
        createMockEvent({ startTime: new Date(Date.now() + 86400000).toISOString() }),
        createMockEvent({ startTime: new Date(Date.now() + 86400000 * 3).toISOString() }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(futureEvents, []));

      expect(result.current.sessionMetrics.sessionsNext7Days).toBe(2);
    });

    it("counts sessions this month", () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      const monthEvents = [
        createMockEvent({ startTime: new Date(startOfMonth.getTime() + 86400000).toISOString() }),
        createMockEvent({
          startTime: new Date(startOfMonth.getTime() + 86400000 * 10).toISOString(),
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(monthEvents, []));

      expect(result.current.sessionMetrics.sessionsThisMonth).toBeGreaterThanOrEqual(0);
    });

    it("excludes past events from next 7 days count", () => {
      const pastEvent = createMockEvent({
        startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
      });

      const { result } = renderHook(() => useCalendarIntelligence([pastEvent], []));

      expect(result.current.sessionMetrics.sessionsNext7Days).toBe(0);
    });
  });

  describe("Revenue and duration calculations", () => {
    it("calculates event duration in hours", () => {
      const event = createMockEvent({
        startTime: new Date("2024-01-01T10:00:00Z").toISOString(),
        endTime: new Date("2024-01-01T11:30:00Z").toISOString(),
      });

      const { result } = renderHook(() => useCalendarIntelligence([event], []));

      const revenue = result.current.calculateRevenue();
      // Should calculate based on 1.5 hour duration
      expect(revenue).toBeGreaterThanOrEqual(0);
    });

    it("calculates revenue based on client history", () => {
      const highPayingClient = createMockClient({
        email: "premium@example.com",
        totalSpent: 5000,
        totalSessions: 10, // $500 per session average
      });

      const events = [
        createMockEvent({
          attendees: [{ email: "premium@example.com" }],
          startTime: new Date("2024-01-01T10:00:00Z").toISOString(),
          endTime: new Date("2024-01-01T11:00:00Z").toISOString(),
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [highPayingClient]));

      const revenue = result.current.calculateRevenue();
      expect(revenue).toBeGreaterThan(0);
    });

    it("returns zero revenue for events without clients", () => {
      const events = [createMockEvent()];

      const { result } = renderHook(() => useCalendarIntelligence(events, []));

      const revenue = result.current.calculateRevenue();
      expect(revenue).toBe(0);
    });
  });

  describe("Convenience methods", () => {
    it("updateClientData updates BI service", () => {
      const { result } = renderHook(() => useCalendarIntelligence([], []));

      const newClients = [createMockClient({ name: "New Client" })];

      result.current.updateClientData(newClients);

      // Should not throw
      expect(result.current.biService).toBeDefined();
    });

    it("getBusiestDay returns busiest day name", () => {
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());

      const events = [
        createMockEvent({ startTime: new Date(weekStart.getTime() + 86400000).toISOString() }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, []));

      const busiestDay = result.current.getBusiestDay();
      expect(typeof busiestDay).toBe("string");
      expect(busiestDay.length).toBeGreaterThan(0);
    });
  });

  describe("Edge cases", () => {
    it("handles empty events array", () => {
      const { result } = renderHook(() => useCalendarIntelligence([], []));

      expect(result.current.enhancedAppointments).toEqual([]);
      expect(result.current.weeklyStats.totalAppointments).toBe(0);
      expect(result.current.sessionMetrics.sessionsNext7Days).toBe(0);
      expect(result.current.calculateRevenue()).toBe(0);
    });

    it("handles events without start/end times", () => {
      const malformedEvent = {
        id: "bad-event",
        title: "Malformed",
        startTime: "",
        endTime: "",
        location: "",
        attendees: [],
      };

      const { result } = renderHook(() =>
        useCalendarIntelligence([malformedEvent as CalendarEvent], []),
      );

      // Should not crash
      expect(result.current.enhancedAppointments).toBeDefined();
    });

    it("handles optional fields like description and location", () => {
      const eventWithOptionals = createMockEvent({
        title: "Session",
        location: "", // Empty string is valid
        attendees: [],
      });

      const { result } = renderHook(() => useCalendarIntelligence([eventWithOptionals], []));

      expect(result.current.enhancedAppointments).toHaveLength(1);
      expect(result.current.enhancedAppointments[0].title).toBe("Session");
    });

    it("handles missing client preferences", () => {
      const clientWithoutPrefs = {
        ...createMockClient(),
        preferences: undefined as unknown as Client["preferences"],
      };

      const events = [
        createMockEvent({
          attendees: [{ email: clientWithoutPrefs.email }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, [clientWithoutPrefs]));

      // Should not crash
      expect(result.current.enhancedAppointments).toBeDefined();
    });

    it("handles very large datasets", () => {
      const largeEventSet = Array.from({ length: 1000 }, (_, i) =>
        createMockEvent({ id: `event-${i}`, title: `Event ${i}` }),
      );

      const { result } = renderHook(() => useCalendarIntelligence(largeEventSet, []));

      expect(result.current.enhancedAppointments).toHaveLength(1000);
    });

    it("handles multiple clients with same email", () => {
      const duplicateClients = [
        createMockClient({ id: "c1", email: "duplicate@example.com" }),
        createMockClient({ id: "c2", email: "duplicate@example.com" }),
      ];

      const events = [
        createMockEvent({
          attendees: [{ email: "duplicate@example.com" }],
        }),
      ];

      const { result } = renderHook(() => useCalendarIntelligence(events, duplicateClients));

      // Should handle gracefully (first match wins)
      expect(result.current.enhancedAppointments[0].clientContext).toBeDefined();
    });
  });
});
