import { useState, useCallback } from "react";
import { toast } from "sonner";
import { fetchPost, fetchGet } from "@/lib/api";

export function useCalendarIntegration() {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ event: any; similarity: number; preview: string }>
  >([]);
  const [insights, setInsights] = useState<{
    patterns?: string[];
    busyTimes?: string[];
    recommendations?: string[];
    clientEngagement?: string[];
  } | null>(null);


  const connectCalendar = useCallback(async () => {
    setIsConnecting(true);
    try {
      // Simplest, secure flow: full-page redirect to server OAuth start
      window.location.href = "/api/google/calendar/oauth";
    } catch {
      setIsConnecting(false);
      toast.error("Failed to start Google OAuth");
    }
  }, []);

  const syncCalendar = useCallback(async () => {
    setIsSyncing(true);

    try {
      const data = await fetchPost<any>("/api/calendar/sync", {});
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

  const generateEmbeddings = useCallback(async () => {
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

  const searchEvents = useCallback(async () => {
    if (!searchQuery.trim()) return;

    try {
      const data = await fetchPost<{ results?: Array<{ event: any; similarity: number; preview: string }> }>("/api/calendar/search", { 
        query: searchQuery, 
        limit: 5 
      });
      setSearchResults(data.results ?? []);
    } catch {
      // Search error - silently handle
    }
  }, [searchQuery]);

  const loadInsights = useCallback(async () => {
    try {
      const data = await fetchGet<{ insights?: any }>("/api/calendar/insights");
      setInsights(data.insights ?? null);
    } catch {
      // Insights error - silently handle
    }
  }, []);

  const checkCalendarStatus = useCallback(async () => {
    try {
      const data = await fetchGet<{ isConnected?: boolean }>("/api/calendar/sync");
      // Use the isConnected field from the response if available
      setIsConnected(data.isConnected ?? true);
      return data;
    } catch {
      // Error checking calendar status
      setIsConnected(false);
      return null;
    }
  }, []);

  return {
    // State
    isConnected,
    isConnecting,
    isSyncing,
    isEmbedding,
    searchQuery,
    searchResults,
    insights,

    // Actions
    setSearchQuery,
    connectCalendar,
    syncCalendar,
    generateEmbeddings,
    searchEvents,
    loadInsights,
    checkCalendarStatus,
    setIsConnected,
  };
}
