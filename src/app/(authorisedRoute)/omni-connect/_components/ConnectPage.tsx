"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useOmniConnect } from "@/hooks/use-omni-connect";
import { useGmailSync } from "@/hooks/use-gmail-sync";
import { useGmailAI } from "@/hooks/use-gmail-ai";
import { post } from "@/lib/api/client";

import { GmailConnectionPrompt } from "@/app/(authorisedRoute)/omni-connect/_components/GmailConnectionPrompt";
import { GmailSyncSetup } from "@/app/(authorisedRoute)/omni-connect/_components/GmailSyncSetup";
import { ConnectHeader } from "@/app/(authorisedRoute)/omni-connect/_components/ConnectHeader";
import { ConnectErrorBanner } from "@/app/(authorisedRoute)/omni-connect/_components/ConnectErrorBanner";
import { ConnectConnectionStatusCard } from "@/app/(authorisedRoute)/omni-connect/_components/ConnectConnectionStatusCard";
import { TemplateAutomationCard } from "@/app/(authorisedRoute)/omni-connect/_components/TemplateAutomationCard";
import { IntelligenceDashboardCard } from "./ConnectIntelligenceDashboardCard";
import { SemanticSearchView } from "./ConnectSemanticSearchView";

// New tab views
import { EmailsView } from "./EmailsView";
import { IntelligenceView } from "./IntelligenceView";

export function ConnectPage(): JSX.Element {
  const searchParams = useSearchParams();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error] = useState<string | null>(null);
  const [lastSyncStats, setLastSyncStats] = useState<{
    inserted: number;
    processed: number;
  } | null>(null);

  // Unified dashboard data
  const { isLoading, connection, emails } = useOmniConnect(refreshTrigger);

  // Gmail sync + AI actions
  const { isSyncing } = useGmailSync();
  const { loadInsights } = useGmailAI();

  useEffect(() => {
    // Handle success message from OAuth callback
    const connected = searchParams.get("connected");
    if (connected === "gmail") {
      toast.success("Gmail connected successfully!", {
        description: "Your email sync has started automatically. This may take a few minutes.",
      });
      setRefreshTrigger((prev) => prev + 1);
    }

    // Handle new sync step
    const step = searchParams.get("step");
    if (step === "gmail-sync") {
      toast.success("Gmail connected successfully!", {
        description: "Now you need to start your initial sync to import your emails.",
      });
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [searchParams]);

  const handleLoadInsights = (): void => {
    void loadInsights();
  };

  const handleSyncNow = async (): Promise<void> => {
    try {
      toast.info("Starting incremental sync...", {
        description: "Importing new emails since last sync",
      });

      // Incremental sync from last successful Gmail raw_event by default
      const response = await post<{
        message: string;
        stats: { inserted: number; processed: number };
      }>("/api/google/gmail/sync-direct", { incremental: true });

      // Store the sync stats for display
      setLastSyncStats(response.stats);

      toast.success("Sync completed!", {
        description: `Processed ${response.stats.processed} emails, imported ${response.stats.inserted} new`,
      });
      setRefreshTrigger((prev) => prev + 1);
    } catch (error) {
      toast.error("Sync failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  // Determine active tab from URL param
  const rawView = searchParams.get("view");
  const activeTab = (() => {
    if (rawView === "semantic-search" || rawView === "search") return "search";
    if (rawView === "intelligence") return "intelligence";
    return "emails"; // default
  })();

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // Check for sync step first, before connection status
  const step = searchParams.get("step");
  if (step === "gmail-sync") {
    return <GmailSyncSetup />;
  }

  // If not connected, show the connection prompt
  if (!connection.status.isConnected) {
    return (
      <GmailConnectionPrompt
        onConnect={connection.connect}
        isConnecting={connection.isConnecting}
      />
    );
  }

  // Settings are no longer needed - sync starts automatically on connection

  return (
    <div className="container mx-auto p-6 space-y-6">
      <ConnectHeader onLoadInsights={handleLoadInsights} />

      <ConnectErrorBanner error={error} />

      {/* === Top Cards Grid (New Order) === */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <IntelligenceDashboardCard />
        </div>
        <TemplateAutomationCard />
        <ConnectConnectionStatusCard
          status={connection.status}
          isSyncing={isSyncing}
          onSyncNow={handleSyncNow}
          lastSyncStats={lastSyncStats}
        />
      </div>

      {/* === Main Content Area (Tabbed) === */}
      <Tabs value={activeTab} className="w-full">
        {/* Tab triggers are controlled via sidebar links (?view=...) */}
        <TabsContent value="emails">
          <EmailsView emails={emails} />
        </TabsContent>
        <TabsContent value="search">
          <SemanticSearchView />
        </TabsContent>
        <TabsContent value="intelligence">
          <IntelligenceView />
        </TabsContent>
      </Tabs>

      {/* Settings panel removed - sync happens automatically */}
    </div>
  );
}
