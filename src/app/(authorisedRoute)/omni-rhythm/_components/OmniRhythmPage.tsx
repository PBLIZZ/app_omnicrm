"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/observability";

import { Calendar, Zap, BookCheck } from "lucide-react";

// Hooks
import { useOmniRhythmData } from "@/hooks/useOmniRhythmData";
import { useBusinessIntelligence } from "@/hooks/useBusinessIntelligence";

// Components - Used in Main Dashboard
import { TodayIntelligencePanel } from "@/app/(authorisedRoute)/omni-rhythm/_components/TodayIntelligencePanel";
import { WeeklyBusinessFlow } from "@/app/(authorisedRoute)/omni-rhythm/_components/WeeklyBusinessFlow";
import { PreparationWorkflow } from "@/app/(authorisedRoute)/omni-rhythm/_components/PreparationWorkflow";

// Custom Components
import { CalendarConnectionCard } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarConnectionCard";
import { CalendarSyncSetup } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarSyncSetup";
import { RhythmHeader } from "@/app/(authorisedRoute)/omni-rhythm/_components/RhythmHeader";
import { ensureError } from "@/lib/utils/error-handler";
import { toAppointments } from "@/app/(authorisedRoute)/omni-rhythm/_components/types";

export function OmniRhythmPage(): JSX.Element {
  const searchParams = useSearchParams();
  // Use custom hooks for state management
  const data = useOmniRhythmData();
  const bi = useBusinessIntelligence(data.allEvents || []);
  const [activeTab, setActiveTab] = useState("insights");

  // Calculate session metrics
  const calculateSessionMetrics = (): { sessionsNext7Days: number; sessionsThisMonth: number } => {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const sessionsNext7Days =
      data.allEvents?.filter((event) => {
        if (!event.startTime) return false;
        const eventDate = new Date(event.startTime);
        return eventDate >= now && eventDate <= next7Days;
      }).length ?? 0;

    const sessionsThisMonth =
      data.allEvents?.filter((event) => {
        if (!event.startTime) return false;
        const eventDate = new Date(event.startTime);
        return eventDate >= startOfCurrentMonth && eventDate <= endOfCurrentMonth;
      }).length ?? 0;

    return { sessionsNext7Days, sessionsThisMonth };
  };

  const { sessionsNext7Days, sessionsThisMonth } = calculateSessionMetrics();

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

  const handleSearch = (query: string): void => {
    // TODO: Implement search functionality
    void logger.debug("Search initiated", {
      operation: "search",
      component: "OmniRhythmPage",
      additionalData: { query },
    });
  };

  // Initialize calendar status and clients
  useEffect(() => {
    void data.checkCalendarStatus();
    void data.fetchClients();
  }, [data]);

  // If we need to run initial import, show setup step regardless of connection
  const step = searchParams.get("step");
  if (step === "calendar-sync") {
    return <CalendarSyncSetup />;
  }

  // If calendar is not connected, show the Connect Your Calendar screen with preview
  if (!data.isConnected) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <RhythmHeader onLoadInsights={handleLoadInsights} onSearch={handleSearch} />

        <div className="space-y-8">
          {/* Main Connection Card */}
          <CalendarConnectionCard
            isConnected={data.isConnected}
            isConnecting={data.isConnecting}
            isSyncing={data.isSyncing}
            lastSync={data.stats?.lastSync ?? undefined}
            error={data.error}
            onConnect={data.connectCalendar}
            onSync={data.syncCalendar}
          />

          {/* Preview of what you can do once connected */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Upcoming Events Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Upcoming Sessions
                </CardTitle>
                <CardDescription>
                  See your upcoming appointments and sessions at a glance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Connect your calendar to see upcoming sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Business Intelligence Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  AI Insights
                </CardTitle>
                <CardDescription>
                  Get smart recommendations and business intelligence
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center py-8 text-muted-foreground">
                    <Zap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">AI insights will appear here after connecting</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Client Timeline Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <BookCheck className="h-5 w-5" />
                  Client Timeline
                </CardTitle>
                <CardDescription>Track client progress and session history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-center py-8 text-muted-foreground">
                    <BookCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">Client timelines will be built automatically</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // If calendar is connected, show the dashboard with calendar status in the top grid
  return (
    <div className="container mx-auto p-6 space-y-6">
      <RhythmHeader onLoadInsights={handleLoadInsights} onSearch={handleSearch} />

      {/* Top Status Row - New Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
        {/* Business Intelligence Card (moved from tab content) */}
        <div className="lg:col-span-2 flex">
          <div className="w-full">
            <TodayIntelligencePanel
              appointments={toAppointments(bi.enhancedAppointments)}
              isLoading={false}
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
              isConnected={data.isConnected}
              isConnecting={data.isConnecting}
              isSyncing={data.isSyncing}
              importedEventsCount={data.stats?.importedCount ?? 0}
              lastSync={data.stats?.lastSync ?? undefined}
              error={data.error}
              onConnect={data.connectCalendar}
              onSync={data.syncCalendar}
              sessionsNext7Days={sessionsNext7Days}
              sessionsThisMonth={sessionsThisMonth}
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
            appointments={toAppointments(bi.enhancedAppointments)}
            weeklyStats={bi.weeklyStats}
            isLoading={false}
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
