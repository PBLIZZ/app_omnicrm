/**
 * Unified Calendar Data Hook
 *
 * This hook replaces the bloated useOmniRhythmData hook with a clean,
 * focused implementation following the OmniConnect pattern.
 *
 * Responsibilities:
 * - Calendar events data fetching
 * - Connection status checking
 * - Client data fetching
 * - Clean separation of concerns
 */
import { useQuery } from "@tanstack/react-query";
import type { RefetchOptions, QueryObserverResult } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (
    error instanceof Error &&
    (error.message.includes("fetch") || error.message.includes("network"))
  ) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};
import type { CalendarEvent, Client } from "@/server/db/business-schemas";

export interface CalendarConnectionStatus {
  isConnected: boolean;
  upcomingEventsCount: number;
  reason?: string;
  hasRefreshToken?: boolean;
  autoRefreshed?: boolean;
  lastSync?: string;
}

export interface UseCalendarDataResult {
  events: CalendarEvent[];
  clients: Client[];
  connectionStatus: CalendarConnectionStatus;
  isEventsLoading: boolean;
  isClientsLoading: boolean;
  isStatusLoading: boolean;
  eventsError: unknown;
  clientsError: unknown;
  statusError: unknown;
  refetchEvents: (
    options?: RefetchOptions,
  ) => Promise<QueryObserverResult<CalendarEvent[], unknown>>;
  refetchClients: (options?: RefetchOptions) => Promise<QueryObserverResult<Client[], unknown>>;
  refetchStatus: (
    options?: RefetchOptions,
  ) => Promise<QueryObserverResult<CalendarConnectionStatus, unknown>>;
  refreshAll: () => void;
}

/**
 * Exposes calendar events, client records, and calendar connection status along with loading/error states and refetch actions.
 *
 * @returns An object containing:
 * - `events`: normalized calendar events array
 * - `clients`: normalized client array
 * - `connectionStatus`: summary of the calendar connection (connected state, upcomingEventsCount, optional reason, hasRefreshToken, autoRefreshed, lastSync)
 * - loading flags: `isEventsLoading`, `isClientsLoading`, `isStatusLoading`
 * - error states: `eventsError`, `clientsError`, `statusError`
 * - refetch functions: `refetchEvents`, `refetchClients`, `refetchStatus`
 * - `refreshAll`: convenience function that triggers all three refetches
 */
