"use client";

import type { JSX } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideCircleCheckBig, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";

interface GmailConnectionStatus {
  isConnected: boolean;
  lastSync?: string | undefined;
  emailCount?: number | undefined;
  contactCount?: number | undefined;
  error?: string | undefined;
}

interface ConnectConnectionStatusCardProps {
  status: GmailConnectionStatus;
  isSyncing?: boolean;
  onSyncNow?: () => void;
  lastSyncStats?: { inserted: number; processed: number } | null;
}

export function ConnectConnectionStatusCard({
  status,
  isSyncing = false,
  onSyncNow,
  lastSyncStats,
}: ConnectConnectionStatusCardProps): JSX.Element {
  return (
    <Card>
      <CardHeader className="pb-1">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2 text-green-600">
            <LucideCircleCheckBig className="h-4 w-4" />
            Gmail Connected
          </CardTitle>
          {onSyncNow && status.isConnected && (
            <Badge
              variant="outline"
              className="cursor-pointer hover:bg-accent transition-colors px-2 py-1"
              onClick={onSyncNow}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Syncing..." : "Sync Now"}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {status.isConnected ? (
          <>
            {/* Current Sync Results */}
            {lastSyncStats && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Emails Processed (This Sync)
                  </span>
                  <Badge variant="secondary">{lastSyncStats.processed.toLocaleString()}</Badge>
                </div>
              </div>
            )}

            {/* Total Emails Imported */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total Emails Imported</span>
              <Badge variant="outline">{status.emailCount?.toLocaleString() ?? "0"}</Badge>
            </div>

            {/* Last Sync */}
            {status.lastSync && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <Badge variant="outline">
                  {format(new Date(status.lastSync), "MMM d, yyyy HH:mm")}
                </Badge>
              </div>
            )}

            {/* Error Display */}
            {status.error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-700">{status.error}</span>
              </div>
            )}
          </>
        ) : (
          <div className="py-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Gmail not connected</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
