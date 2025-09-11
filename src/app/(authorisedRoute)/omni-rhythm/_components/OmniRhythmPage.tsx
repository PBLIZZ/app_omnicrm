"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiClient } from "@/lib/api/client";
import { logger } from "@/lib/observability";

import { Calendar } from "lucide-react";

// Hooks
import { useOmniRhythmData } from "../../../../hooks/useOmniRhythmData";
import { useBusinessIntelligence } from "../../../../hooks/useBusinessIntelligence";

// Components - Used in Main Dashboard
import { TodayIntelligencePanel } from "./TodayIntelligencePanel";
import { WeeklyBusinessFlow } from "./WeeklyBusinessFlow";
import { ClientSessionTimeline } from "./ClientSessionTimeline";
import { PreparationWorkflow } from "./PreparationWorkflow";

// Custom Components
import { QuickActions } from "./QuickActions";
import { CalendarConnectionCard } from "./CalendarConnectionCard";
import { ensureError } from "@/lib/utils/error-handler";

// Types
interface BusinessInsights {
  isHighValue?: boolean;
  requiresPreparation?: boolean;
}

interface ClientContext {
  estimatedRevenue?: number;
  clientName?: string;
  notes?: string;
}

interface CalendarEvent {
  id?: string;
  title?: string;
  startTime?: string;
  businessCategory?: string;
  eventType?: string;
  businessInsights?: BusinessInsights;
  clientContext?: ClientContext;
}

