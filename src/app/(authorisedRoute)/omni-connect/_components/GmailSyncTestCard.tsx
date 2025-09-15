"use client";

import { useGmailSync } from "@/hooks/use-gmail-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw } from "lucide-react";
import { logger } from "@/lib/observability";

export function GmailSyncTestCard(): JSX.Element {
  // Updated for simplified useGmailSync hook (no preview modal)
  const { isSyncing, startSync } = useGmailSync();

  const handleSyncClick = (): void => {
    void logger.info("Gmail sync test initiated", { operation: "gmail_sync.test_click" });
    startSync();
  };

  return (
    <>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Sync Test Card
          </CardTitle>
          <CardDescription>Isolated test for Gmail sync modal functionality</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Sync Status:</span>
            <Badge variant={isSyncing ? "default" : "outline"}>
              {isSyncing ? "Syncing..." : "Ready"}
            </Badge>
          </div>

          <Button onClick={handleSyncClick} disabled={isSyncing} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Test Incremental Sync
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>🔍 Check browser console for debug logs</div>
            <div>⚡ Simplified hook - direct sync without preview</div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
