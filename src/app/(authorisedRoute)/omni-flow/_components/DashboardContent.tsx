"use client";

import {
  AlertCircle,
  ArrowRight,
  Clock,
  Users,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/api/client";
import { useQuery } from "@tanstack/react-query";
import { type Contact, type ContactListResponse } from "@/server/db/business-schemas/contacts";
import { useSyncStatus } from "@/hooks/use-sync-status";

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
  // Fetch contacts data (recent first)
  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", "dashboard", "recent"],
    queryFn: async (): Promise<ContactListResponse> => {
      const params = new URLSearchParams({
        page: "1",
        pageSize: "50",
        sort: "createdAt",
        order: "desc",
      });
      return apiClient.get<ContactListResponse>(`/api/contacts?${params.toString()}`);
    },
    staleTime: 30_000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    networkMode: "online",
  });
  const contacts: Contact[] = data?.items ?? [];

  const {
    data: sync,
    isLoading: syncLoading,
    refetch: refetchSync,
    isFetching: syncFetching,
  } = useSyncStatus();

  // Debug: Log the sync data
  console.log("[Dashboard] Sync status data:", sync);

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
  const totalContacts = data?.pagination?.total ?? contacts.length;

  return (
    <div className="py-6">
      <div className="flex flex-col space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome to your contact management system</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Future Quick Links - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Quick links to common actions (Coming Soon)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-sm text-muted-foreground space-y-1">
                <p>• Add a new client</p>
                <p>• Add tasks to Projects Inbox</p>
                <p>• Schedule a new appointment</p>
                <p>• Create a follow-up reminder</p>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                These quick actions will be available once the respective features are implemented.
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Total Contacts */}
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

          {/* Card 3: Google Services Sync Status */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Google Services</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchSync()}
                disabled={syncFetching}
                className="h-8 w-8 p-0"
                title="Refresh sync status"
              >
                <RefreshCw className={`h-4 w-4 ${syncFetching ? "animate-spin" : ""}`} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {syncLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (
                <div className="space-y-3">
                  {/* Gmail Status */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Gmail</div>
                      <div
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          sync?.gmail?.connected
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {sync?.gmail?.connected ? "Connected" : "Not Connected"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sync?.gmail?.lastSync
                        ? `Last synced: ${new Date(sync.gmail.lastSync).toLocaleDateString()} at ${new Date(sync.gmail.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Never synced"}
                    </div>
                  </div>

                  {/* Calendar Status */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">Calendar</div>
                      <div
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          sync?.calendar?.connected
                            ? "bg-green-100 text-green-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {sync?.calendar?.connected ? "Connected" : "Not Connected"}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {sync?.calendar?.lastSync
                        ? `Last synced: ${new Date(sync.calendar.lastSync).toLocaleDateString()} at ${new Date(sync.calendar.lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                        : "Never synced"}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Contacts Section */}
        <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Contacts</CardTitle>
                <CardDescription>Your most recently added contacts</CardDescription>
              </CardHeader>
              <CardContent>
                {contacts && contacts.length > 0 ? (
                  <div className="rounded-md border">
                    <div className="grid grid-cols-1 divide-y">
                      {contacts.slice(0, 5).map((contact: Contact) => {
                        // Type guards for strict safety
                        const id =
                          typeof contact.id === "string" || typeof contact.id === "number"
                            ? String(contact.id)
                            : undefined;
                        const displayName =
                          typeof contact.displayName === "string" ? contact.displayName : "";
                        // Contact doesn't have profileImageUrl property
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
                              {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{displayName}</p>
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
                      Get started by adding your first contact from the Contacts page.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}
