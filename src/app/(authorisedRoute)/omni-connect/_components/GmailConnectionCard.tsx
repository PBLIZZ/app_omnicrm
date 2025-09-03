"use client";

import { useGmailConnection } from "@/hooks/use-gmail-connection";
import { useGmailEmails } from "@/hooks/use-gmail-emails";
import { useGmailAI } from "@/hooks/use-gmail-ai";
import { useGmailJobStatus } from "@/hooks/use-gmail-job-status";
import { GmailConnectionPrompt } from "./GmailConnectionPrompt";
import { GmailConnectionStatus } from "./GmailConnectionStatus";
import { GmailEmailPreview } from "./GmailEmailPreview";
import { GmailAIFeatures } from "./GmailAIFeatures";
import { GmailSyncPreview } from "./GmailSyncPreview";
import { GmailConnectionCardProps } from "./types";

export function GmailConnectionCard({
  onSyncStart,
  onSettingsClick,
  refreshTrigger,
  isSyncing,
  isEmbedding,
  isProcessingContacts,
  showSyncPreview,
  setShowSyncPreview,
  onApproveSync,
  onGenerateEmbeddings,
  onProcessContacts,
}: GmailConnectionCardProps): JSX.Element {
  // Use shared hooks
  const { status, connect, isConnecting } = useGmailConnection(refreshTrigger);
  const { jobStatus, isLoadingJobStatus, refreshJobStatus, runJobProcessor } = useGmailJobStatus(status.isConnected, refreshTrigger);
  const { emails, previewRange, isLoading: isLoadingEmails } = useGmailEmails(status.isConnected, refreshTrigger);
  // REMOVED: useGmailSync() hook - now using props from parent
  // Modal state and sync functions now come from parent component
  const {
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearching,
    searchGmail,
    insights,
    isLoadingInsights,
    loadInsights,
  } = useGmailAI();

  const handleSyncStart = () => {
    // The actual sync start now happens via parent's hook
    onSyncStart?.();
  };

  const handleSyncApprove = () => {
    // Use the approve function from parent's hook
    onApproveSync();
  };

  const handleProcessContacts = () => {
    onProcessContacts();
  };

  // Show connection prompt if not connected
  if (!status.isConnected) {
    return (
      <GmailConnectionPrompt
        onConnect={connect}
        isConnecting={isConnecting}
      />
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Gmail Connection Status - Left Side (1/3 width) */}
      <div className="lg:col-span-1">
        <GmailConnectionStatus
          status={status}
          jobStatus={jobStatus}
          isLoadingJobStatus={isLoadingJobStatus}
          isSyncing={isSyncing}
          isProcessingContacts={isProcessingContacts}
          isEmbedding={isEmbedding}
          onSync={handleSyncStart}
          onRunJobProcessor={runJobProcessor}
          onProcessContacts={handleProcessContacts}
          onGenerateEmbeddings={onGenerateEmbeddings}
          {...(onSettingsClick && { onSettings: onSettingsClick })}
          onRefreshJobStatus={refreshJobStatus}
        />
      </div>

      {/* Recent Emails Preview - Right Side (2/3 width) */}
      <div className="lg:col-span-2">
        <GmailEmailPreview
          emails={emails}
          isLoading={isLoadingEmails}
          previewRange={previewRange}
        />
      </div>

      {/* AI Search & Insights */}
      <div className="col-span-1 lg:col-span-3">
        <GmailAIFeatures
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          searchResults={searchResults}
          insights={insights}
          isSearching={isSearching}
          isLoadingInsights={isLoadingInsights}
          onSearch={searchGmail}
          onLoadInsights={loadInsights}
        />
      </div>

      <GmailSyncPreview
        isOpen={showSyncPreview}
        onClose={() => setShowSyncPreview(false)}
        onApprove={handleSyncApprove}
      />
    </div>
  );
}
