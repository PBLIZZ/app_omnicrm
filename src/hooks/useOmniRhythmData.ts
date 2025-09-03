import React, { useState, useCallback } from "react";
import { toast } from "sonner";
import { fetchPost, fetchGet } from "@/lib/api";
import { CalendarBusinessIntelligence } from "../app/(authorisedRoute)/omni-rhythm/_components/CalendarBusinessIntelligence";

export interface Client {
  id: string;
  name: string;
  email: string;
  totalSessions: number;
  totalSpent: number;
  lastSessionDate: string;
  status: "active" | "inactive" | "prospect";
  satisfaction: number;
  preferences?: {
    preferredTimes?: string[];
    preferredServices?: string[];
    goals?: string[];
  };
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: Array<{ email: string; name?: string }>;
  eventType?: string;
  businessCategory?: string;
}

export interface CalendarStats {
  upcomingEventsCount: number;
  upcomingEvents: CalendarEvent[];
  lastSync: string | null;
}

export function useOmniRhythmData() {
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
  // Fetch all calendar events for business intelligence
  const fetchAllEvents = useCallback(async () => {
    try {
      console.log("Fetching all calendar events for BI...");
      const response = await fetch("/api/calendar/events");

      if (response.ok) {
        const data = await response.json();
        console.log("Calendar events API response:", data);

        if (data && data.events && Array.isArray(data.events)) {
          console.log("fetchAllEvents - Raw API response:", data);
          console.log("fetchAllEvents - Sample event structure:", data.events[0]);
          setAllEvents(data.events);
          console.log(`✅ Loaded ${data.events.length} events for BI analysis`);
        } else {
          console.warn("Unexpected calendar events API response structure:", data);
          setAllEvents([]);
        }
      } else {
        console.error("Calendar events API request failed:", response.status, response.statusText);
        setAllEvents([]);
      }
    } catch (err) {
      console.error("Failed to fetch calendar events:", err);
      setAllEvents([]);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      console.log("Fetching clients from API...");
      const response = await fetch("/api/contacts");

      if (response.ok) {
        const data = await response.json();
        console.log("Contacts API response:", data);

        // Handle different response structures
        let contactsArray = [];
        if (data?.ok && data?.data?.items && Array.isArray(data.data.items)) {
          // Handle {ok: true, data: {items: [...], total: ...}} structure
          contactsArray = data.data.items;
        } else if (data?.items && Array.isArray(data.items)) {
          contactsArray = data.items;
        } else if (data && Array.isArray(data)) {
          contactsArray = data;
        } else if (data?.contacts && Array.isArray(data.contacts)) {
          contactsArray = data.contacts;
        } else {
          console.warn("Unexpected contacts API response structure:", data);
          contactsArray = [];
        }

        const mappedClients: Client[] = contactsArray.map((contact: any) => ({
          id: contact.id || contact.userId || `contact-${Math.random()}`,
          name: contact.displayName || contact.name || "Unknown Client",
          email: contact.primaryEmail || contact.email || "",
          totalSessions: contact.notesCount || contact.totalSessions || 0,
          totalSpent: contact.totalSpent || 0,
          lastSessionDate: contact.updatedAt || contact.lastSessionDate || new Date().toISOString(),
          status: contact.status || "active",
          satisfaction: contact.satisfaction || 4,
          preferences: contact.preferences || {
            preferredTimes: [],
            preferredServices: [],
            goals: [],
          },
        }));

        console.log(`Mapped ${mappedClients.length} clients from API`);
        setClients(mappedClients);
        biService.updateClientData(mappedClients);
      } else {
        console.error("Contacts API request failed:", response.status, response.statusText);
        setClients([]);
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
      setClients([]);
    } finally {
      setClientsLoading(false);
    }
  }, [biService]);

  const checkCalendarStatus = useCallback(async () => {
    try {
      console.log("Checking calendar connection status...");
      
      // Check connection status first
      const statusResponse = await fetch("/api/calendar/status");
      const statusResult = await statusResponse.json();
      
      if (!statusResponse.ok || statusResult.error || !statusResult.isConnected) {
        console.log("Calendar not connected");
        setStats(null);
        setIsConnected(false);
        return;
      }

      // If connected, get preview data for events count
      console.log("Calendar connected, fetching preview data...");
      try {
        const previewResponse = await fetch("/api/calendar/preview");
        const previewResult = await previewResponse.json();
        
        if (previewResponse.ok && !previewResult.error) {
          setStats({
            upcomingEventsCount: previewResult.upcomingEventsCount || 0,
            upcomingEvents: [], // Not used in this card
            lastSync: null, // Remove premature lastSync logic
          });
          setIsConnected(true);
          console.log("Calendar preview loaded:", previewResult.upcomingEventsCount, "upcoming events");
        } else {
          // Connected but preview failed - still show as connected with 0 events
          setStats({
            upcomingEventsCount: 0,
            upcomingEvents: [],
            lastSync: null,
          });
          setIsConnected(true);
          console.log("Calendar connected but preview failed:", previewResult.error);
        }
      } catch (previewError) {
        // Connected but preview failed - still show as connected with 0 events
        setStats({
          upcomingEventsCount: 0,
          upcomingEvents: [],
          lastSync: null,
        });
        setIsConnected(true);
        console.log("Calendar connected but preview request failed:", previewError);
      }
    } catch (error) {
      console.error("Error checking calendar status:", error);
      setStats(null);
      setIsConnected(false);
    }
  }, []);

  // Actions
  const connectCalendar = useCallback(async () => {
    setIsConnecting(true);
    setError(null);
    try {
      // In production, this would redirect to Google OAuth
      window.location.href = "/api/google/calendar/oauth";
    } catch (err) {
      setIsConnecting(false);
      setError("Failed to start Google OAuth");
    }
  }, []);

  const refreshTokens = useCallback(async () => {
    try {
      console.log("Refreshing Google Calendar tokens...");
      const response = await fetchPost("/api/calendar/refresh", {});
      
      if (response.success) {
        toast.success("Tokens refreshed", {
          description: "Google Calendar tokens have been refreshed successfully.",
        });
        // Refresh status after token refresh
        await checkCalendarStatus();
      } else {
        throw new Error(response.message || "Failed to refresh tokens");
      }
    } catch (err) {
      console.error("Token refresh error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh tokens";
      
      if (errorMessage.includes("refresh_token_expired") || errorMessage.includes("invalid_grant")) {
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
      console.log("🚀 Starting calendar sync process...");
      setSyncStatus("Sync Queued");
      toast.info("Calendar sync started", {
        description: "Preparing to sync your calendar events...",
      });

      // Step 1: Initiate sync
      setSyncStatus("Connecting to Google Calendar...");
      const syncResponse = await fetchPost<{
        ok?: boolean;
        data?: {
          success?: boolean;
          message?: string;
          batchId?: string;
        };
        error?: string;
      }>("/api/calendar/sync", {});

      console.log("📊 Sync response received:", syncResponse);

      // Extract batchId for job monitoring
      const batchId = syncResponse?.data?.batchId || syncResponse?.batchId;
      
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
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        try {
          const statusData = await fetchGet<{
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
          
          console.log(`📊 Job status (${pollCount + 1}/${maxPolls}):`, statusData);
          
          finalStatus = statusData.status;
          eventsProcessed = statusData.summary?.eventsProcessed || 0;
          
          if (statusData.status === "completed" || statusData.status === "failed") {
            jobCompleted = true;
            
            // Check for specific job failures
            const failedJobs = statusData.jobs?.filter(job => job.status === "failed") || [];
            if (failedJobs.length > 0) {
              // Check for invalid_grant error specifically
              const hasInvalidGrant = failedJobs.some(job => 
                job.lastError?.includes('invalid_grant')
              );
              
              if (hasInvalidGrant) {
                // Clear connection status and prompt reconnection
                setIsConnected(false);
                setStats(null);
                throw new Error('Google Calendar authentication expired. Please reconnect your calendar.');
              }
              
              const errors = failedJobs.map(job => 
                `${job.kind}: ${job.lastError || 'Unknown error'}`
              ).join(", ");
              throw new Error(`Sync jobs failed: ${errors}`);
            }
          }
          
          // Update status based on current jobs
          const processingJob = statusData.jobs?.find(job => job.status === "processing");
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
            console.log(`Job status changed to: ${statusData.status}`);
          }
        } catch (statusError) {
          console.warn("Failed to check job status:", statusError);
          // Continue polling even if status check fails
        }
        
        pollCount++;
      }
      
      // Step 3: Handle final result
      if (finalStatus === "completed") {
        console.log(`✅ Sync successful! ${eventsProcessed} events processed`);
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

        console.log("🎉 Sync process completed successfully!");
      } else if (finalStatus === "failed") {
        throw new Error("Calendar sync failed - check server logs for details");
      } else if (pollCount >= maxPolls) {
        throw new Error("Sync timeout - the process is taking longer than expected");
      }
    } catch (err) {
      console.error("❌ Error during sync:", err);
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
  React.useEffect(() => {
    // Check for OAuth errors in URL params
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const error = urlParams.get('error');
      const connected = urlParams.get('connected');
      
      if (error) {
        console.error('OAuth error:', error);
        toast.error('Failed to connect Google Calendar', {
          description: error === 'invalid_state' ? 'Session expired. Please try again.' : 
                      error === 'unauthorized' ? 'Authentication failed. Please log in again.' :
                      error === 'no_access_token' ? 'Failed to get access token from Google.' :
                      error,
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (connected === 'true') {
        toast.success('Google Calendar connected!', {
          description: 'You can now sync your calendar events.',
        });
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
    
    checkCalendarStatus();
    fetchClients();
    fetchAllEvents();
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
