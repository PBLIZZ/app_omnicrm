import React, { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { fetchPost, fetchGet } from "@/lib/api";

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: Array<{ email: string; displayName?: string }>;
  location?: string;
  [key: string]: unknown;
}

interface CalendarSearchResult {
  event: CalendarEvent;
  similarity: number;
  preview: string;
}

interface CalendarSyncResponse {
  processedEvents: number;
  message?: string;
}

export function useCalendarIntegration(): {
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  isEmbedding: boolean;
  searchQuery: string;
  searchResults: CalendarSearchResult[];
  insights: {
    patterns?: string[];
    busyTimes?: string[];
    recommendations?: string[];
    clientEngagement?: string[];
  } | null;
  upcomingEventsCount: number;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  connectCalendar: () => Promise<void>;
  syncCalendar: () => Promise<CalendarSyncResponse>;
  generateEmbeddings: () => Promise<{ processedEvents: number }>;
  searchEvents: () => Promise<void>;
  loadInsights: () => Promise<void>;
  checkCalendarStatus: () => Promise<{ isConnected: boolean; upcomingEventsCount: number } | null>;
  isFetchingInsights: boolean;
  setIsConnected: React.Dispatch<React.SetStateAction<boolean>>;
} {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CalendarSearchResult[]>([]);
  const [insights, setInsights] = useState<{
    patterns?: string[];
    busyTimes?: string[];
    recommendations?: string[];
    clientEngagement?: string[];
  } | null>(null);

  const connectCalendar = useCallback(async (): Promise<void> => {
    setIsConnecting(true);
    try {
      // Simplest, secure flow: full-page redirect to server OAuth start
      window.location.href = "/api/google/calendar/oauth";
    } catch {
      setIsConnecting(false);
      toast.error("Failed to start Google OAuth");
    }
  }, []);

  const syncCalendar = useCallback(async (): Promise<CalendarSyncResponse> => {
    setIsSyncing(true);

    try {
      const data = await fetchPost<CalendarSyncResponse>("/api/calendar/sync", {});
      toast.success("Calendar synced successfully");
      return data;
    } catch (error) {
      console.error("Failed to sync calendar:", error);
      toast.error("Failed to sync calendar");
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, []);

  const generateEmbeddings = useCallback(async (): Promise<{ processedEvents: number }> => {
    setIsEmbedding(true);

    try {
      const data = await fetchPost<{ processedEvents: number }>("/api/calendar/embed", {});
      toast.success(`Successfully generated embeddings for ${data.processedEvents} events!`);
      return data;
    } catch (error) {
      console.error("Failed to generate embeddings:", error);
      toast.error("Network error during embedding generation");
      throw error;
    } finally {
      setIsEmbedding(false);
    }
  }, []);

  const searchEvents = useCallback(async (): Promise<void> => {
    if (!searchQuery.trim()) return;

    try {
      const data = await fetchPost<{ results?: CalendarSearchResult[] }>("/api/calendar/search", {
        query: searchQuery,
        limit: 5,
      });
      setSearchResults(data.results ?? []);
    } catch {
      // Search error - silently handle
    }
  }, [searchQuery]);

  // Calendar insights (GET) via TanStack Query v5
  const {
    data: insightsData,
    refetch: refetchInsights,
    isFetching: isFetchingInsights,
  } = useQuery<{
    patterns?: string[];
    busyTimes?: string[];
    recommendations?: string[];
    clientEngagement?: string[];
  } | null>({
    queryKey: ["calendar", "insights"],
    queryFn: async () => {
      const data = await fetchGet<{
        insights?: {
          patterns?: string[];
          busyTimes?: string[];
          recommendations?: string[];
          clientEngagement?: string[];
        };
      }>("/api/calendar/insights");
      return data.insights ?? null;
    },
    staleTime: 60_000, // 1 minute
  });

  React.useEffect(() => {
    // keep previous API surface stable
    if (insightsData !== undefined) {
      setInsights(insightsData);
    }
  }, [insightsData]);

  const loadInsights = useCallback(async (): Promise<void> => {
    await refetchInsights();
  }, [refetchInsights]);

  // Calendar status (GET) via TanStack Query v5 returning key values
  const {
    data: calendarStatus,
    refetch: refetchStatus,
    isError: isStatusError,
  } = useQuery<{ isConnected: boolean; upcomingEventsCount: number }>({
    queryKey: ["calendar", "status"],
    queryFn: async (): Promise<{ isConnected: boolean; upcomingEventsCount: number }> => {
      // First check overall connection status
      const status = await fetchGet<{ isConnected?: boolean; error?: string }>(
        "/api/calendar/status",
      );
      if (!status.isConnected) {
        return { isConnected: false, upcomingEventsCount: 0 };
      }

      // If connected, try to get upcoming events count via preview
      try {
        const preview = await fetchGet<{ upcomingEventsCount?: number; error?: string }>(
          "/api/calendar/preview",
        );
        return { isConnected: true, upcomingEventsCount: preview.upcomingEventsCount ?? 0 };
      } catch {
        return { isConnected: true, upcomingEventsCount: 0 };
      }
    },
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  React.useEffect(() => {
    if (calendarStatus) {
      setIsConnected(calendarStatus.isConnected);
    }
  }, [calendarStatus]);

  React.useEffect(() => {
    if (isStatusError) {
      setIsConnected(false);
    }
  }, [isStatusError]);

  const checkCalendarStatus = useCallback(async (): Promise<{
    isConnected: boolean;
    upcomingEventsCount: number;
  } | null> => {
    const res = await refetchStatus();
    return res.data ?? null;
  }, [refetchStatus]);

  return {
    // State
    isConnected,
    isConnecting,
    isSyncing,
    isEmbedding,
    searchQuery,
    searchResults,
    insights: insightsData ?? insights,
    upcomingEventsCount: calendarStatus?.upcomingEventsCount ?? 0,

    // Actions
    setSearchQuery,
    connectCalendar,
    syncCalendar,
    generateEmbeddings,
    searchEvents,
    loadInsights,
    checkCalendarStatus,
    // Query flags
    isFetchingInsights,
    setIsConnected,
  };
}
