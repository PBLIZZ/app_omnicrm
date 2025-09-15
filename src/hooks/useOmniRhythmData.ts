import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { CalendarBusinessIntelligence } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarBusinessIntelligence";
import { CalendarEvent, Client } from "@/app/(authorisedRoute)/omni-rhythm/_components/types";

export interface CalendarStats {
  upcomingEventsCount: number;
  upcomingEvents: CalendarEvent[];
  lastSync: string | null;
  importedCount?: number;
}

export function useOmniRhythmData(): {
  // Data
  clients: Client[];
  stats: CalendarStats | null;
  allEvents: CalendarEvent[];
  biService: CalendarBusinessIntelligence;

  // State
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  isEmbedding: boolean;
  clientsLoading: boolean;
  searchQuery: string;
  error: string | null;
  syncStatus: string;
  syncProgress: {
    current: number;
    total: number;
    message: string;
  } | null;

  // Actions
  setSearchQuery: (query: string) => void;
  connectCalendar: () => Promise<void>;
  syncCalendar: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  checkCalendarStatus: () => Promise<void>;
  fetchClients: () => Promise<void>;
  fetchAllEvents: () => Promise<void>;
} {
  // Real client data from API
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);

  // Business Intelligence Service
  const [biService] = useState(() => {
    const service = new CalendarBusinessIntelligence();
    return service;
  });

  // Calendar integration state
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmbedding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [allEvents, setAllEvents] = useState<CalendarEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string>("");
  const [syncProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // Fetch real clients data
  // Calendar events (GET) via TanStack Query
  const {
    data: eventsData,
    refetch: refetchAllEvents,
    isError: isEventsError,
  } = useQuery<CalendarEvent[]>({
    queryKey: ["calendar", "events"],
    queryFn: async (): Promise<CalendarEvent[]> => {
      toast.info("Fetching calendar events...");
      const response = await apiClient.get<{
        events: CalendarEvent[];
        isConnected: boolean;
        totalCount: number;
      }>("/api/calendar/events");
      if (!response.isConnected) {
        toast.info("Calendar not connected");
        return [];
      }
      const items = Array.isArray(response.events) ? response.events : [];
      const mapEvent = (e: unknown): CalendarEvent => {
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
        const base: CalendarEvent = {
          id: s("id") ?? `event-${Math.random()}`,
          title: s("title") ?? "Untitled",
          startTime: s("startTime") ?? new Date().toISOString(),
          endTime: s("endTime") ?? new Date().toISOString(),
          location: s("location") ?? "",
          attendees,
          ...(eventType !== undefined ? { eventType } : {}),
          ...(businessCategory !== undefined ? { businessCategory } : {}),
        };
        return base;
      };
      return items.map(mapEvent);
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (eventsData) {
      setAllEvents(eventsData);
      toast.info(`Loaded ${eventsData.length} calendar events`);
    }
  }, [eventsData]);

  useEffect(() => {
    if (isEventsError) {
      toast.error("Failed to load calendar events", {
        description: "There was an error fetching your calendar data. Please try again.",
      });
      setAllEvents([]);
    }
  }, [isEventsError]);

  const fetchAllEvents = useCallback(async () => {
    await refetchAllEvents();
  }, [refetchAllEvents]);

  // Clients (GET) via TanStack Query
  const {
    data: clientsData,
    refetch: refetchClients,
    isError: isClientsError,
  } = useQuery<Client[]>({
    queryKey: ["clients"],
    queryFn: async (): Promise<Client[]> => {
      toast.info("Fetching clients...");
      const response = await fetch("/api/omni-clients");
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Contacts request failed: ${response.status} ${text}`);
      }
      const json: unknown = await response.json();

      // Handle omni-clients API response structure
      let contactsArray: unknown[] = [];
      const isRecord = (v: unknown): v is Record<string, unknown> =>
        typeof v === "object" && v !== null;

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

      // Narrowing helpers
      const getString = (r: Record<string, unknown>, key: string): string | undefined => {
        const v = r[key];
        return typeof v === "string" ? v : undefined;
      };
      const getNumber = (r: Record<string, unknown>, key: string): number | undefined => {
        const v = r[key];
        return typeof v === "number" ? v : undefined;
      };
      const getObj = (
        r: Record<string, unknown>,
        key: string,
      ): Record<string, unknown> | undefined => {
        const v = r[key];
        return isRecord(v) ? v : undefined;
      };

      const mappedClients: Client[] = contactsArray.map((contact) => {
        const c = isRecord(contact) ? contact : {};
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
        } satisfies Client;
      });

      return mappedClients;
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    if (clientsData) {
      setClients(clientsData);
      biService.updateClientData(clientsData);
      setClientsLoading(false);
    }
  }, [clientsData, biService]);

  useEffect(() => {
    if (isClientsError) {
      setClients([]);
      setClientsLoading(false);
    }
  }, [isClientsError]);

  const fetchClients = useCallback(async () => {
    await refetchClients();
  }, [refetchClients]);

  // Calendar status (GET) via TanStack Query returning key values
  const {
    data: calendarStatus,
    refetch: refetchCalendarStatus,
    isError: isCalendarStatusError,
  } = useQuery<{
    isConnected: boolean;
    upcomingEventsCount: number;
    reason?: string;
    hasRefreshToken?: boolean;
  }>({
    queryKey: ["calendar", "status-detailed"],
    queryFn: async (): Promise<{
      isConnected: boolean;
      upcomingEventsCount: number;
      reason?: string;
      hasRefreshToken?: boolean;
    }> => {
      toast.info("Checking calendar status...");
      const statusResponse = await fetch("/api/calendar/status");
      const statusJson: unknown = await statusResponse.json();
      if (!statusResponse.ok) {
        return { isConnected: false, upcomingEventsCount: 0, reason: "api_error" };
      }
      const isRec = (v: unknown): v is Record<string, unknown> =>
        typeof v === "object" && v !== null;
      if (!isRec(statusJson)) {
        return { isConnected: false, upcomingEventsCount: 0, reason: "invalid_response" };
      }
      if (statusJson["error"]) {
        return { isConnected: false, upcomingEventsCount: 0, reason: "api_error" };
      }

      // Handle nested data structure from API response
      const data = isRec(statusJson["data"]) ? statusJson["data"] : statusJson;
      const connected = Boolean(data["isConnected"]);
      const reason = typeof data["reason"] === "string" ? data["reason"] : undefined;
      const hasRefreshToken = Boolean(data["hasRefreshToken"]);

      if (!connected) {
        // Provide user feedback based on the reason
        if (reason === "token_expired") {
          toast.warning("Google Calendar token expired", {
            description: hasRefreshToken
              ? "Click 'Refresh Tokens' to renew your connection."
              : "Please reconnect your Google Calendar.",
          });
        } else if (reason === "no_integration") {
          toast.info("Google Calendar not connected", {
            description: "Connect your calendar to sync events and get insights.",
          });
        }
        return {
          isConnected: false,
          upcomingEventsCount: 0,
          ...(reason ? { reason } : {}),
          ...(hasRefreshToken ? { hasRefreshToken } : {}),
        };
      }

      // Use upcoming events count from status API response
      const upcomingEventsCount =
        typeof data["upcomingEventsCount"] === "number"
          ? (data["upcomingEventsCount"] as number)
          : 0;

      return {
        isConnected: true,
        upcomingEventsCount,
        ...(reason ? { reason } : {}),
        ...(hasRefreshToken ? { hasRefreshToken } : {}),
      };
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (calendarStatus) {
      setIsConnected(calendarStatus.isConnected);
      setStats({
        upcomingEventsCount: calendarStatus.upcomingEventsCount,
        upcomingEvents: [],
        lastSync: null,
      });
    }
  }, [calendarStatus]);

  useEffect(() => {
    if (isCalendarStatusError) {
      setIsConnected(false);
      setStats(null);
    }
  }, [isCalendarStatusError]);

  const checkCalendarStatus = useCallback(async () => {
    await refetchCalendarStatus();
  }, [refetchCalendarStatus]);

  // Actions
  const connectCalendar = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // In production, this would redirect to Google OAuth
      window.location.href = "/api/google/calendar/oauth";
    } catch {
      setIsConnecting(false);
      setError("Failed to start Google OAuth");
    }
  }, []);

  const refreshTokens = useCallback(async () => {
    try {
      toast.info("Refreshing Google Calendar tokens...");
      const response = await apiClient.post<{ success: boolean; message?: string }>(
        "/api/calendar/refresh",
        {},
      );

      if (response.success) {
        toast.success("Tokens refreshed", {
          description: "Google Calendar tokens have been refreshed successfully.",
        });
        // Refresh status after token refresh
        await checkCalendarStatus();
      } else {
        throw new Error(response.message ?? "Failed to refresh tokens");
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh tokens";

      if (
        errorMessage.includes("refresh_token_expired") ||
        errorMessage.includes("invalid_grant")
      ) {
        setIsConnected(false);
        setStats(null);
        toast.error("Authentication expired", {
          description: "Please reconnect your Google Calendar.",
        });
      } else {
        toast.error("Token refresh failed", {
          description: errorMessage,
        });
      }
    }
  }, [checkCalendarStatus]);

  const syncCalendar = useCallback(async () => {
    setIsSyncing(true);
    setError(null);
    setSyncStatus("Initializing sync...");

    try {
      toast.info("Starting calendar sync...");
      setSyncStatus("Sync Queued");
      toast.info("Calendar sync started", {
        description: "Preparing to sync your calendar events...",
      });

      // Step 1: Initiate sync
      setSyncStatus("Connecting to Google Calendar...");
      const syncResponse = await apiClient.post<{
        ok?: boolean;
        data?: {
          success?: boolean;
          message?: string;
          batchId?: string;
        };
        error?: string;
      }>("/api/calendar/sync", {});

      toast.info("Sync response received");

      // Extract batchId for job monitoring
      const batchId = syncResponse?.data?.batchId;

      if (!batchId) {
        throw new Error("No batch ID received from sync API");
      }

      setSyncStatus("Processing calendar events...");

      // Step 2: Poll for job status
      let jobCompleted = false;
      let pollCount = 0;
      const maxPolls = 60; // 60 seconds max (increased from 30)
      let finalStatus = "unknown";
      let eventsProcessed = 0;
      let lastStatus = "unknown";

      while (!jobCompleted && pollCount < maxPolls) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second

        try {
          const statusData = await apiClient.get<{
            batchId: string;
            status: string;
            summary?: {
              eventsProcessed?: number;
              timelineEntriesCreated?: number;
              failed?: number;
            };
            jobs?: Array<{
              kind: string;
              status: string;
              lastError?: string;
            }>;
          }>(`/api/calendar/sync/status?batchId=${batchId}`);

          // Status polled

          finalStatus = statusData.status;
          eventsProcessed = statusData.summary?.eventsProcessed ?? 0;

          if (statusData.status === "completed" || statusData.status === "failed") {
            jobCompleted = true;

            // Check for specific job failures
            const failedJobs = statusData.jobs?.filter((job) => job.status === "failed") ?? [];
            if (failedJobs.length > 0) {
              // Check for invalid_grant error specifically
              const hasInvalidGrant = failedJobs.some((job) =>
                job.lastError?.includes("invalid_grant"),
              );

              if (hasInvalidGrant) {
                // Clear connection status and prompt reconnection
                setIsConnected(false);
                setStats(null);
                throw new Error(
                  "Google Calendar authentication expired. Please reconnect your calendar.",
                );
              }

              const errors = failedJobs
                .map((job) => `${job.kind}: ${job.lastError ?? "Unknown error"}`)
                .join(", ");
              throw new Error(`Sync jobs failed: ${errors}`);
            }
          }

          // Update status based on current jobs
          const processingJob = statusData.jobs?.find((job) => job.status === "processing");
          if (processingJob) {
            if (processingJob.kind === "google_calendar_sync") {
              setSyncStatus("Fetching calendar events...");
            } else if (processingJob.kind === "normalize") {
              setSyncStatus("Processing event data...");
            } else if (processingJob.kind === "extract_contacts") {
              setSyncStatus("Linking contacts...");
            }
          } else if (statusData.status === "queued" && pollCount > 10) {
            // If job is stuck in queue for more than 10 seconds, show a message
            setSyncStatus(`Job queued (${pollCount}s) - Click "Process Jobs" if stuck`);
          }

          // Track if status changes
          if (statusData.status !== lastStatus) {
            lastStatus = statusData.status;
            toast.info(`Job status: ${statusData.status}`);
          }
        } catch {
          // Continue polling even if status check fails
        }

        pollCount++;
      }

      // Step 3: Handle final result
      if (finalStatus === "completed") {
        toast.success(`Sync successful! ${eventsProcessed} events processed`);
        setSyncStatus("Sync Done");
        toast.success("Calendar synced successfully!", {
          description: `${eventsProcessed} events synchronized and stored in database`,
        });

        // Step 4: Refresh calendar data
        setSyncStatus("Refreshing calendar data...");
        await checkCalendarStatus();

        // Step 5: Refresh all events data for BI
        setSyncStatus("Updating events data...");
        await fetchAllEvents();

        // Step 6: Refresh clients data
        setSyncStatus("Updating client data...");
        await fetchClients();

        setSyncStatus("Job Done");
        toast.success("All data updated!", {
          description: "Calendar and client data synchronized successfully",
        });

        toast.success("Sync process completed successfully!");
      } else if (finalStatus === "failed") {
        throw new Error("Calendar sync failed - check server logs for details");
      } else if (pollCount >= maxPolls) {
        throw new Error("Sync timeout - the process is taking longer than expected");
      }
    } catch (err) {
      setSyncStatus("Sync Failed");
      const errorMessage = err instanceof Error ? err.message : "An error occurred during sync";
      setError(errorMessage);
      toast.error("Sync failed", {
        description: errorMessage,
      });
    } finally {
      // Clear sync status after a brief delay
      setTimeout(() => {
        setSyncStatus("");
        setIsSyncing(false);
      }, 2000);
    }
  }, [fetchClients, fetchAllEvents, checkCalendarStatus]);

  // Initialize
  useEffect(() => {
    // Check for OAuth errors in URL params
    if (typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get("error");
      const connected = urlParams.get("connected");

      if (error) {
        toast.error("Failed to connect Google Calendar", {
          description:
            error === "invalid_state"
              ? "Session expired. Please try again."
              : error === "unauthorized"
                ? "Authentication failed. Please log in again."
                : error === "no_access_token"
                  ? "Failed to get access token from Google."
                  : error,
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (connected === "true") {
        toast.success("Google Calendar connected!", {
          description: "You can now sync your calendar events.",
        });
        // Don't clean up URL if we have a step parameter (needed for sync setup)
        const step = urlParams.get("step");
        if (!step) {
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    }

    void checkCalendarStatus();
    void fetchClients();
    void fetchAllEvents();
  }, [checkCalendarStatus, fetchClients, fetchAllEvents]);

  return {
    // Data
    clients,
    stats,
    allEvents,
    biService,

    // State
    isConnected,
    isConnecting,
    isSyncing,
    isEmbedding,
    clientsLoading,
    searchQuery,
    error,
    syncStatus,
    syncProgress,

    // Actions
    setSearchQuery,
    connectCalendar,
    syncCalendar,
    refreshTokens,
    checkCalendarStatus,
    fetchClients,
    fetchAllEvents,
  };
}