export function OmniRhythmPage(): JSX.Element {
  // Use custom hooks for state management
  const data = useOmniRhythmData();
  const bi = useBusinessIntelligence(data.biService, data.allEvents || []);
  const [activeTab, setActiveTab] = useState("overview");
  const [isProcessingJobs, setIsProcessingJobs] = useState(false);

  // Handler functions for calendar actions
  const handleGenerateEmbeddings = async (): Promise<void> => {
    try {
      const result = await apiClient.post<{ processedEvents: number }>("/api/calendar/embed", {});
      alert(`Successfully generated embeddings for ${result.processedEvents} events!`);
    } catch (error) {
      await logger.error(
        "embeddings_generation_failed",
        {
          operation: "generate_embeddings",
          additionalData: { component: "OmniRhythmPage" },
        },
        ensureError(error),
      );
      alert("Network error during embedding generation");
    }
  };

  const handleProcessJobs = async (): Promise<void> => {
    setIsProcessingJobs(true);
    try {
      const result = await apiClient.post<{
        message: string;
        runner: string;
        processed: number;
        succeeded: number;
        failed: number;
        errors?: unknown[];
      }>("/api/jobs/runner", {});

      alert(
        `Processed ${result.processed} jobs: ${result.succeeded} succeeded, ${result.failed} failed`,
      );
    } catch (error) {
      await logger.error(
        "job_processing_failed",
        {
          operation: "process_jobs",
          additionalData: { component: "OmniRhythmPage" },
        },
        ensureError(error),
      );
      alert("Network error during job processing");
    } finally {
      setIsProcessingJobs(false);
    }
  };

  const handleLoadInsights = async (): Promise<void> => {
    try {
      const response = await fetch("/api/calendar/insights");
      if (response.ok) {
        const result = (await response.json()) as { insights?: Record<string, unknown> };
        alert(`Insights loaded: ${Object.keys(result.insights ?? {}).length} categories available`);
      } else {
        alert("Failed to load insights");
      }
    } catch (error) {
      await logger.error(
        "insights_loading_failed",
        {
          operation: "load_insights",
          additionalData: { component: "OmniRhythmPage" },
        },
        ensureError(error),
      );
      alert("Network error during insights loading");
    }
  };

  // Initialize calendar status and clients
  useEffect(() => {
    void data.checkCalendarStatus();
    void data.fetchClients();
  }, [data, data.checkCalendarStatus, data.fetchClients]);

  // Debug logging (development only) - commented out to reduce noise
  // Uncomment only when debugging calendar issues
  /*
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      void logger.debug("omni_rhythm_page_stats", {
        operation: "debug_logging",
        additionalData: {
          component: "OmniRhythmPage",
          stats: data.stats,
          allEventsCount: data.allEvents?.length ?? 0,
          upcomingEventsCount: bi.upcomingEvents?.length ?? 0,
          biService: data.biService,
          clientsCount: data.clients?.length ?? 0,
          firstUpcomingEvent: bi.upcomingEvents?.[0],
        },
      });
    }
  }, [data.stats, data.allEvents, bi.upcomingEvents, data.biService, data.clients]);
  */

  // If calendar is not connected, show only the connection screen
  if (!data.isConnected) {
    return (
      <CalendarConnectionCard
        isConnected={data.isConnected}
        isConnecting={data.isConnecting}
        isSyncing={data.isSyncing}
        isEmbedding={data.isEmbedding}
        isProcessingJobs={isProcessingJobs}
        upcomingEventsCount={data.stats?.upcomingEventsCount ?? 0}
        lastSync={data.stats?.lastSync ?? undefined}
        error={data.error}
        onConnect={data.connectCalendar}
        onReconnect={data.connectCalendar}
        onSync={data.syncCalendar}
        onProcessJobs={handleProcessJobs}
        onGenerateEmbeddings={handleGenerateEmbeddings}
        onLoadInsights={handleLoadInsights}
      />
    );
  }

  // If calendar is connected, show the dashboard with calendar status in the top grid
  return (
    <div className="space-y-6">
      {/* Intelligence Dashboard Section */}
      <div className="space-y-6">
        {/* Compact Cards Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Upcoming Sessions - Enhanced Card */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Upcoming Sessions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bi.upcomingEvents &&
                Array.isArray(bi.upcomingEvents) &&
                bi.upcomingEvents.length > 0 ? (
                  <>
                    {bi.upcomingEvents.map((event: CalendarEvent, index: number) => {
                      try {
                        // Helper function to get display category
                        const getDisplayCategory = (event: CalendarEvent): string => {
                          if (event.businessCategory) {
                            return (
                              event.businessCategory.charAt(0).toUpperCase() +
                              event.businessCategory.slice(1)
                            );
                          }
                          if (event.eventType) {
                            switch (event.eventType) {
                              case "consultation":
                                return "Consultation";
                              case "workshop":
                                return "Workshop";
                              case "class":
                                return "Class";
                              case "massage":
                                return "Massage";
                              case "yoga":
                                return "Yoga";
                              default:
                                return (
                                  event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)
                                );
                            }
                          }
                          return "Session";
                        };

                        return (
                          <div
                            key={event.id ?? index}
                            className="border rounded-lg p-3 bg-background"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div
                                  className={`w-3 h-3 rounded-full ${
                                    event.businessInsights?.isHighValue
                                      ? "bg-green-600"
                                      : event.businessInsights?.requiresPreparation
                                        ? "bg-yellow-600"
                                        : "bg-blue-600"
                                  }`}
                                ></div>
                                <Badge
                                  variant={
                                    event.businessInsights?.isHighValue ? "default" : "secondary"
                                  }
                                  className="text-xs"
                                >
                                  {getDisplayCategory(event)}
                                </Badge>
                              </div>
                              {event.clientContext?.estimatedRevenue && (
                                <span className="text-sm font-medium text-green-600">
                                  ${event.clientContext.estimatedRevenue}
                                </span>
                              )}
                            </div>

                            <div className="mb-2">
                              <p className="text-sm font-medium leading-tight">
                                {event.title ?? "Untitled Event"}
                              </p>
                              {event.clientContext?.clientName && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Client: {event.clientContext.clientName}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                {event.startTime
                                  ? new Date(event.startTime).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    }) +
                                    " " +
                                    new Date(event.startTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "TBD"}
                              </span>
                              {event.businessInsights?.requiresPreparation && (
                                <span className="text-yellow-600 font-medium">Prep Required</span>
                              )}
                            </div>

                            {event.clientContext?.notes && (
                              <p className="text-xs text-muted-foreground italic mt-2 border-t pt-2">
                                {event.clientContext.notes}
                              </p>
                            )}
                          </div>
                        );
                      } catch (error) {
                        void logger.error(
                          "bi_event_render_failed",
                          {
                            operation: "render_bi_event",
                            additionalData: {
                              component: "OmniRhythmPage",
                              eventIndex: index,
                              event,
                            },
                          },
                          ensureError(error),
                        );
                        return (
                          <div key={index} className="text-xs text-red-500 p-2 border rounded">
                            Error rendering event {index}:{" "}
                            {error instanceof Error ? error.message : String(error)}
                          </div>
                        );
                      }
                    })}
                    {data.stats?.upcomingEventsCount && data.stats.upcomingEventsCount > 5 && (
                      <p className="text-xs text-muted-foreground">
                        +{data.stats.upcomingEventsCount - 5} more sessions
                      </p>
                    )}
                  </>
                ) : data.stats?.upcomingEvents && data.stats.upcomingEvents.length > 0 ? (
                  <>
                    {data.stats.upcomingEvents
                      .slice(0, 5)
                      .map((event: CalendarEvent, index: number) => (
                        <div key={event.id ?? index} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[120px]">
                                {event.title ?? "Untitled Event"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {event.startTime
                                  ? new Date(event.startTime).toLocaleDateString([], {
                                      month: "short",
                                      day: "numeric",
                                    }) +
                                    " " +
                                    new Date(event.startTime).toLocaleTimeString([], {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "TBD"}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {event.eventType ?? "Session"}
                          </Badge>
                        </div>
                      ))}
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground">No upcoming sessions</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Events will appear here when you sync your calendar
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <QuickActions />

          {/* Calendar Connection Card */}
          <CalendarConnectionCard
            isConnected={data.isConnected}
            isConnecting={data.isConnecting}
            isSyncing={data.isSyncing}
            isEmbedding={data.isEmbedding}
            isProcessingJobs={isProcessingJobs}
            upcomingEventsCount={data.stats?.upcomingEventsCount ?? 0}
            lastSync={data.stats?.lastSync ?? undefined}
            syncStatus={data.syncStatus}
            error={data.error}
            onConnect={data.connectCalendar}
            onReconnect={data.connectCalendar}
            onSync={data.syncCalendar}
            onProcessJobs={handleProcessJobs}
            onGenerateEmbeddings={handleGenerateEmbeddings}
            onLoadInsights={handleLoadInsights}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="preparation">Preparation</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <TodayIntelligencePanel appointments={bi.enhancedAppointments} isLoading={false} />
          </TabsContent>

          <TabsContent value="preparation" className="space-y-6">
            <PreparationWorkflow
              upcomingAppointments={[
                {
                  id: "1",
                  title: "Deep Tissue Massage",
                  clientName: "Sarah Johnson",
                  date: "2024-01-20",
                  startTime: "2024-01-20T10:00:00Z",
                  endTime: "2024-01-20T11:30:00Z",
                  serviceType: "Deep Tissue Massage",
                  preparationTasks: [
                    {
                      id: "1",
                      title: "Review client intake form",
                      description: "Check for any medical conditions or preferences",
                      completed: false,
                      priority: "high" as const,
                      estimatedTime: 5,
                      category: "client" as const,
                    },
                  ],
                  clientNotes: "Sarah prefers firm pressure and has mentioned lower back tension.",
                  lastSessionNotes: "Focused on lower back and shoulders.",
                },
              ]}
              isLoading={false}
            />
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <WeeklyBusinessFlow
              appointments={bi.enhancedAppointments}
              weeklyStats={bi.weeklyStats}
              isLoading={false}
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <ClientSessionTimeline clients={data.clients} milestones={[]} isLoading={false} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
