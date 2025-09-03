"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  RefreshCw,
  Brain,
  Search,
  Zap,
  Settings,
  CheckCircle,
  AlertCircle,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fetchGet, fetchPost, buildUrl } from "@/lib/api";
import { GmailConnectionCard } from "./GmailConnectionCard";
import { GmailSyncPreview } from "./GmailSyncPreview";
import { GmailSettingsPanel } from "./GmailSettingsPanel";

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

export function OmniConnectPage(): JSX.Element {
  const searchParams = useSearchParams();
  const [showSyncPreview, setShowSyncPreview] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [stats, setStats] = useState<GmailStats | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [isLoadingJobStatus, setIsLoadingJobStatus] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [insights, setInsights] = useState<any>(null);

  // Recent emails state
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);

  useEffect(() => {
    fetchGmailStats().catch((error) => {
      console.error("Failed to fetch Gmail stats:", error);
    });

    // Handle success message from OAuth callback
    const connected = searchParams.get("connected");
    if (connected === "gmail") {
      toast.success("Gmail has been successfully connected!", {
        description: "You can now sync your emails and contacts.",
      });
      setRefreshTrigger((prev) => prev + 1);
    }
  }, [searchParams]);

  // Poll for job status updates
  useEffect(() => {
    if (!stats?.isConnected) return;

    let intervalId: NodeJS.Timeout;
    
    const loadJobStatus = async () => {
      try {
        setIsLoadingJobStatus(true);
        const csrfToken = getCsrfToken();
        
        const response = await fetch("/api/jobs/status", {
          method: "GET",
          headers: {
            ...(csrfToken && { "x-csrf-token": csrfToken }),
          },
        });

        if (response.ok) {
          const envelope = await response.json();
          const data = envelope.ok === true ? envelope.data : envelope;
          setJobStatus(data);
        }
      } catch (error) {
        console.error("Error fetching job status:", error);
      } finally {
        setIsLoadingJobStatus(false);
      }
    };

    // Load immediately
    loadJobStatus();

    // Then poll every 5 seconds
    intervalId = setInterval(loadJobStatus, 5000);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [stats?.isConnected, refreshTrigger]);

  useEffect(() => {
    if (stats?.isConnected) {
      fetchRecentEmails().catch((error) => {
        console.error("Failed to fetch recent emails:", error);
      });
    }
  }, [stats?.isConnected, refreshTrigger]);

  const fetchGmailStats = async (): Promise<void> => {
    try {
      setError(null);

      // Get sync status using the API utility
      const syncData = await fetchGet<{
        lastSync?: { gmail?: string };
        serviceTokens?: { gmail?: boolean };
      }>("/api/settings/sync/status", { showErrorToast: false });

      // Get raw events count for emails processed
      const eventsUrl = buildUrl("/api/google/gmail/raw-events", {
        provider: "gmail",
        pageSize: 1,
      });
      const eventsData = await fetchGet<{ total: number }>(eventsUrl, { showErrorToast: false });
      const emailsProcessed = eventsData.total || 0;

      // Get contacts suggestions for suggested contacts count
      const contactsData = await fetchPost<{ suggestions: unknown[] }>(
        "/api/contacts-new/suggestions",
        {},
        { showErrorToast: false },
      );
      const suggestedContacts = Array.isArray(contactsData.suggestions)
        ? contactsData.suggestions.length
        : 0;

      setStats({
        emailsProcessed,
        suggestedContacts,
        lastSync: syncData.lastSync?.gmail || null,
        isConnected: syncData.serviceTokens?.gmail || false,
      });
    } catch (error) {
      console.error("Error fetching Gmail stats:", error);
      setError("Failed to load Gmail statistics");
    }
  };

  const syncGmail = async (): Promise<void> => {
    if (!stats?.isConnected) return;

    setIsSyncing(true);
    try {
      const csrfToken = getCsrfToken();

      // First preview the sync
      const previewResponse = await fetch("/api/sync/preview/gmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken && { "x-csrf-token": csrfToken }),
        },
      });

      if (!previewResponse.ok) {
        throw new Error("Failed to preview Gmail sync");
      }

      const previewEnvelope = await previewResponse.json();
      // Handle envelope format
      const preview = previewEnvelope.ok === true ? previewEnvelope.data : previewEnvelope;

      // Calculate total emails from countByLabel
      const totalEmails = Object.values(preview?.countByLabel || {}).reduce(
        (sum: number, count: any) => sum + (typeof count === "number" ? count : 0),
        0,
      );

      // Show preview to user and ask for confirmation
      const sampleCount = preview?.sampleSubjects?.length || 0;
      const confirmed = window.confirm(
        `Gmail Sync Preview:\n\n` +
          `• Total emails found: ${totalEmails}\n` +
          `• Sample emails retrieved: ${sampleCount}\n` +
          `• Jobs will process automatically after approval\n\n` +
          `Proceed with sync? This will create background jobs to process your Gmail data.`,
      );

      if (!confirmed) {
        setIsSyncing(false);
        return;
      }

      // Proceed with sync
      const syncResponse = await fetch("/api/sync/approve/gmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken && { "x-csrf-token": csrfToken }),
        },
      });

      if (syncResponse.ok) {
        const result = await syncResponse.json();
        const message = result.message || "Gmail sync approved and processing started";
        toast.success(message);

        // Show automatic processing info
        toast.info(
          "Jobs are processing automatically in the background. Check job status below for progress.",
        );

        // Refresh status after delay to allow for processing
        setTimeout(async () => {
          await fetchGmailStats();
          await fetchRecentEmails();
          // Refresh job status
          const loadJobStatus = async () => {
            try {
              setIsLoadingJobStatus(true);
              const response = await fetch("/api/jobs/status", {
                method: "GET",
                headers: {
                  ...(csrfToken && { "x-csrf-token": csrfToken }),
                },
              });

              if (response.ok) {
                const envelope = await response.json();
                const data = envelope.ok === true ? envelope.data : envelope;
                setJobStatus(data);
              }
            } catch (error) {
              console.error("Error fetching job status:", error);
            } finally {
              setIsLoadingJobStatus(false);
            }
          };
          loadJobStatus();
        }, 3000);
      } else {
        const error = await syncResponse.json();
        throw new Error(error.message || "Sync failed");
      }
    } catch (error) {
      console.error("Error syncing Gmail:", error);
      toast.error("Failed to sync Gmail");
    } finally {
      setIsSyncing(false);
    }
  };

  const generateEmbeddings = async (): Promise<void> => {
    setIsEmbedding(true);
    setError(null);
    try {
      const data = await fetchPost<{ message: string }>("/api/gmail/embed", { regenerate: false });
      toast.success(data.message || "Embeddings generated successfully");
    } catch (error) {
      setError("Network error during embedding generation");
    } finally {
      setIsEmbedding(false);
    }
  };

  const searchGmail = async (): Promise<void> => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const data = await fetchPost<{ results: unknown[] }>("/api/gmail/search", {
        query: searchQuery,
        limit: 5,
      });
      setSearchResults(data.results || []);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const loadInsights = async (): Promise<void> => {
    try {
      const response = await fetch("/api/gmail/insights");
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights);
      }
    } catch (error) {
      console.error("Failed to load insights:", error);
    }
  };


  const fetchRecentEmails = async (): Promise<void> => {
    if (!stats?.isConnected) return;

    try {
      setIsLoadingEmails(true);
      const csrfToken = getCsrfToken();

      // Use the preview endpoint to get sample emails
      const response = await fetch("/api/sync/preview/gmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken && { "x-csrf-token": csrfToken }),
        },
      });

      if (response.ok) {
        const envelope = await response.json();
        // Handle both envelope format {ok: true, data: {...}} and direct format {...}
        const data = envelope.ok === true ? envelope.data : envelope;

        // Extract sample subjects from the preview data
        if (
          data?.sampleSubjects &&
          Array.isArray(data.sampleSubjects) &&
          data.sampleSubjects.length > 0
        ) {
          const mockEmails = data.sampleSubjects.slice(0, 5).map((emailObj: any, index: number) => ({
            id: emailObj.id || `email-${index}`,
            subject: emailObj.subject || `Email ${index + 1}`,
            from: emailObj.from || "Sample Sender",
            date: emailObj.date || new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
            snippet: `This is a preview of email ${index + 1}...`,
          }));
          setRecentEmails(mockEmails);
        } else {
          setRecentEmails([]);
        }
      }
    } catch (error) {
      console.error("Error fetching recent emails:", error);
    } finally {
      setIsLoadingEmails(false);
    }
  };

  const handleSyncStart = () => {
    setShowSyncPreview(true);
  };

  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleSyncApprove = async () => {
    // This will be called when user approves the sync in the preview modal
    await syncGmail();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">OmniConnect</h1>
          <p className="text-muted-foreground">
            Gmail integration for intelligent client communication tracking
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => syncGmail()} disabled={isSyncing} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Sync Now
          </Button>
          <Button onClick={generateEmbeddings} disabled={isEmbedding} variant="outline">
            <Brain className={`h-4 w-4 mr-2 ${isEmbedding ? "animate-spin" : ""}`} />
            Generate AI Embeddings
          </Button>
          <Button onClick={loadInsights} variant="outline">
            <Zap className="h-4 w-4 mr-2" />
            Insights
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {false ? (
        <GmailConnectionCard
          onSyncStart={handleSyncStart}
          onSettingsClick={handleSettingsClick}
          refreshTrigger={refreshTrigger}
        />
      ) : (
        <>
          {/* Gmail Status Card */}
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
                </div>

                {stats?.lastSync && (
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Last Sync</span>
                    <span className="text-sm">
                      {format(new Date(stats.lastSync), "MMM d, HH:mm")}
                    </span>
                  </div>
                )}

                {/* Job Status */}
                {jobStatus && (
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Job Status</span>
                      <Button
                        onClick={() => {
                          // Refresh job status
                          const loadJobStatus = async () => {
                            try {
                              setIsLoadingJobStatus(true);
                              const csrfToken = getCsrfToken();
                              
                              const response = await fetch("/api/jobs/status", {
                                method: "GET",
                                headers: {
                                  ...(csrfToken && { "x-csrf-token": csrfToken }),
                                },
                              });

                              if (response.ok) {
                                const envelope = await response.json();
                                const data = envelope.ok === true ? envelope.data : envelope;
                                setJobStatus(data);
                              }
                            } catch (error) {
                              console.error("Error fetching job status:", error);
                            } finally {
                              setIsLoadingJobStatus(false);
                            }
                          };
                          loadJobStatus();
                        }}
                        variant="ghost"
                        size="sm"
                        disabled={isLoadingJobStatus}
                      >
                        <RefreshCw className={`h-3 w-3 ${isLoadingJobStatus ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                    {jobStatus.jobs?.length > 0 ? (
                      <div className="space-y-1">
                        {jobStatus.jobs.slice(0, 3).map((job, index) => (
                          <div key={job.id || index} className="flex justify-between text-xs">
                            <span className="truncate">{job.kind || "Unknown"}</span>
                            <Badge
                              variant={
                                job.status === "completed"
                                  ? "default"
                                  : job.status === "running"
                                    ? "secondary"
                                    : "outline"
                              }
                              className="text-xs"
                            >
                              {job.status || "unknown"}
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

                <div className="flex gap-2">
                  <Button onClick={handleSettingsClick} variant="outline" size="sm">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Emails Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Emails</CardTitle>
              <CardDescription>
                Your most recent email communications with business intelligence
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {isLoadingEmails ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <RefreshCw className="h-8 w-8 mx-auto mb-4 opacity-50 animate-spin" />
                    <p className="text-sm">Loading recent emails...</p>
                  </div>
                ) : recentEmails.length > 0 ? (
                  recentEmails.map((email, index) => (
                    <div key={email.id || index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{email.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{email.from}</p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(() => {
                            try {
                              const date = new Date(email.date);
                              return isNaN(date.getTime()) ? "Invalid date" : format(date, "MMM d");
                            } catch {
                              return "Invalid date";
                            }
                          })()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{email.snippet}</p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Recent emails will appear here after syncing</p>
                    <p className="text-xs">
                      Use the "Sync Now" button to start importing your emails
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Semantic Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Semantic Gmail Search
              </CardTitle>
              <CardDescription>
                Search your emails using natural language (e.g., "project updates from John",
                "meeting notes")
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search your emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchGmail()}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <Button onClick={searchGmail} disabled={!searchQuery.trim() || isSearching}>
                  <Search className="h-4 w-4 mr-2" />
                  {isSearching ? "Searching..." : "Search"}
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Search Results:</h4>
                  {searchResults.map((result, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <h5 className="font-medium">{result.subject}</h5>
                        <Badge variant="secondary">
                          {Math.round(result.similarity * 100)}% match
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(result.date), "MMM d, yyyy")}
                        {result.contactInfo?.displayName && ` • ${result.contactInfo.displayName}`}
                      </div>
                      <div className="text-sm bg-gray-50 p-2 rounded">{result.snippet}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Insights */}
          {insights && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI Gmail Insights
                </CardTitle>
                <CardDescription>
                  Intelligent analysis of your email patterns and communication trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {insights.patterns?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">📊 Patterns</h4>
                      <ul className="space-y-1 text-sm">
                        {insights.patterns.slice(0, 3).map((pattern: string, index: number) => (
                          <li key={index} className="text-muted-foreground">
                            • {pattern}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {insights.topContacts?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">👥 Top Contacts</h4>
                      <ul className="space-y-1 text-sm">
                        {insights.topContacts.slice(0, 3).map((contact: any, index: number) => (
                          <li key={index} className="text-muted-foreground">
                            • {contact.displayName ?? contact.email} ({contact.emailCount} emails)
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Modals */}
      <GmailSyncPreview
        isOpen={showSyncPreview}
        onClose={() => setShowSyncPreview(false)}
        onApprove={handleSyncApprove}
      />

      <GmailSettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