export function useCalendarData(): UseCalendarDataResult {
  // Calendar events query - using raw events from database
  const {
    data: eventsData = [],
    isLoading: isEventsLoading,
    error: eventsError,
    refetch: refetchEvents,
    status: eventsStatus,
    fetchStatus: eventsFetchStatus,
  } = useQuery<CalendarEvent[]>({
    queryKey: queryKeys.google.calendar.events(),
    queryFn: async (): Promise<CalendarEvent[]> => {
      const result = await apiClient.get<{ events: unknown[] }>("/api/google/calendar/events", {
        showErrorToast: false,
      });
      console.log("Events query result:", result);
      const events = result.events || [];
      console.log("Events query returning:", events);
      const mappedEvents = mapEventsData(events);
      console.log("Mapped events:", mappedEvents);
      return mappedEvents;
    },
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  console.log("Events query state:", {
    status: eventsStatus,
    fetchStatus: eventsFetchStatus,
    isLoading: isEventsLoading,
    dataLength: eventsData.length,
    error: eventsError,
  });

  // Client data query
  const {
    data: clientsData = [],
    isLoading: isClientsLoading,
    error: clientsError,
    refetch: refetchClients,
  } = useQuery<Client[]>({
    queryKey: queryKeys.google.calendar.clients(),
    queryFn: async (): Promise<Client[]> => {
      const result = await apiClient.get<unknown>("/api/google/calendar/clients", {
        showErrorToast: false,
      });
      console.log("Clients query result:", result);
      return mapClientsData(result);
    },
    staleTime: 60_000,
  });

  // Connection status query
  const {
    data: connectionStatus = {
      isConnected: false,
      upcomingEventsCount: 0,
      reason: "loading",
    },
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<CalendarConnectionStatus>({
    queryKey: queryKeys.google.calendar.status(),
    queryFn: async (): Promise<CalendarConnectionStatus> => {
      // Use unified status API with auto-refresh and caching
      const response = await apiClient.get<{
        calendar: {
          connected: boolean;
          lastSync: string | null;
        };
        upcomingEventsCount?: number;
      }>("/api/google/status", { showErrorToast: false });

      const calendar = response.calendar;
      if (!calendar) {
        return { isConnected: false, upcomingEventsCount: 0, reason: "api_error" };
      }

      return {
        isConnected: calendar.connected,
        upcomingEventsCount: response.upcomingEventsCount ?? 0,
        reason: calendar.connected ? "connected" : "token_expired",
        ...(calendar.lastSync !== null && {
          lastSync: calendar.lastSync,
        }),
      };
    },
    staleTime: 15_000,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Refresh all data
  const refreshAll = (): void => {
    void refetchEvents();
    void refetchClients();
    void refetchStatus();
  };

  return {
    // Data
    events: eventsData,
    clients: clientsData,
    connectionStatus,

    // Loading states
    isEventsLoading,
    isClientsLoading,
    isStatusLoading,

    // Error states
    eventsError,
    clientsError,
    statusError,

    // Actions
    refetchEvents,
    refetchClients,
    refetchStatus,
    refreshAll,
  };
}

// Helper function to map clients data with proper typing
function mapClientsData(json: unknown): Client[] {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  // Handle contacts API response structure
  let contactsArray: unknown[] = [];

  // The new API returns { data: { items: [...] } } structure
  if (
    isRecord(json) &&
    isRecord(json["data"]) &&
    Array.isArray((json["data"] as Record<string, unknown>)["items"])
  ) {
    contactsArray = (json["data"] as Record<string, unknown>)["items"] as unknown[];
  } else if (isRecord(json) && Array.isArray(json["items"])) {
    contactsArray = json["items"] as unknown[];
  } else if (Array.isArray(json)) {
    contactsArray = json as unknown[];
  }

  return contactsArray.map(mapClientData);
}

// Helper function to map individual client data
function mapClientData(contact: unknown): Client {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const c = isRecord(contact) ? contact : {};

  const getString = (r: Record<string, unknown>, key: string): string | undefined => {
    const v = r[key];
    return typeof v === "string" ? v : undefined;
  };

  const getNumber = (r: Record<string, unknown>, key: string): number | undefined => {
    const v = r[key];
    return typeof v === "number" ? v : undefined;
  };

  const getObj = (r: Record<string, unknown>, key: string): Record<string, unknown> | undefined => {
    const v = r[key];
    return isRecord(v) ? v : undefined;
  };

  const id = getString(c, "id") ?? getString(c, "userId") ?? `contact-${Math.random()}`;
  const displayName = getString(c, "displayName") ?? getString(c, "name") ?? "Unknown Client";
  const email = getString(c, "primaryEmail") ?? getString(c, "email") ?? "";
  const totalSessions = getNumber(c, "totalSessions") ?? 0;
  const totalSpent = getNumber(c, "totalSpent") ?? 0;
  const lastSessionDate =
    getString(c, "updatedAt") ?? getString(c, "lastSessionDate") ?? new Date().toISOString();
  const status = (getString(c, "status") as Client["status"]) ?? "active";
  const prefs = getObj(c, "preferences");

  return {
    id,
    name: displayName,
    email,
    totalSessions,
    totalSpent,
    lastSessionDate,
    status,
    satisfaction: getNumber(c, "satisfaction") ?? 4,
    preferences: prefs
      ? {
          preferredTimes: Array.isArray(prefs["preferredTimes"])
            ? (prefs["preferredTimes"] as unknown[]).filter(
                (x): x is string => typeof x === "string",
              )
            : [],
          preferredServices: Array.isArray(prefs["preferredServices"])
            ? (prefs["preferredServices"] as unknown[]).filter(
                (x): x is string => typeof x === "string",
              )
            : [],
          goals: Array.isArray(prefs["goals"])
            ? (prefs["goals"] as unknown[]).filter((x): x is string => typeof x === "string")
            : [],
        }
      : { preferredTimes: [], preferredServices: [], goals: [] },
  };
}

// Helper function to map events data with proper typing and defaults
function mapEventsData(json: unknown[]): CalendarEvent[] {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  const getString = (r: Record<string, unknown>, key: string): string | undefined => {
    const v = r[key];
    return typeof v === "string" ? v : undefined;
  };

  const getArray = (r: Record<string, unknown>, key: string): unknown[] => {
    const v = r[key];
    return Array.isArray(v) ? v : [];
  };

  return json.filter(isRecord).map((e): CalendarEvent => {
    const id = getString(e, "id") ?? `event-${Math.random()}`;
    const title = getString(e, "title") ?? "Untitled";
    const startTime = getString(e, "startTime") ?? new Date().toISOString();
    const endTime = getString(e, "endTime") ?? new Date(Date.now() + 3600000).toISOString();
    const location = getString(e, "location") ?? "";
    const description = getString(e, "description") ?? null;
    const status = getString(e, "status") ?? null;
    const eventType = getString(e, "eventType") ?? null;
    const businessCategory = getString(e, "businessCategory") ?? null;
    const googleEventId = getString(e, "googleEventId");

    // Handle attendees array
    const attendeesRaw = getArray(e, "attendees");
    const attendees = attendeesRaw
      .filter(isRecord)
      .map((a) => {
        const attendee: { email: string; name?: string; responseStatus?: string } = {
          email: getString(a, "email") ?? "",
        };
        const name = getString(a, "name");
        if (name) attendee.name = name;
        const responseStatus = getString(a, "responseStatus");
        if (responseStatus) attendee.responseStatus = responseStatus;
        return attendee;
      })
      .filter((a) => a.email); // Only include attendees with email

    return {
      id,
      ...(googleEventId && { googleEventId }),
      title,
      description,
      startTime,
      endTime,
      attendees: attendees.length > 0 ? attendees : null,
      location,
      status,
      eventType,
      businessCategory,
    };
  });
}
