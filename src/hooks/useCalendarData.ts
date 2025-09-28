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
import { apiClient } from "@/lib/api/client";
import { queryKeys } from "@/lib/queries/keys";
// Direct retry logic (no abstraction)
const shouldRetry = (error: unknown, retryCount: number): boolean => {
  // Don't retry auth errors (401, 403)
  if (error instanceof Error && error.message.includes("401")) return false;
  if (error instanceof Error && error.message.includes("403")) return false;

  // Retry network errors up to 3 times
  if (error instanceof Error && (error.message.includes("fetch") || error.message.includes("network"))) {
    return retryCount < 3;
  }

  // Retry other errors up to 2 times
  return retryCount < 2;
};
import type { CalendarEvent, Client } from "@/server/db/business-schemas";

export interface CalendarStats {
  upcomingEventsCount: number;
  upcomingEvents: CalendarEvent[];
  lastSync: string | null;
  importedCount?: number;
}

export interface CalendarConnectionStatus {
  isConnected: boolean;
  upcomingEventsCount: number;
  reason?: string;
  hasRefreshToken?: boolean;
  autoRefreshed?: boolean;
  lastSync?: string;
}

export interface UseCalendarDataResult {
  // Main data
  events: CalendarEvent[];
  clients: Client[];
  connectionStatus: CalendarConnectionStatus | undefined;

  // Loading states
  isEventsLoading: boolean;
  isClientsLoading: boolean;
  isStatusLoading: boolean;

  // Error states
  eventsError: Error | null;
  clientsError: Error | null;
  statusError: Error | null;

  // Actions
  refetchEvents: () => void;
  refetchClients: () => void;
  refetchStatus: () => void;
  refreshAll: () => void;
}

export function useCalendarData(): UseCalendarDataResult {
  // Calendar events query
  const {
    data: eventsData = [],
    isLoading: isEventsLoading,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery<CalendarEvent[]>({
    queryKey: queryKeys.calendar.events(),
    queryFn: async (): Promise<CalendarEvent[]> => {
      const response = await apiClient.get<{
        events: CalendarEvent[];
        isConnected: boolean;
        totalCount: number;
      }>("/api/google/calendar/events");

      if (!response.isConnected) {
        return [];
      }

      const items = Array.isArray(response.events) ? response.events : [];
      return items.map(mapCalendarEvent);
    },
    staleTime: 60_000,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Client data query
  const {
    data: clientsData = [],
    isLoading: isClientsLoading,
    error: clientsError,
    refetch: refetchClients,
  } = useQuery<Client[]>({
    queryKey: queryKeys.calendar.clients(),
    queryFn: async (): Promise<Client[]> => {
      const json = await apiClient.get("/api/omni-clients");
      return mapClientsData(json);
    },
    staleTime: 60_000,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
  });

  // Connection status query
  const {
    data: connectionStatus,
    isLoading: isStatusLoading,
    error: statusError,
    refetch: refetchStatus,
  } = useQuery<CalendarConnectionStatus>({
    queryKey: queryKeys.google.calendar.status(),
    queryFn: async (): Promise<CalendarConnectionStatus> => {
      // Use unified status API with auto-refresh and caching
      const response = await apiClient.get<{
        services: {
          calendar: {
            connected: boolean;
            integration?: {
              hasRefreshToken?: boolean;
            };
            autoRefreshed?: boolean;
            lastSync?: string;
          };
        };
        upcomingEventsCount?: number;
      }>("/api/google/status");

      const calendarService = response.services?.calendar;
      if (!calendarService) {
        return { isConnected: false, upcomingEventsCount: 0, reason: "api_error" };
      }

      return {
        isConnected: calendarService.connected,
        upcomingEventsCount: response.upcomingEventsCount ?? 0,
        reason: calendarService.connected ? "connected" : "token_expired",
        ...(calendarService.integration?.hasRefreshToken !== undefined && {
          hasRefreshToken: calendarService.integration.hasRefreshToken,
        }),
        ...(calendarService.autoRefreshed !== undefined && {
          autoRefreshed: calendarService.autoRefreshed,
        }),
        ...(calendarService.lastSync !== undefined &&
          calendarService.lastSync !== null && {
            lastSync: calendarService.lastSync,
          }),
      };
    },
    staleTime: 15_000,
    retry: (failureCount, error) => shouldRetry(error, failureCount),
    // Optimistic loading: assume connected state initially for better UX
    initialData: {
      isConnected: true,
      upcomingEventsCount: 0,
      reason: "loading",
    },
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

// Helper function to map calendar event data with proper typing
function mapCalendarEvent(e: unknown): CalendarEvent {
  const r = typeof e === "object" && e !== null ? (e as Record<string, unknown>) : {};
  const s = (k: string): string | undefined =>
    typeof r[k] === "string" ? (r[k] as string) : undefined;

  const attendees = Array.isArray(r["attendees"])
    ? (r["attendees"] as unknown[]).map((a) => {
        const ar = typeof a === "object" && a !== null ? (a as Record<string, unknown>) : {};
        const email = typeof ar["email"] === "string" ? (ar["email"] as string) : "";
        const name = typeof ar["name"] === "string" ? (ar["name"] as string) : undefined;
        return name !== undefined ? { email, name } : { email };
      })
    : [];

  const eventType = s("eventType");
  const businessCategory = s("businessCategory");

  return {
    id: s("id") ?? `event-${Math.random()}`,
    title: s("title") ?? "Untitled",
    startTime: s("startTime") ?? new Date().toISOString(),
    endTime: s("endTime") ?? new Date().toISOString(),
    location: s("location") ?? "",
    attendees,
    ...(eventType !== undefined ? { eventType } : {}),
    ...(businessCategory !== undefined ? { businessCategory } : {}),
  };
}

// Helper function to map clients data with proper typing
function mapClientsData(json: unknown): Client[] {
  const isRecord = (v: unknown): v is Record<string, unknown> =>
    typeof v === "object" && v !== null;

  // Handle omni-clients API response structure
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
  const totalSessions = getNumber(c, "notesCount") ?? getNumber(c, "totalSessions") ?? 0;
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
