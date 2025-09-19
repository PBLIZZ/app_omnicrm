"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Download, Mail, Clock, Database } from "lucide-react";
import { toast } from "sonner";
import { post } from "@/lib/api/client";

interface SyncStats {
  totalFound: number;
  processed: number;
  inserted: number;
  errors: number;
  batchId: string;
}

export function GmailSyncSetup(): JSX.Element {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [progress, setProgress] = useState(0);

  const startSync = async (): Promise<void> => {
    setIsStarting(true);
    setProgress(0);

    try {
      toast.info("Starting Gmail sync...", {
        description: "This will import your emails from the last 365 days",
      });

      // Show indeterminate progress since we don't have real-time updates
      setProgress(-1); // Use -1 to indicate indeterminate progress

      const response = await post<{
        message: string;
        stats: SyncStats;
      }>("/api/google/gmail/sync-direct", {
        daysBack: 365,
      });

      // Only show 100% when actually complete
      setProgress(100);

      setSyncStats(response.stats);
      toast.success("Gmail sync completed!", {
        description: `Successfully imported ${response.stats.inserted} emails`,
      });

      // After 2 seconds, redirect to the main dashboard
      setTimeout(() => {
        router.push("/omni-connect");
      }, 2000);
    } catch (error) {
      toast.error("Gmail sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
      setProgress(0);
    } finally {
      setIsStarting(false);
    }
  };

  // Remove auto-start - user must manually confirm sync
  // useEffect(() => {
  //   if (!autoStarted && !isStarting && !syncStats) {
  //     setAutoStarted(true);
  //     void startSync();
  //   }
  // }, [autoStarted, isStarting, syncStats]);

  if (syncStats) {
    return (
      <div className="container mx-auto max-w-2xl p-6">
        <Card className="border-green-200 bg-green-50" data-testid="sync-summary">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-green-800">Sync Complete!</CardTitle>
            <CardDescription className="text-green-700">
              Your Gmail emails have been successfully imported
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm" data-testid="sync-results">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-green-600" />
                <span>Processed: {syncStats.processed}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Download className="h-4 w-4 text-green-600" />
                <span>Imported: {syncStats.inserted}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-green-600" />
                <span>Found: {syncStats.totalFound}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-600" />
                <span>Errors: {syncStats.errors}</span>
              </div>
            </div>
            <Progress value={100} className="w-full" />
          </CardContent>
          <CardFooter className="text-center">
            <p className="text-sm text-green-700">Redirecting to your dashboard...</p>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl p-6">
      <Card data-testid="preferences-modal">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Mail className="h-12 w-12 text-blue-600" />
          </div>
          <CardTitle>Gmail Connected Successfully!</CardTitle>
          <CardDescription>Now let&apos;s import your emails to get started</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isStarting && (
            <div className="space-y-4" data-testid="sync-progress-modal">
              {progress === -1 ? (
                <div className="w-full bg-muted rounded-full h-2">
                  <div className="h-2 bg-primary rounded-full animate-pulse"></div>
                </div>
              ) : (
                <Progress value={progress} className="w-full" />
              )}
              <p className="text-sm text-muted-foreground text-center" data-testid="sync-progress-text">
                {progress === -1
                  ? "Fetching and processing your emails... This may take several minutes depending on your email volume."
                  : "Import complete!"}
              </p>
            </div>
          )}

          <div className="space-y-4" data-testid="time-range-section">
            <h3 className="font-semibold">What will be imported:</h3>
            <div className="grid gap-3 text-sm text-muted-foreground">
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>ALL email messages (complete Gmail history)</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>ALL categories: Inbox, Promotions, Social, Updates, Forums</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Drafts, chats, sent items - everything</span>
              </div>
              <div className="flex items-center space-x-3">
                <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                <span>Complete headers, text content, and metadata</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This will import your complete Gmail history with no filtering.
              This may take several minutes depending on your email volume.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={startSync} disabled={isStarting} className="w-full" size="lg" data-testid="complete-setup-button">
            {isStarting ? "Importing..." : "Start Email Import"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
