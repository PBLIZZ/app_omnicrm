"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  RefreshCw,
  Link,
  CheckCircle,
  AlertCircle,
  Brain,
  Search,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { TodayIntelligencePanel } from "./_components/TodayIntelligencePanel";
import { WeeklyBusinessFlow } from "./_components/WeeklyBusinessFlow";
import { ClientSessionTimeline } from "./_components/ClientSessionTimeline";
import { PreparationWorkflow } from "./_components/PreparationWorkflow";
import { CalendarBusinessIntelligence } from "./_components/CalendarBusinessIntelligence";

interface CalendarEventData {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  eventType?: string;
  businessCategory?: string;
  attendees?: Array<{ email: string; name?: string }>;
}

interface CalendarStats {
  upcomingEventsCount: number;
  upcomingEvents: CalendarEventData[];
  lastSync: string | null;
}

export default function CalendarPage(): JSX.Element {
  // Google Calendar Integration State
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ event: CalendarEventData; similarity: number; preview: string }>
  >([]);
  const [insights, setInsights] = useState<{
    patterns?: string[];
    busyTimes?: string[];
    recommendations?: string[];
    clientEngagement?: string[];
  } | null>(null);
  const [stats, setStats] = useState<CalendarStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Business Intelligence Services
  const [biService] = useState(() => {
    // Initialize with mock client data for demonstration
    const mockClients = [
      {
        id: "1",
        name: "Sarah Johnson",
        email: "sarah.j@example.com",
        totalSessions: 8,
        totalSpent: 640,
        lastSessionDate: "2024-01-15",
        status: "active" as const,
        satisfaction: 5,
        preferences: {
          preferredTimes: ["Morning", "Tuesday"],
          preferredServices: ["Deep Tissue Massage"],
          goals: ["Stress relief", "Improved posture"],
        },
      },
      {
        id: "2",
        name: "Mike Chen",
        email: "mike.chen@example.com",
        totalSessions: 3,
        totalSpent: 240,
        lastSessionDate: "2024-01-10",
        status: "active" as const,
        satisfaction: 4,
        preferences: {
          preferredTimes: ["Afternoon"],
          preferredServices: ["Sports Massage"],
          goals: ["Recovery", "Performance"],
        },
      },
      {
        id: "3",
        name: "Emma Davis",
        email: "emma.d@example.com",
        totalSessions: 12,
        totalSpent: 960,
        lastSessionDate: "2023-12-20",
        status: "inactive" as const,
        satisfaction: 3,
        preferences: {
          preferredTimes: ["Evening"],
          preferredServices: ["Relaxation Massage"],
          goals: ["Better sleep", "Pain relief"],
        },
      },
    ];

    const service = new CalendarBusinessIntelligence();
    service.updateClientData(mockClients);
    return service;
  });

  const getEventTypeColor = (eventType?: string): string => {
    switch (eventType) {
      case "class":
        return "bg-blue-100 text-blue-800";
      case "workshop":
        return "bg-purple-100 text-purple-800";
      case "consultation":
        return "bg-green-100 text-green-800";
      case "appointment":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  useEffect(() => {
    void checkCalendarStatus();
  }, []);

  const checkCalendarStatus = async (): Promise<void> => {
    try {
      const response = await fetch("/api/calendar/sync");
      if (response.ok) {
        const data = (await response.json()) as CalendarStats;
        setStats(data);
        setIsConnected(true);
      } else if (response.status === 500) {
        // Calendar not connected yet
        setIsConnected(false);
      }
    } catch {
      // Error checking calendar status
    }
  };

  const connectCalendar = async (): Promise<void> => {
    setIsConnecting(true);
    setError(null);
    try {
      // Simplest, secure flow: full-page redirect to server OAuth start
      window.location.href = "/api/google/calendar/oauth";
    } catch {
      setIsConnecting(false);
      setError("Failed to start Google OAuth");
    }
  };


  const syncCalendar = async (): Promise<void> => {
    setIsSyncing(true);
    setError(null);

    try {
      await fetchPost<{ message: string }>("/api/calendar/sync", {}, {
        showErrorToast: false
      });
      // Sync successful
      await checkCalendarStatus(); // Refresh stats
    } catch (error) {
      // Network error during sync
      const errorMessage = error instanceof Error ? error.message : "Network error during sync";
      setError(errorMessage);
    } finally {
      setIsSyncing(false);
    }
  };

  const generateEmbeddings = async (): Promise<void> => {
    setIsEmbedding(true);
    setError(null);

    try {
      const data = await fetchPost<{ processedEvents: number }>("/api/calendar/embed", {}, {
        showErrorToast: false
      });
      // Embeddings generation successful
      alert(`Successfully generated embeddings for ${data.processedEvents} events!`);
    } catch (error) {
      // Network error during embedding generation
      const errorMessage = error instanceof Error ? error.message : "Network error during embedding generation";
      setError(errorMessage);
    } finally {
      setIsEmbedding(false);
    }
  };

  const searchEvents = async (): Promise<void> => {
    if (!searchQuery.trim()) return;

    try {
      const data = await fetchPost<{
        results?: Array<{ event: CalendarEventData; similarity: number; preview: string }>;
      }>("/api/calendar/search", { query: searchQuery, limit: 5 }, {
        showErrorToast: false
      });
      setSearchResults(data.results ?? []);
    } catch {
      // Search error - silently handle
    }
  };

  const loadInsights = async (): Promise<void> => {
    try {
      const response = await fetch("/api/calendar/insights");
      if (response.ok) {
        const data = (await response.json()) as {
          insights?: {
            patterns?: string[];
            busyTimes?: string[];
            recommendations?: string[];
            clientEngagement?: string[];
          };
        };
        setInsights(data.insights ?? null);
      }
    } catch {
      // Insights error - silently handle
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* INTEGRATED GOOGLE CALENDAR SYSTEM */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Omni Rhythm Integration</h1>
          <p className="text-muted-foreground">
            Sync your Google Calendar to track classes, appointments, and build client timelines
          </p>
        </div>
        {isConnected && (
          <div className="flex gap-2">
            <Button
              onClick={() => {
                syncCalendar().catch((error) => {
                  console.error("Failed to sync calendar:", error);
                  toast.error("Failed to sync calendar");
                });
              }}
              disabled={isSyncing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>
            <Button
              onClick={() => {
                generateEmbeddings().catch((error) => {
                  console.error("Failed to generate embeddings:", error);
                  toast.error("Failed to generate embeddings");
                });
              }}
              disabled={isEmbedding}
              variant="outline"
            >
              <Brain className={`h-4 w-4 mr-2 ${isEmbedding ? "animate-spin" : ""}`} />
              {isEmbedding ? "Embedding..." : "Generate AI Embeddings"}
            </Button>
            <Button
              onClick={() => {
                loadInsights().catch((error) => {
                  console.error("Failed to load insights:", error);
                  toast.error("Failed to load insights");
                });
              }}
              variant="outline"
            >
              <Zap className="h-4 w-4 mr-2" />
              Insights
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {!isConnected ? (
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle>Connect Your Google Calendar</CardTitle>
            <CardDescription>
              Sync your calendar to automatically track client attendance, build timelines, and gain
              insights into your practice rhythm.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <Users className="h-8 w-8 text-blue-600 mb-2" />
                  <h3 className="font-medium">Track Attendance</h3>
                  <p className="text-muted-foreground text-center">
                    Match calendar events with attendance data
                  </p>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <Clock className="h-8 w-8 text-green-600 mb-2" />
                  <h3 className="font-medium">Build Timelines</h3>
                  <p className="text-muted-foreground text-center">
                    Automatically update client history
                  </p>
                </div>
                <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                  <Calendar className="h-8 w-8 text-purple-600 mb-2" />
                  <h3 className="font-medium">AI Rhythm Insights</h3>
                  <p className="text-muted-foreground text-center">
                    Get smart recommendations for your practice
                  </p>
                </div>
              </div>
              <Button onClick={connectCalendar} disabled={isConnecting} size="lg">
                <Link className="h-4 w-4 mr-2" />
                {isConnecting ? "Connecting..." : "Connect Google Calendar"}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Connection Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                Connected
              </CardTitle>
              <CardDescription>Your Google Calendar is synced</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Upcoming Events</span>
                  <Badge variant="secondary">{stats?.upcomingEventsCount ?? 0}</Badge>
                </div>
                {stats?.lastSync && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Sync</span>
                    <span className="text-sm">
                      {format(new Date(stats.lastSync), "MMM d, HH:mm")}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Upcoming Events</CardTitle>
              <CardDescription>
                Your next calendar events with business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats?.upcomingEvents?.length ? (
                <div className="space-y-4">
                  {stats.upcomingEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium">{event.title}</h3>
                        <div className="flex gap-2">
                          {event.eventType && (
                            <Badge className={getEventTypeColor(event.eventType)}>
                              {event.eventType}
                            </Badge>
                          )}
                          {event.businessCategory && (
                            <Badge variant="outline">{event.businessCategory}</Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {format(new Date(event.startTime), "MMM d, HH:mm")} -
                          {format(new Date(event.endTime), "HH:mm")}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </div>
                        )}
                        {event.attendees && event.attendees.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {event.attendees.length} attendees
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No upcoming events found</p>
                  <p className="text-sm">Events will appear here after syncing</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Search & Insights */}
          {isConnected && (
            <>
              {/* Semantic Search */}
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5" />
                    Semantic Rhythm Search
                  </CardTitle>
                  <CardDescription>
                    Search your events using natural language (e.g., &ldquo;yoga classes with
                    Sarah&rdquo;, &ldquo;meetings last month&rdquo;)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-2 mb-4">
                    <input
                      type="text"
                      placeholder="Search your calendar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={(e) => e.key === "Enter" && searchEvents()}
                      className="flex-1 px-3 py-2 border rounded-md"
                    />
                    <Button onClick={searchEvents} disabled={!searchQuery.trim()}>
                      <Search className="h-4 w-4 mr-2" />
                      Search
                    </Button>
                  </div>

                  {searchResults.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="font-medium">Search Results:</h4>
                      {searchResults.map((result, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between">
                            <h5 className="font-medium">{result.event.title}</h5>
                            <Badge variant="secondary">
                              {Math.round(result.similarity * 100)}% match
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(result.event.startTime), "MMM d, yyyy HH:mm")}
                            {result.event.location && ` • ${result.event.location}`}
                          </div>
                          <div className="text-sm bg-gray-50 p-2 rounded">{result.preview}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI Insights */}
              {insights && (
                <Card className="lg:col-span-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      AI Rhythm Insights
                    </CardTitle>
                    <CardDescription>
                      Intelligent analysis of your patterns and business trends
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {insights.patterns && insights.patterns.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">📊 Patterns</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.patterns.map((pattern: string, index: number) => (
                              <li key={index} className="text-muted-foreground">
                                • {pattern}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {insights.busyTimes && insights.busyTimes.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">⏰ Busy Times</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.busyTimes.map((time: string, index: number) => (
                              <li key={index} className="text-muted-foreground">
                                • {time}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {insights.recommendations && insights.recommendations.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">💡 Recommendations</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-muted-foreground">
                                • {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {insights.clientEngagement && insights.clientEngagement.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">🤝 Client Engagement</h4>
                          <ul className="space-y-1 text-sm">
                            {insights.clientEngagement.map((engagement: string, index: number) => (
                              <li key={index} className="text-muted-foreground">
                                • {engagement}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Feature Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Coming Soon: Advanced Features</CardTitle>
          <CardDescription>The full calendar intelligence system will include:</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Attendance Matching</h4>
              <p className="text-sm text-muted-foreground">
                Upload class attendance lists to automatically update client timelines
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">AI Insights</h4>
              <p className="text-sm text-muted-foreground">
                Get recommendations on client engagement and class optimization
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Drive Integration</h4>
              <p className="text-sm text-muted-foreground">
                Sync attendance sheets from Google Drive automatically
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h4 className="font-medium mb-2">Email Correlation</h4>
              <p className="text-sm text-muted-foreground">
                Track email communications and link to calendar events
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OMNI RHYTHM INTELLIGENCE DASHBOARD */}
      <div className="mt-8 space-y-6">
        {/* Intelligence Dashboard Header */}
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Omni Rhythm Intelligence
          </h2>
          <p className="text-muted-foreground mt-2">
            Smart insights and workflow automation for your wellness practice
          </p>
        </div>

        {/* Intelligence Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's Intelligence Panel */}
          <div className="lg:col-span-2">
            <TodayIntelligencePanel
              appointments={biService.enhanceEvents(stats?.upcomingEvents || [])}
              isLoading={false}
            />
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button className="w-full justify-start" variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  New Client Session
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule Follow-up
                </Button>
                <Button className="w-full justify-start" variant="outline">
                  <Brain className="h-4 w-4 mr-2" />
                  Generate Insights
                </Button>
              </CardContent>
            </Card>

            {/* Business Metrics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Sessions</span>
                  <Badge variant="secondary">0</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Revenue</span>
                  <Badge variant="secondary">$0</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">New Clients</span>
                  <Badge variant="secondary">0</Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Preparation Workflow - Full Width */}
          <div className="lg:col-span-3">
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
                    {
                      id: "2",
                      title: "Prepare treatment room",
                      description: "Set up massage table and ensure clean linens",
                      completed: true,
                      priority: "medium" as const,
                      estimatedTime: 10,
                      category: "preparation" as const,
                    },
                    {
                      id: "3",
                      title: "Review previous session notes",
                      description: "Check what worked well and areas of focus",
                      completed: false,
                      priority: "medium" as const,
                      estimatedTime: 3,
                      category: "client" as const,
                    },
                  ],
                  clientNotes:
                    "Sarah prefers firm pressure and has mentioned lower back tension. She enjoys aromatherapy.",
                  lastSessionNotes:
                    "Focused on lower back and shoulders. Good progress on posture. Recommended daily stretches.",
                },
              ]}
              isLoading={false}
            />
          </div>
        </div>

        {/* Second Row - Timeline and Flow */}

        {/* Weekly Business Flow */}
        <WeeklyBusinessFlow
          appointments={biService.enhanceEvents(stats?.upcomingEvents || [])}
          weeklyStats={biService.calculateWeeklyStats(stats?.upcomingEvents || [])}
          isLoading={false}
        />

        {/* Client Session Timeline */}
        <ClientSessionTimeline
          clients={[
            {
              id: "1",
              name: "Sarah Johnson",
              email: "sarah.j@example.com",
              totalSessions: 8,
              totalSpent: 640,
              lastSessionDate: "2024-01-15",
              status: "active" as const,
              satisfaction: 5,
            },
            {
              id: "2",
              name: "Mike Chen",
              email: "mike.chen@example.com",
              totalSessions: 3,
              totalSpent: 240,
              lastSessionDate: "2024-01-10",
              status: "active" as const,
              satisfaction: 4,
            },
            {
              id: "3",
              name: "Emma Davis",
              email: "emma.d@example.com",
              totalSessions: 12,
              totalSpent: 960,
              lastSessionDate: "2023-12-20",
              status: "inactive" as const,
              satisfaction: 3,
            },
          ]}
          milestones={[]} // Will be populated with actual milestone data
          isLoading={false}
        />
      </div>
    </div>
  );
}
