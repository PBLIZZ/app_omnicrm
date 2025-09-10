"use client";

import { useGmailSync } from "@/hooks/use-gmail-sync";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, RefreshCw } from "lucide-react";
import { GmailSyncPreview } from "./GmailSyncPreview";
import { logger } from "@/lib/observability";

export function GmailSyncTestCard(): JSX.Element {
  // Single useGmailSync hook instance - this should work correctly
  const { isSyncing, showSyncPreview, setShowSyncPreview, startSync, approveSync } = useGmailSync();

  const handleSyncClick = (): void => {
    void logger.info("Gmail sync test initiated", { operation: "gmail_sync.test_click" });
    startSync();
  };

  const handleApprove = (): void => {
    void logger.success("Gmail sync approved", "User approved the sync operation");
    approveSync();
  };

  const handleClose = (): void => {
    void logger.info("Gmail sync modal closed", { operation: "gmail_sync.modal_close" });
    setShowSyncPreview(false);
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
            <span className="text-sm">Modal State:</span>
            <Badge variant={showSyncPreview ? "default" : "secondary"}>
              {showSyncPreview ? "Open" : "Closed"}
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm">Sync Status:</span>
            <Badge variant={isSyncing ? "default" : "outline"}>
              {isSyncing ? "Syncing..." : "Ready"}
            </Badge>
          </div>

          <Button onClick={handleSyncClick} disabled={isSyncing} className="w-full">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Test Sync Now
          </Button>

          <div className="text-xs text-muted-foreground space-y-1">
            <div>🔍 Check browser console for debug logs</div>
            <div>
              📋 Modal state: <strong>{String(showSyncPreview)}</strong>
            </div>
            <div>
              ⚡ Hook instance: <strong>Single</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* The modal component - same as production */}
      <GmailSyncPreview isOpen={showSyncPreview} onClose={handleClose} onApprove={handleApprove} />
    </>
  );
}
