"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Link, CheckCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CalendarConnectionCardProps } from "./types";

export function CalendarConnectionCard({
  isConnected,
  isConnecting,
  isSyncing,
  importedEventsCount,
  lastSync,
  error,
  onConnect,
  onSync,
  sessionsNext7Days = 0,
  sessionsThisMonth = 0,
}: CalendarConnectionCardProps): JSX.Element {
  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Connect Your Google Calendar</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <Button onClick={onConnect} disabled={isConnecting} size="lg">
            <Link className="h-4 w-4 mr-2" />
            {isConnecting ? "Connecting..." : "Connect Google Calendar"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            Google Calendar Connected
          </CardTitle>
          <Badge
            variant="outline"
            className="cursor-pointer hover:bg-accent transition-colors px-2 py-1"
            onClick={onSync}
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {/* Connected Status and Last Sync */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Last Sync</span>
            <Badge variant="outline" className="text-xs">
              {lastSync ? format(new Date(lastSync), "MMM d, yyyy HH:mm") : "—"}
            </Badge>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Metrics Section */}
        <div className="space-y-2">
          {/* Total Events Imported */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Events Imported</span>
            <Badge variant="outline" className="text-xs">
              {typeof importedEventsCount === "number" ? importedEventsCount : 0}
            </Badge>
          </div>

          {/* Sessions in Next 7 Days */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sessions in Next 7 Days</span>
            <Badge variant="outline" className="text-xs">
              {sessionsNext7Days}
            </Badge>
          </div>

          {/* Sessions This Month */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Sessions This Month</span>
            <Badge variant="outline" className="text-xs">
              {sessionsThisMonth}
            </Badge>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error.includes("authentication expired") || error.includes("invalid_grant")
                ? "Authentication error. Please reconnect your calendar."
                : error.includes("token_expired")
                  ? "Calendar token expired. Please reconnect your calendar."
                  : error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
