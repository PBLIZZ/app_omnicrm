"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock,
  Plus,
  Users,
  Activity,
  RefreshCw,
  MessageSquare,
  FileText,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetchContacts } from "@/lib/api/contacts-api";
import { type ContactDTO } from "@omnicrm/contracts";
import MonthlySessionsKpi from "./MonthlySessionsKpi";
import { getSyncStatus } from "@/lib/api/sync.api";

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
    queryFn: () => apiFetchContacts({ page: 1, pageSize: 50, sort: "createdAt", order: "desc" }),
    staleTime: 30_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    networkMode: "online",
  });
  const contacts: ContactDTO[] = data?.items ?? [];

  const {
    data: sync,
    isLoading: syncLoading,
    refetch: refetchSync,
    isFetching: syncFetching,
  } = useQuery({
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
    console.error("[DashboardContent] Contact fetch error:", error);
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription className="space-y-2">
            <div>
              Failed to load dashboard data:{" "}
              {error instanceof Error ? error.message : String(error)}
            </div>
            {process.env.NODE_ENV === "development" && (
              <div className="mt-2 text-xs bg-red-50 p-2 rounded border">
                <div>Debug Info:</div>
                <div>• Check browser console for detailed logs</div>
                <div>• Verify Supabase connection</div>
                <div>• Check environment variables</div>
              </div>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate stats
  const totalContacts = data?.total ?? contacts.length;

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
                  <Link href="/contacts/new">
                    {totalContacts === 0 ? "Add First Contact" : "Add New Contact"}
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>

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

          {/* Sync Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sync Status</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSync()}
                disabled={syncFetching}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className={`h-4 w-4 ${syncFetching ? "animate-spin" : ""}`} />
              </Button>
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
                        className={`text-xs ${sync?.serviceTokens?.gmail ? "text-green-600" : "text-red-600"}`}
                      >
                        {sync?.serviceTokens?.gmail ? "Connected" : "Not connected"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last sync:{" "}
                      {sync?.lastSync?.gmail
                        ? `${formatDate(sync.lastSync.gmail)} ${new Date(sync.lastSync.gmail).toLocaleTimeString()}`
                        : "Never"}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Calendar</div>
                      <div
                        className={`text-xs ${sync?.serviceTokens?.calendar ? "text-green-600" : "text-red-600"}`}
                      >
                        {sync?.serviceTokens?.calendar ? "Connected" : "Not connected"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last sync:{" "}
                      {sync?.lastSync?.calendar
                        ? `${formatDate(sync.lastSync.calendar)} ${new Date(sync.lastSync.calendar).toLocaleTimeString()}`
                        : "Never"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
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
                  title="OmniConnect Weekly Digest - Coming Soon"
                >
                  <FileText className="h-6 w-6 mb-2" />
                  <span>Weekly Digest</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                  disabled
                  title="OmniRhythm Next Event - Coming Soon"
                >
                  <CalendarDays className="h-6 w-6 mb-2" />
                  <span>Next Event</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto flex flex-col items-center justify-center p-4 space-y-2"
                  disabled
                  title="OmniBot Chat History - Coming Soon"
                >
                  <MessageSquare className="h-6 w-6 mb-2" />
                  <span>Chat History</span>
                </Button>
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
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">Activity Tracking Coming Soon</h3>
                  <p className="text-muted-foreground mt-1 max-w-md">
                    We&apos;re working on implementing comprehensive activity tracking to show your
                    contact interactions, sync events, and system activities.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
