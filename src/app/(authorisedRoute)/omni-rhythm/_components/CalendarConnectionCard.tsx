"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  RefreshCw,
  Link,
  CheckCircle,
  BookCheck,
  Zap,
  RefreshCcw,
  Play,
  AlertCircle,
  Unlink,
} from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CalendarConnectionCardProps {
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  isEmbedding: boolean;
  isProcessingJobs?: boolean;
  upcomingEventsCount: number;
  lastSync?: string | null | undefined;
  syncStatus?: string;
  error?: string | null;
  onConnect: () => void;
  onReconnect?: () => void;
  onSync: () => void;
  onProcessJobs?: () => void;
  onGenerateEmbeddings?: () => void;
  onLoadInsights?: () => void;
}

export function CalendarConnectionCard({
  isConnected,
  isConnecting,
  isSyncing,
  isEmbedding,
  isProcessingJobs,
  upcomingEventsCount,
  lastSync,
  syncStatus,
  error,
  onConnect,
  onReconnect,
  onSync,
  onProcessJobs,
  onGenerateEmbeddings,
  onLoadInsights,
}: CalendarConnectionCardProps): JSX.Element {
  if (!isConnected) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Calendar className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Connect Your Google Calendar</CardTitle>
          <CardDescription>
            Sync your calendar to automatically track client attendance, build timelines, and gain
            insights into your wellness practice.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <CheckCircle className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-medium">Track Attendance</h3>
                <p className="text-muted-foreground text-center">
                  Match calendar events with attendance data
                </p>
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Calendar className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-medium">Build Timelines</h3>
                <p className="text-muted-foreground text-center">
                  Automatically update client history
                </p>
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Link className="h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-medium">AI Insights</h3>
                <p className="text-muted-foreground text-center">
                  Get smart recommendations for your practice
                </p>
              </div>
            </div>
            <Button onClick={onConnect} disabled={isConnecting} size="lg">
              <Link className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Google Calendar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Google Calendar Connected
        </CardTitle>
        <CardDescription>
          Your calendar is synced and providing business intelligence
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Connection Status */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Last Sync</span>
            </div>
            {lastSync && (
              <div className="text-xs text-muted-foreground">
                {format(new Date(lastSync), "MMM d yyyy, HH:mm")}
              </div>
            )}
          </div>

          {/* Sync Status */}
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Sync Status</div>
            <div className="flex items-center gap-2">
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <span
                className={`text-sm font-medium ${isSyncing ? "text-blue-600" : "text-green-600"}`}
              >
                {syncStatus ?? (isSyncing ? "Syncing..." : "Ready")}
              </span>
            </div>
          </div>
        </div>

        {/* Show upcoming events below */}
        <div className="mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-sky-600" />
            <span className="text-sm font-medium">Upcoming Events (within 30 days)</span>
            <div className="ml-auto">
              <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-bold text-white bg-sky-600 rounded-full">
                {upcomingEventsCount}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (error.includes("authentication expired") ?? error.includes("invalid_grant")) && (
          <Alert className="mt-4" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>Authentication error</span>
              <Button
                onClick={onReconnect ?? onConnect}
                size="sm"
                variant="outline"
                className="ml-2"
              >
                <Unlink className="h-3 w-3 mr-1" />
                Reconnect
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons - Single Vertical Stack */}
        <div className="mt-6 space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground mb-3">Actions</h4>

          <div className="space-y-2">
            <Button
              onClick={onSync}
              disabled={isSyncing}
              variant="outline"
              className="w-full justify-start"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Button>

            {onProcessJobs && (
              <Button
                onClick={onProcessJobs}
                disabled={isProcessingJobs}
                variant="outline"
                className="w-full justify-start"
              >
                <Play className={`h-4 w-4 mr-2 ${isProcessingJobs ? "animate-spin" : ""}`} />
                {isProcessingJobs ? "Processing..." : "Process Jobs"}
              </Button>
            )}

            {onGenerateEmbeddings && (
              <Button
                onClick={onGenerateEmbeddings}
                disabled={isEmbedding}
                variant="outline"
                className="w-full justify-start"
              >
                <BookCheck className={`h-4 w-4 mr-2 ${isEmbedding ? "animate-spin" : ""}`} />
                {isEmbedding ? "Embedding..." : "Generate AI Embeddings"}
              </Button>
            )}

            {onLoadInsights && (
              <Button onClick={onLoadInsights} variant="outline" className="w-full justify-start">
                <Zap className="h-4 w-4 mr-2" />
                Insights
              </Button>
            )}

            {/* Always show reconnect button in connected state */}
            <Button
              onClick={onReconnect ?? onConnect}
              variant="outline"
              className="w-full justify-start"
            >
              <Unlink className="h-4 w-4 mr-2" />
              Reconnect Calendar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
