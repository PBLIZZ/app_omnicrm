"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useGmailConnection } from "@/hooks/use-gmail-connection";
import { useGmailSync } from "@/hooks/use-gmail-sync";
import { useGmailAI } from "@/hooks/use-gmail-ai";
import { GmailConnectionCard } from "./GmailConnectionCard";
import { GmailSettingsPanel } from "./GmailSettingsPanel";
import { OmniConnectHeader } from "./OmniConnectHeader";
import { OmniConnectErrorBanner } from "./OmniConnectErrorBanner";

export function OmniConnectPage(): JSX.Element {
  const searchParams = useSearchParams();
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [error] = useState<string | null>(null);

  // Use shared hooks - status not needed since GmailConnectionCard handles connection state
  useGmailConnection(refreshTrigger);
  // SINGLE SOURCE OF TRUTH: Get all Gmail sync state from one hook instance
  const {
    isSyncing,
    isEmbedding,
    isProcessingContacts,
    startSync,
    approveSync,
    generateEmbeddings,
    processContacts,
    showSyncPreview,
    setShowSyncPreview,
  } = useGmailSync();
  const { loadInsights } = useGmailAI();

  useEffect(() => {
    // Handle success message from OAuth callback
    const connected = searchParams.get("connected");
    if (connected === "gmail") {
      toast.success("Gmail has been successfully connected!", {
        description: "You can now sync your emails and contacts.",
      });
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [searchParams]);

  const handleSyncStart = (): void => {
    startSync();
  };

  const handleApproveSync = (): void => {
    approveSync();
  };

  const handleGenerateEmbeddings = (): void => {
    generateEmbeddings();
  };

  const handleProcessContacts = (): void => {
    processContacts();
  };

  const handleLoadInsights = (): void => {
    void loadInsights();
  };

  const handleSettingsClick = (): void => {
    setShowSettings(true);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <OmniConnectHeader
        isSyncing={isSyncing}
        isEmbedding={isEmbedding}
        onSync={handleSyncStart}
        onGenerateEmbeddings={handleGenerateEmbeddings}
        onLoadInsights={handleLoadInsights}
      />

      <OmniConnectErrorBanner error={error} />

      <GmailConnectionCard
        onSettingsClick={handleSettingsClick}
        refreshTrigger={refreshTrigger}
        isProcessingContacts={isProcessingContacts}
        showSyncPreview={showSyncPreview}
        setShowSyncPreview={setShowSyncPreview}
        onApproveSync={handleApproveSync}
        onProcessContacts={handleProcessContacts}
      />

      <GmailSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
