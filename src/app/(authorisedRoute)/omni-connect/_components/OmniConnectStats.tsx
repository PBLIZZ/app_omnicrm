"use client";

import { CheckCircle, RefreshCw, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface GmailStats {
  emailsProcessed: number;
  suggestedContacts: number;
  lastSync: string | null;
  isConnected: boolean;
}

interface JobStatusResponse {
  id: string;
  kind: string;
  status: "queued" | "running" | "completed" | "error";
  progress?: number | undefined;
  message?: string | undefined;
  batchId?: string | undefined;
  createdAt: string;
  updatedAt: string;
  totalEmails?: number | undefined;
  processedEmails?: number | undefined;
  newEmails?: number | undefined;
  chunkSize?: number | undefined;
  chunksTotal?: number | undefined;
  chunksProcessed?: number | undefined;
}

interface JobStatus {
  jobs: JobStatusResponse[];
  currentBatch: string | null;
  totalEmails?: number;
  processedEmails?: number;
}

interface OmniConnectStatsProps {
  stats: GmailStats | null;
  jobStatus: JobStatus | null;
  isLoadingJobStatus: boolean;
  onRefreshJobStatus: () => void;
  onSettingsClick: () => void;
}

export function OmniConnectStats({
  stats,
  jobStatus,
  isLoadingJobStatus,
  onRefreshJobStatus,
  onSettingsClick,
}: OmniConnectStatsProps): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Gmail Connected
        </CardTitle>
        <CardDescription>
          Your Gmail is synced for client communication tracking
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Emails Processed</span>
              <Badge variant="secondary">{stats?.emailsProcessed || 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Suggested Contacts</span>
              <Badge variant="secondary">{stats?.suggestedContacts || 0}</Badge>
            </div>
            {stats?.lastSync && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Last Sync</span>
                <span className="text-sm">
                  {format(new Date(stats?.lastSync ?? ""), "MMM d, HH:mm")}
                </span>
              </div>
            )}
          </div>

          {/* Job Status */}
          {jobStatus && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Job Status</span>
                <Button
                  onClick={onRefreshJobStatus}
                  variant="ghost"
                  size="sm"
                  disabled={isLoadingJobStatus}
                >
                  <RefreshCw
                    className={`h-3 w-3 ${isLoadingJobStatus ? "animate-spin" : ""}`}
                  />
                </Button>
              </div>
              {(() => {
                const jobs = jobStatus?.jobs;
                if (jobs && jobs!.length > 0) {
                  return (
                    <div className="space-y-1">
                      {jobs!.slice(0, 3).map((job, index) => (
                        <div key={job.id || index} className="flex justify-between text-xs">
                          <span className="truncate">{job.kind ?? "Unknown"}</span>
                          <Badge
                            variant={
                              job.status === "completed"
                                ? "default"
                                : job.status === "running"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {job.status}
                          </Badge>
                        </div>
                      ))}
                      {jobs!.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          {jobs!.length - 3} more jobs running
                        </p>
                      )}
                    </div>
                  );
                }
                return <p className="text-xs text-muted-foreground">No active jobs</p>;
              })()}
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={onSettingsClick} variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
