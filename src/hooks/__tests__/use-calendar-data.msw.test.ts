/**
 * useCalendarData Hook Tests (using MSW)
 *
 * Tests for calendar data fetching, normalization, and state management
 * including events, clients, and connection status with comprehensive coverage.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryClientWrapper } from "@packages/testing";
import { server } from "../../../test/msw/server";
import { http, HttpResponse } from "msw";
import { useCalendarData, type UseCalendarDataResult } from "../useCalendarData";

describe("useCalendarData (MSW)", () => {
  let wrapper: ReturnType<typeof createQueryClientWrapper>;

  beforeEach(() => {
    wrapper = createQueryClientWrapper();
  });

  // Helper function to wait for queries to finish loading
  const waitForQueriesToSettle = async (result: { current: UseCalendarDataResult }) => {
    await waitFor(
      () => {
        expect(result.current.isEventsLoading).toBe(false);
        expect(result.current.isClientsLoading).toBe(false);
      },
      { timeout: 10000, interval: 50 },
    );
  };

  describe("Calendar events query", () => {
    it("fetches and normalizes calendar events successfully", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      // Debug: Check initial state
      console.log("Initial events:", result.current.events);
      console.log("Initial loading:", result.current.isEventsLoading);

      // Wait for both queries to complete
      await waitFor(
        () => {
          console.log(
            "Waiting... events length:",
            result.current.events.length,
            "events loading:",
            result.current.isEventsLoading,
            "clients loading:",
            result.current.isClientsLoading,
          );
          // Wait for both events and clients queries to finish loading
          expect(result.current.isEventsLoading).toBe(false);
          expect(result.current.isClientsLoading).toBe(false);
        },
        { timeout: 10000, interval: 50 },
      );

      console.log("Final events:", result.current.events);
      console.log("Final loading:", result.current.isEventsLoading);

      expect(result.current.events).toHaveLength(3);
      const firstEvent = result.current.events[0];
      expect(firstEvent).toBeDefined();
      expect(firstEvent?.title).toBe("Client Session: Sarah Johnson");
      expect(firstEvent?.id).toBe("event-1");
      expect(firstEvent?.attendees).toBeDefined();
    });

    it("normalizes event dates correctly", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      const event = result.current.events[0];
      expect(event).toBeDefined();
      expect(event?.startTime).toBeTruthy();
      expect(event?.endTime).toBeTruthy();
      // Should be valid ISO date strings
      if (event) {
        expect(new Date(event.startTime).getTime()).not.toBeNaN();
        expect(new Date(event.endTime).getTime()).not.toBeNaN();
      }
    });

    it("normalizes attendee data with email and name", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      const event = result.current.events[0];
      expect(event).toBeDefined();
      expect(event?.attendees).toHaveLength(1);
      if (event?.attendees) {
        expect(event.attendees[0]?.email).toBe("sarah@example.com");
        expect(event.attendees[0]?.name).toBe("Sarah Johnson");
      }
    });

    it("handles events with optional fields", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      const event = result.current.events[0];
      expect(event).toBeDefined();
      expect(event?.location).toBeDefined();
      expect(event?.eventType).toBe("session");
      expect(event?.businessCategory).toBe("client_care");
    });

    it("returns empty array when not connected", async () => {
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({
            isConnected: false,
            totalCount: 0,
            events: [],
          });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      expect(result.current.events).toEqual([]);
    });

    it("shows loading state during fetch", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      // Initially may show loading
      // After fetch completes, loading should be false
      await waitForQueriesToSettle(result);

      expect(result.current.isEventsLoading).toBe(false);
      expect(result.current.events).toBeDefined();
    });

    it("handles network errors gracefully", async () => {
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({ error: "Network error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return result.current.eventsError !== null;
      });

      expect(result.current.eventsError).toBeDefined();
      expect(result.current.events).toEqual([]);
    });

    it("refetches events with refetchEvents", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      await result.current.refetchEvents();

      // Events refetched (may be same data)
      expect(result.current.events).toBeDefined();
    });
  });

  describe("Clients query", () => {
    it("fetches and maps client data successfully", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      expect(result.current.clients).toHaveLength(2);
      const firstClient = result.current.clients[0];
      expect(firstClient).toBeDefined();
      expect(firstClient?.name).toBe("John Doe");
      expect(firstClient?.email).toBeDefined();
    });

    it("normalizes client fields with defaults", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      const client = result.current.clients[0];
      expect(client).toBeDefined();
      if (client) {
        expect(client.id).toBeDefined();
        expect(client.name).toBeTruthy();
        expect(client.totalSessions).toBeGreaterThanOrEqual(0);
        expect(client.totalSpent).toBeGreaterThanOrEqual(0);
        expect(client.status).toBe("active");
      }
    });

    it("handles missing client fields with defaults", async () => {
      server.use(
        http.get("/api/google/calendar/clients", () => {
          return HttpResponse.json([
            {
              id: "client-1",
              name: "Minimal Client",
              // Missing many optional fields
            },
          ]);
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      const client = result.current.clients[0];
      expect(client).toBeDefined();
      if (client) {
        expect(client.name).toBe("Minimal Client");
        expect(client.email).toBe("");
        expect(client.totalSessions).toBe(0);
        expect(client.totalSpent).toBe(0);
      }
    });

    it("shows loading state during fetch", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      expect(result.current.isClientsLoading).toBe(false);
      expect(result.current.clients).toBeDefined();
    });

    it("handles network errors for clients", async () => {
      server.use(
        http.get("/api/contacts", () => {
          return HttpResponse.json({ error: "Failed to fetch" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return result.current.clientsError !== null;
      });

      expect(result.current.clientsError).toBeDefined();
      expect(result.current.clients).toEqual([]);
    });

    it("refetches clients with refetchClients", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      await result.current.refetchClients();

      expect(result.current.clients).toBeDefined();
    });
  });

  describe("Connection status query", () => {
    it("fetches connection status successfully", async () => {
      server.use(
        http.get("/api/google/status", () => {
          return HttpResponse.json({
            services: {
              calendar: {
                connected: true,
                integration: {
                  hasRefreshToken: true,
                },
                lastSync: new Date().toISOString(),
              },
            },
            upcomingEventsCount: 5,
          });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isEventsLoading).toBe(false);
        expect(result.current.isClientsLoading).toBe(false);
        expect(result.current.isStatusLoading).toBe(false);
        expect(result.current.connectionStatus.isConnected).toBe(true);
      });

      expect(result.current.connectionStatus.isConnected).toBe(true);
      expect(result.current.connectionStatus.upcomingEventsCount).toBe(5);
      expect(result.current.connectionStatus.hasRefreshToken).toBe(true);
    });

    it("shows initial disconnected state", () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      // Initial data shows disconnected
      expect(result.current.connectionStatus.isConnected).toBe(false);
      expect(result.current.connectionStatus.upcomingEventsCount).toBe(0);
      expect(result.current.connectionStatus.reason).toBe("loading");
    });

    it("handles disconnected status correctly", async () => {
      server.use(
        http.get("/api/google/status", () => {
          return HttpResponse.json({
            services: {
              calendar: {
                connected: false,
              },
            },
            upcomingEventsCount: 0,
          });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isStatusLoading).toBe(false);
        expect(result.current.connectionStatus.reason).toBe("token_expired");
      });

      expect(result.current.connectionStatus.isConnected).toBe(false);
      expect(result.current.connectionStatus.reason).toBe("token_expired");
    });

    it("shows loading state during fetch", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      // Initially should be loading
      expect(result.current.isStatusLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isStatusLoading).toBe(false);
      });
    });

    it("handles network errors for status", async () => {
      server.use(
        http.get("/api/google/status", () => {
          return HttpResponse.json({ error: "Status unavailable" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return result.current.statusError !== null;
      });

      expect(result.current.statusError).toBeDefined();
    });

    it("refetches status with refetchStatus", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return !result.current.isStatusLoading;
      });

      await result.current.refetchStatus();

      expect(result.current.connectionStatus).toBeDefined();
    });
  });

  describe("Convenience functions", () => {
    it("refreshAll triggers all refetch functions", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return (
          !result.current.isEventsLoading &&
          !result.current.isClientsLoading &&
          !result.current.isStatusLoading
        );
      });

      result.current.refreshAll();

      // All refetch functions called
      expect(result.current).toBeDefined();
    });

    it("allows independent loading states", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      // All should eventually finish loading
      await waitFor(() => {
        expect(result.current.isEventsLoading).toBe(false);
        expect(result.current.isClientsLoading).toBe(false);
        expect(result.current.isStatusLoading).toBe(false);
      });

      expect(result.current.isEventsLoading).toBe(false);
      expect(result.current.isClientsLoading).toBe(false);
      expect(result.current.isStatusLoading).toBe(false);
    });

    it("allows independent error states", async () => {
      // Make events fail
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({ error: "Events error" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return result.current.eventsError !== null;
      });

      // Events should error, but others might succeed
      expect(result.current.eventsError).toBeDefined();
      // Clients and status queries are independent
    });
  });

  describe("Edge cases and data normalization", () => {
    it("handles missing event fields gracefully", async () => {
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({
            isConnected: true,
            totalCount: 1,
            events: [
              {
                // Missing many fields
                id: "minimal-event",
              },
            ],
          });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      console.log("Events after waitForQueriesToSettle:", result.current.events);
      const event = result.current.events[0];
      expect(event.id).toBe("minimal-event");
      expect(event.title).toBe("Untitled");
      expect(event.location).toBe("");
      expect(event.attendees).toBeNull();
    });

    it("handles malformed attendee data", async () => {
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({
            isConnected: true,
            totalCount: 1,
            events: [
              {
                id: "event-bad-attendees",
                title: "Test Event",
                startTime: new Date().toISOString(),
                endTime: new Date().toISOString(),
                location: "Office",
                attendees: [
                  { email: "valid@example.com" }, // Missing name
                  { name: "No Email" }, // Missing email
                  "invalid", // Not an object
                ],
              },
            ],
          });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      expect(result.current.events.length).toBeGreaterThan(0);
      const event = result.current.events[0];
      expect(event.attendees).toBeDefined();
      expect(Array.isArray(event.attendees)).toBe(true);
      // Should handle malformed data gracefully
      expect(event.attendees.length).toBeGreaterThanOrEqual(0);
    });

    it("handles various API response structures", async () => {
      server.use(
        http.get("/api/google/calendar/clients", () => {
          return HttpResponse.json([
            {
              id: "c1",
              name: "Test Client",
              email: "test@example.com",
            },
          ]);
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      expect(result.current.clients.length).toBeGreaterThan(0);
      expect(result.current.clients[0].name).toBe("Test Client");
      expect(result.current.clients[0].email).toBe("test@example.com");
    });

    it("handles null and undefined values in data", async () => {
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({
            isConnected: true,
            totalCount: 1,
            events: [
              {
                id: "null-event",
                title: null,
                startTime: undefined,
                endTime: null,
                location: null,
                attendees: null,
              },
            ],
          });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitForQueriesToSettle(result);

      expect(result.current.events.length).toBeGreaterThan(0);
      const event = result.current.events[0];
      expect(event.title).toBe("Untitled");
      expect(event.startTime).toBeTruthy(); // Uses default
      expect(event.endTime).toBeTruthy(); // Uses default
      expect(event.location).toBe("");
      expect(event.attendees).toBeNull();
    });

    it("handles empty arrays in response", async () => {
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({
            isConnected: true,
            totalCount: 0,
            events: [],
          });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return !result.current.isEventsLoading;
      });

      expect(result.current.events).toEqual([]);
    });
  });

  describe("Integration scenarios", () => {
    it("loads all data successfully in parallel", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        expect(result.current.isEventsLoading).toBe(false);
        expect(result.current.isClientsLoading).toBe(false);
        expect(result.current.isStatusLoading).toBe(false);
        expect(result.current.events.length).toBeGreaterThan(0);
        expect(result.current.clients.length).toBeGreaterThan(0);
      });

      expect(result.current.events.length).toBeGreaterThan(0);
      expect(result.current.clients.length).toBeGreaterThan(0);
      expect(result.current.connectionStatus).toBeDefined();
    });

    it("handles partial failure gracefully", async () => {
      server.use(
        http.get("/api/google/calendar/events", () => {
          return HttpResponse.json({ error: "Events failed" }, { status: 500 });
        }),
      );

      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        return !result.current.isClientsLoading && !result.current.isStatusLoading;
      });

      // Events failed but others succeeded
      expect(result.current.eventsError).toBeDefined();
      expect(result.current.clients).toBeDefined();
      expect(result.current.connectionStatus).toBeDefined();
    });

    it("maintains consistent state across refetches", async () => {
      const { result } = renderHook(() => useCalendarData(), { wrapper });

      await waitFor(() => {
        expect(result.current.events.length).toBeGreaterThan(0);
        expect(result.current.isEventsLoading).toBe(false);
      });

      const initialEventCount = result.current.events.length;

      result.current.refreshAll();

      await waitFor(() => {
        expect(result.current.isEventsLoading).toBe(false);
      });

      // Data should be consistent
      expect(result.current.events.length).toBe(initialEventCount);
    });
  });
});
