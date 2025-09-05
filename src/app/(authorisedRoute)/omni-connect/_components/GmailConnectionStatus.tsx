import type { JSX } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, RefreshCw, Mail, Settings } from "lucide-react";
import { format } from "date-fns";
import { GmailConnectionStatus as StatusType, JobStatus } from "./types";

interface GmailConnectionStatusProps {
  status: StatusType;
  jobStatus: JobStatus | null;
  isLoadingJobStatus: boolean;
  isSyncing: boolean;
  isProcessingContacts: boolean;
  isEmbedding: boolean;
  onSync: () => void;
  onRunJobProcessor: () => void;
  onProcessContacts: () => void;
  onGenerateEmbeddings: () => void;
  onSettings?: () => void;
  onRefreshJobStatus: () => void;
}

export function GmailConnectionStatus({
  status,
  jobStatus,
  isLoadingJobStatus,
  isProcessingContacts,
  onProcessContacts,
  onSettings,
  onRefreshJobStatus,
}: Omit<
  GmailConnectionStatusProps,
  "isSyncing" | "isEmbedding" | "onSync" | "onRunJobProcessor" | "onGenerateEmbeddings"
>): JSX.Element {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Gmail Connected
        </CardTitle>
        <CardDescription>Your Gmail is synced for client communication tracking</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={onProcessContacts}
              disabled={isProcessingContacts}
              variant="outline"
              size="sm"
            >
              <Mail className={`h-4 w-4 mr-2 ${isProcessingContacts ? "animate-spin" : ""}`} />
              {isProcessingContacts ? "Processing..." : "Process Contacts"}
            </Button>
            {onSettings && (
              <Button onClick={onSettings} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            )}
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Emails Processed</span>
              <Badge variant="secondary">{status.emailCount ?? 0}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Contacts Found</span>
              <Badge variant="secondary">{status.contactCount ?? 0}</Badge>
            </div>
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
                  <RefreshCw className={`h-3 w-3 ${isLoadingJobStatus ? "animate-spin" : ""}`} />
                </Button>
              </div>
              {jobStatus.jobs?.length ? (
                <div className="space-y-1">
                  {jobStatus.jobs.slice(0, 3).map((job, index) => (
                    <div key={job?.id ?? index} className="flex justify-between text-xs">
                      <span className="truncate">{job?.kind ?? "Unknown"}</span>
                      <Badge
                        variant={
                          job?.status === "completed"
                            ? "default"
                            : job?.status === "running"
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
                      >
                        {job?.status ?? "unknown"}
                      </Badge>
                    </div>
                  ))}
                  {jobStatus.jobs.length > 3 && (
                    <p className="text-xs text-muted-foreground">
                      ... and {jobStatus.jobs.length - 3} more
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No jobs found</p>
              )}
            </div>
          )}

          {/* Last Sync */}
          {status.lastSync && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Last Sync</span>
              <span className="text-sm">{format(new Date(status.lastSync), "MMM d, HH:mm")}</span>
            </div>
          )}

          {/* Error Display */}
          {status.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <span className="text-sm text-red-700">{status.error}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
