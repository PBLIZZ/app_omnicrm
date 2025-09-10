"use client";

import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Clock,
  Plus,
  Users,
  Activity,
  CheckSquare,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchContacts } from "@/lib/services/client/contacts.service";
import type { ContactDTO } from "@/lib/validation/schemas/omniClients";
import MonthlySessionsKpi from "./MonthlySessionsKpi";
import { getSyncStatus } from "@/lib/services/client/sync.service";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Avatar,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui";

// UI Components

// Format date helper
const formatDate = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

export default function DashboardContent(): JSX.Element {
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch contacts data (recent first)
  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", "dashboard", "recent"],
    queryFn: () => fetchContacts({ page: 1, pageSize: 50, sort: "createdAt", order: "desc" }),
    staleTime: 30_000,
  });
  const contacts: ContactDTO[] = data?.items ?? [];

  const { data: sync, isLoading: syncLoading } = useQuery({
    queryKey: ["sync", "status"],
    queryFn: getSyncStatus,
    staleTime: 15_000,
  });

  // Loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-2 border-current border-t-transparent text-primary"></div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load dashboard data: {error instanceof Error ? error.message : String(error)}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate stats
  const totalContacts = data?.total ?? contacts.length;
  const recentActivity = 5; // Mock data - replace with actual count
  const upcomingTasks = 3; // Mock data - replace with actual count

  return (
    <div className="py-6">
      <div className="flex flex-col space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to your contact management system</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalContacts}</div>
              <p className="text-xs text-muted-foreground">
                {totalContacts === 1 ? "1 contact" : `${totalContacts} contacts`} in your CRM
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href="/contacts"
                className="text-xs text-blue-600 hover:underline flex items-center"
              >
                View all contacts
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Welcome to OmniCRM</CardTitle>
              <CardDescription>
                Your contact management system is ready. Add contacts, sync with Google services,
                and track your interactions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/contacts/new">Add First Contact</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Sync Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-2">
              {syncLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Gmail</div>
                      <div
                        className={`text-xs ${sync?.serviceTokens?.gmail ? "text-green-600" : "text-amber-600"}`}
                      >
                        {sync?.serviceTokens?.gmail ? "Connected" : "Not connected"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last sync: {formatDate(sync?.lastSync?.gmail)}{" "}
                      {sync?.lastSync?.gmail && new Date(sync.lastSync.gmail).toLocaleTimeString()}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Calendar</div>
                      <div
                        className={`text-xs ${sync?.serviceTokens?.calendar ? "text-green-600" : "text-amber-600"}`}
                      >
                        {sync?.serviceTokens?.calendar ? "Connected" : "Not connected"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last sync: {formatDate(sync?.lastSync?.calendar)}{" "}
                      {sync?.lastSync?.calendar &&
                        new Date(sync.lastSync.calendar).toLocaleTimeString()}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{recentActivity}</div>
              <p className="text-xs text-muted-foreground">
                {recentActivity} activities in the last 7 days
              </p>
            </CardContent>
            <CardFooter>
              <Link href="#" className="text-xs text-blue-600 hover:underline flex items-center">
                View activity log
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
              <CheckSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{upcomingTasks}</div>
              <p className="text-xs text-muted-foreground">
                {upcomingTasks} tasks scheduled for this week
              </p>
            </CardContent>
            <CardFooter>
              <Link href="#" className="text-xs text-blue-600 hover:underline flex items-center">
                View all tasks
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </CardFooter>
          </Card>

          <MonthlySessionsKpi />
        </div>

        {/* Tabs for different dashboard sections */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="recent">Recent Contacts</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and shortcuts</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                  asChild
                >
                  <Link href="/contacts">
                    <Users className="h-6 w-6 mb-2" />
                    <span>View Contacts</span>
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                  disabled
                >
                  <Calendar className="h-6 w-6 mb-2" />
                  <span>Schedule Task</span>
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>System Status</CardTitle>
                <CardDescription>Current system information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Database</span>
                  <span className="text-sm text-green-600">Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">API</span>
                  <span className="text-sm text-green-600">Operational</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last Backup</span>
                  <span className="text-sm">Today, 03:45 AM</span>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recent Contacts Tab */}
          <TabsContent value="recent" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle>Recent Contacts</CardTitle>
                  <CardDescription>Your most recently added contacts</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/contacts?new=true">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Contact
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                {contacts && contacts.length > 0 ? (
                  <div className="rounded-md border">
                    <div className="grid grid-cols-1 divide-y">
                      {contacts.slice(0, 5).map((contact: ContactDTO) => {
                        // Type guards for strict safety
                        const id =
                          typeof contact.id === "string" || typeof contact.id === "number"
                            ? String(contact.id)
                            : undefined;
                        const fullName =
                          typeof contact.displayName === "string" ? contact.displayName : "";
                        // ContactDTO doesn't have profileImageUrl property
                        const avatarUrl: string | undefined = undefined;
                        const email =
                          typeof contact.primaryEmail === "string" ? contact.primaryEmail : "";
                        const createdAt =
                          typeof contact.createdAt === "string" ? contact.createdAt : undefined;
                        if (!id) return null;
                        return (
                          <Link
                            key={id}
                            href={`/contacts/${id}`}
                            className="flex items-center p-4 hover:bg-muted/50 transition-colors"
                          >
                            <Avatar className="h-10 w-10 mr-4">
                              {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{fullName}</p>
                              <p className="text-sm text-muted-foreground truncate">{email}</p>
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatDate(createdAt)}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Users className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">No contacts found</h3>
                    <p className="text-muted-foreground mt-1">
                      Get started by adding your first contact.
                    </p>
                    <Button className="mt-4" asChild>
                      <Link href="/contacts?new=true">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/contacts">
                    View All Contacts
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Your latest actions and system events</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="absolute left-3 top-0 bottom-0 w-px bg-muted-foreground/20"></div>
                  <div className="space-y-6 ml-6">
                    {/* Mock activity items - replace with actual data */}
                    <div className="relative">
                      <div className="absolute -left-9 top-1 h-4 w-4 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Contact Added</p>
                        <p className="text-sm text-muted-foreground">
                          You added a new contact: Jane Smith
                        </p>
                        <p className="text-xs text-muted-foreground">Today, 10:30 AM</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-9 top-1 h-4 w-4 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Contact Updated</p>
                        <p className="text-sm text-muted-foreground">
                          You updated contact details: John Doe
                        </p>
                        <p className="text-xs text-muted-foreground">Yesterday, 3:45 PM</p>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute -left-9 top-1 h-4 w-4 rounded-full bg-primary"></div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">System Update</p>
                        <p className="text-sm text-muted-foreground">
                          System backup completed successfully
                        </p>
                        <p className="text-xs text-muted-foreground">Yesterday, 1:15 AM</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled>
                  View Full Activity Log
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Enhanced Dashboard Section - New Features */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Enhanced Dashboard Features</CardTitle>
            <CardDescription>Additional analytics and KPIs for improved insight</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* New Analytics Cards */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Activity className="h-4 w-4 text-blue-500" />
                  <h4 className="font-medium">Engagement Score</h4>
                </div>
                <div className="text-2xl font-bold">85%</div>
                <p className="text-sm text-muted-foreground">Average contact engagement</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-green-500" />
                  <h4 className="font-medium">This Week</h4>
                </div>
                <div className="text-2xl font-bold">{upcomingTasks}</div>
                <p className="text-sm text-muted-foreground">Scheduled activities</p>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckSquare className="h-4 w-4 text-purple-500" />
                  <h4 className="font-medium">Completed</h4>
                </div>
                <div className="text-2xl font-bold">12</div>
                <p className="text-sm text-muted-foreground">Tasks this month</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
