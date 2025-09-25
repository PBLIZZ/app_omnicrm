"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/observability";
import { useToast } from "@/hooks/use-toast";

// New hooks following OmniConnect pattern
import { useCalendarData } from "@/hooks/useCalendarData";
import { useCalendarIntelligence } from "@/hooks/useCalendarIntelligence";
import { useCalendarConnection } from "@/hooks/useCalendarConnection";
import { useCalendarSync } from "@/hooks/useCalendarSync";

// Components - Used in Main Dashboard
import { TodayIntelligencePanel } from "@/app/(authorisedRoute)/omni-rhythm/_components/TodayIntelligencePanel";
import { WeeklyBusinessFlow } from "@/app/(authorisedRoute)/omni-rhythm/_components/WeeklyBusinessFlow";
import { PreparationWorkflow } from "@/app/(authorisedRoute)/omni-rhythm/_components/PreparationWorkflow";

// Custom Components
import { CalendarConnectionCard } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarConnectionCard";
import { CalendarSyncSetup } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarSyncSetup";
import { CalendarConnectionPrompt } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarConnectionPrompt";
import { RhythmHeader } from "@/app/(authorisedRoute)/omni-rhythm/_components/RhythmHeader";
import { ensureError } from "@/lib/utils/error-handler";
import { post, get } from "@/lib/api/client";

export function OmniRhythmPage(): JSX.Element {
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState("insights");
  const { toast } = useToast();

  // New clean hook structure following OmniConnect pattern
  const { events, clients, connectionStatus, isEventsLoading, isClientsLoading } =
    useCalendarData();
  const { enhancedAppointments, weeklyStats, sessionMetrics } = useCalendarIntelligence(
    events,
    clients,
  );
  const { connect, isConnecting, error: connectionError } = useCalendarConnection();
  const { syncCalendar, isSyncing } = useCalendarSync();

  const handleLoadInsights = async (): Promise<void> => {
    try {
      const result = await get<{ insights?: Record<string, unknown> }>(
        "/api/google/calendar/insights",
      );
      toast({
        title: "Insights Loaded",
        description: `${Object.keys(result.insights ?? {}).length} categories available`,
      });
    } catch (error) {
      await logger.error(
        "insights_loading_failed",
        {
          operation: "load_insights",
          additionalData: { component: "OmniRhythmPage" },
        },
        ensureError(error),
      );
      toast({
        title: "Error",
        description: "Network error during insights loading",
        variant: "destructive",
      });
    }
  };

  const handleProcessJobs = async (): Promise<void> => {
    try {
      const response = await post<{
        success: boolean;
        message: string;
        processed: number;
        succeeded: number;
        failed: number;
      }>("/api/jobs/process", {});

      if (response.success) {
        toast({
          title: "Job Processing Completed",
          description: `Processed: ${response.processed}, Succeeded: ${response.succeeded}, Failed: ${response.failed}`,
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to process jobs",
          variant: "destructive",
        });
      }
    } catch (error) {
      await logger.error(
        "job_processing_failed",
        {
          operation: "process_jobs",
          additionalData: { component: "OmniRhythmPage" },
        },
        ensureError(error),
      );
      toast({
        title: "Error",
        description: "Network error during job processing",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (query: string): void => {
    // TODO: Implement search functionality
    void logger.debug("Search initiated", {
      operation: "search",
      component: "OmniRhythmPage",
      additionalData: { query },
    });
  };

  // Connection status - derived from data hook
  const isConnected = connectionStatus?.isConnected ?? false;
  const hasCheckedConnection = connectionStatus !== undefined;

  // If we need to run initial import, show setup step regardless of connection
  const step = searchParams.get("step");
  if (step === "calendar-sync") {
    return <CalendarSyncSetup />;
  }

  // If calendar is not connected AND we've checked the connection, show the Connect Your Calendar screen
  if (!isConnected && hasCheckedConnection) {
    return (
      <CalendarConnectionPrompt
        onConnect={connect}
        isConnecting={isConnecting}
        error={connectionError}
      />
    );
  }

  // If calendar is connected, show the dashboard with calendar status in the top grid
  return (
    <div className="container mx-auto p-6 space-y-6">
      <RhythmHeader
        onLoadInsights={handleLoadInsights}
        onProcessJobs={handleProcessJobs}
        onSearch={handleSearch}
      />

      {/* Top Status Row - New Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        {/* Business Intelligence Card (moved from tab content) */}
        <div className="lg:col-span-2 flex">
          <div className="w-full">
            <TodayIntelligencePanel
              appointments={enhancedAppointments}
              isLoading={isEventsLoading}
            />
          </div>
        </div>

        {/* Calendar Intelligence Layer */}
        <div className="lg:col-span-1 flex">
          <Card className="w-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Calendar Intelligence Layer</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">User Interface Approach:</p>
              <ul className="mt-2 text-sm list-disc pl-4 text-muted-foreground space-y-1">
                <li>Today&apos;s Intelligence Panel</li>
                <li>Weekly Business Flow</li>
                <li>Client Session Timeline</li>
                <li>Revenue Rhythm</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Calendar Connection Card (moved to end) */}
        <div className="lg:col-span-1 flex">
          <div className="w-full">
            <CalendarConnectionCard
              isConnected={isConnected}
              isConnecting={isConnecting}
              isSyncing={isSyncing}
              importedEventsCount={events.length}
              lastSync={connectionStatus?.lastSync}
              error={connectionError}
              onConnect={connect}
              onSync={syncCalendar}
              sessionsNext7Days={sessionMetrics.sessionsNext7Days}
              sessionsThisMonth={sessionMetrics.sessionsThisMonth}
            />
          </div>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="prep">Prep</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <WeeklyBusinessFlow
            appointments={enhancedAppointments}
            weeklyStats={weeklyStats}
            isLoading={isEventsLoading || isClientsLoading}
          />
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Availability management coming soon...</p>
          </div>
        </TabsContent>

        <TabsContent value="prep" className="space-y-6">
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
      </Tabs>
    </div>
  );
}
