"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { fetchGet, fetchPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mail,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Link,
  Settings,
  BarChart3,
  Clock,
  Search,
  Brain,
  Zap,
} from "lucide-react";
import { format } from "date-fns";
import { GmailSyncPreview } from "./GmailSyncPreview";

interface ContactData {
  displayName?: string;
  email: string;
  emailCount: number;
}

interface GmailConnectionStatus {
  isConnected: boolean;
  lastSync?: string;
  emailCount?: number;
  contactCount?: number;
  error?: string;
}

interface GmailConnectionCardProps {
  onSyncStart?: () => void;
  onSettingsClick?: () => void;
  refreshTrigger?: number;
}

export function GmailConnectionCard({
  onSyncStart,
  onSettingsClick,
  refreshTrigger,
}: GmailConnectionCardProps): JSX.Element {
  const [status, setStatus] = useState<GmailConnectionStatus>({ isConnected: false });
  const [isSyncing, setIsSyncing] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [recentEmails, setRecentEmails] = useState<any[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [isLoadingJobStatus, setIsLoadingJobStatus] = useState(false);
  const [showSyncPreview, setShowSyncPreview] = useState(false);

  // AI Search & Insights State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [insights, setInsights] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isEmbedding, setIsEmbedding] = useState(false);
  const [isProcessingContacts, setIsProcessingContacts] = useState(false);

  useEffect(() => {
    checkGmailStatus().catch((error) => {
      console.error("Failed to check Gmail status:", error);
    });
    checkJobStatus().catch((error) => {
      console.error("Failed to check job status:", error);
    });
  }, [refreshTrigger]);

  useEffect(() => {
    if (status.isConnected) {
      fetchRecentEmails().catch((error) => {
        console.error("Failed to fetch recent emails:", error);
      });
    }
  }, [status.isConnected]);

  const checkGmailStatus = async (): Promise<void> => {
    try {
      const data = await fetchGet<{
        serviceTokens?: { gmail?: boolean };
        lastSync?: { gmail?: string };
      }>("/api/settings/sync/status");
      
      const hasGmailToken = data?.serviceTokens?.gmail;
      const lastSync = data?.lastSync?.gmail;

      if (hasGmailToken) {
        setStatus({
          isConnected: true,
          lastSync: lastSync,
          emailCount: 0, // We'll get this from raw_events count later
          contactCount: 0, // We'll get this from contacts count later
        });
      } else {
        setStatus({ isConnected: false });
      }
    } catch (error) {
      console.error("Error checking Gmail status:", error);
      setStatus({ isConnected: false, error: "Failed to check status" });
    }
  };

  const fetchRecentEmails = async (): Promise<void> => {
    if (!status.isConnected) return;

    try {
      setIsLoadingEmails(true);
      
      // For now, we'll use the preview endpoint to get sample emails
      // Later we can create a dedicated endpoint for recent emails
      const data = await fetchPost<{
        sampleSubjects?: any[];
        countByLabel?: Record<string, number>;
      }>("/api/sync/preview/gmail", {});

        // console.log("Gmail preview data:", data);
        console.log("Response structure:", {
          hasSampleSubjects: !!data?.sampleSubjects,
          sampleSubjectsLength: data?.sampleSubjects?.length || 0,
          sampleSubjectsType: typeof data?.sampleSubjects,
          firstSubject: data?.sampleSubjects?.[0],
          countByLabel: data?.countByLabel,
          fullResponse: data,
        });

        // Extract sample subjects from the preview data
        if (
          data?.sampleSubjects &&
          Array.isArray(data.sampleSubjects) &&
          data.sampleSubjects.length > 0
        ) {
          console.log("✅ Processing sample subjects:", data.sampleSubjects);
          const mockEmails = data.sampleSubjects
            .slice(0, 5)
            .map((emailObj: any, index: number) => ({
              id: emailObj.id || `email-${index}`,
              subject: emailObj.subject || `Email ${index + 1}`,
              from: emailObj.from || "Sample Sender",
              date:
                emailObj.date || new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
              snippet: `This is a preview of email ${index + 1}...`,
            }));
          console.log("✅ Setting recent emails:", mockEmails);
          setRecentEmails(mockEmails);
        } else {
          console.log("❌ No sample subjects found in preview response:", {
            data,
            sampleSubjects: data?.sampleSubjects,
          });
          setRecentEmails([]);
        }
    } catch (error) {
      console.error("Error fetching recent emails:", error);
    } finally {
      setIsLoadingEmails(false);
    }
  };


  const connectGmail = async (): Promise<void> => {
    setIsConnecting(true);
    try {
      // Redirect to Gmail OAuth
      window.location.href = "/api/google/gmail/oauth";
    } catch (error) {
      setIsConnecting(false);
      toast.error("Failed to start Gmail OAuth");
    }
  };

  const syncGmail = async (): Promise<void> => {
    // Open the preview modal instead of running the confirm flow inline
    setShowSyncPreview(true);
    if (onSyncStart) onSyncStart();
  };

  const handleSyncApprove = async (): Promise<void> => {
    setIsSyncing(true);
    try {
      const result = await fetchPost<{ message?: string }>("/api/sync/approve/gmail", {});
      const message = result?.message || "Gmail sync approved and processing started";
      toast.success(message);

      // Inform about background processing
      toast.info(
        "Jobs are processing automatically in the background. Check job status below for progress.",
      );

      setShowSyncPreview(false);

      // Refresh after a short delay
      setTimeout(async () => {
        await checkGmailStatus();
        await fetchRecentEmails();
        await checkJobStatus();
      }, 3000);
    } catch (error) {
      console.error("Gmail sync approval error:", error);
      toast.error(error instanceof Error ? error.message : "Gmail sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const runJobProcessor = async (): Promise<void> => {
    try {
      // console.log("🔄 Manually triggering job processor...");
      await fetchPost("/api/jobs/runner", {});
      // console.log("✅ Job processor result:", result);
      toast.success("Job processor completed - check console for debug logs");
      await checkJobStatus(); // Check job status after processing
      await checkGmailStatus(); // Refresh status after processing
      await fetchRecentEmails(); // Refresh emails
    } catch (error) {
      console.error("❌ Job processor error:", error);
      toast.error("Failed to run job processor");
    }
  };

  const checkJobStatus = async (): Promise<void> => {
    try {
      setIsLoadingJobStatus(true);
      const data = await fetchGet<any>("/api/jobs/status");
      setJobStatus(data);
      // console.log("📊 Job status:", data);
    } catch (error) {
      console.error("Error checking job status:", error);
    } finally {
      setIsLoadingJobStatus(false);
    }
  };

  // AI Search & Insights Functions
  const searchGmail = async (): Promise<void> => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const data = await fetchPost<{ results: any[] }>("/api/gmail/search", {
        query: searchQuery,
        limit: 5,
      });
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Search failed");
    } finally {
      setIsSearching(false);
    }
  };

  const loadInsights = async (): Promise<void> => {
    setIsLoadingInsights(true);
    try {
      const data = await fetchGet<{ insights: any }>("/api/gmail/insights");
      setInsights(data.insights);
    } catch (error) {
      console.error("Insights error:", error);
      toast.error("Failed to load insights");
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const generateEmbeddings = async (): Promise<void> => {
    setIsEmbedding(true);
    try {
      const csrfToken = getCsrfToken();
      const response = await fetch("/api/gmail/embed", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(csrfToken && { "x-csrf-token": csrfToken }),
        },
        body: JSON.stringify({ regenerate: false }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message || "Embeddings generated successfully");
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to generate embeddings");
      }
    } catch (error) {
      console.error("Embedding error:", error);
      toast.error("Failed to generate embeddings");
    } finally {
      setIsEmbedding(false);
    }
  };

  const processContacts = async (): Promise<void> => {
    setIsProcessingContacts(true);
    try {
      const data = await fetchPost<{ message?: string }>("/api/gmail/process-contacts", {});
      toast.success(data.message || "Contacts processed successfully");
        // Refresh status after processing
        await checkGmailStatus();
        await fetchRecentEmails();
        await checkJobStatus();
    } catch (error) {
      console.error("Contact processing error:", error);
      toast.error("Failed to process contacts");
    } finally {
      setIsProcessingContacts(false);
    }
  };

  if (!status.isConnected) {
    return (
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle>Connect Your Gmail</CardTitle>
          <CardDescription>
            Sync your email communications to automatically extract client interactions and build
            comprehensive contact timelines.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Mail className="h-8 w-8 text-blue-600 mb-2" />
                <h3 className="font-medium">Email History</h3>
                <p className="text-muted-foreground text-center">
                  Import past conversations and client communications
                </p>
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <BarChart3 className="h-8 w-8 text-green-600 mb-2" />
                <h3 className="font-medium">Contact Intelligence</h3>
                <p className="text-muted-foreground text-center">
                  Extract client information and engagement patterns
                </p>
              </div>
              <div className="flex flex-col items-center p-4 bg-gray-50 rounded-lg">
                <Clock className="h-8 w-8 text-purple-600 mb-2" />
                <h3 className="font-medium">Timeline Building</h3>
                <p className="text-muted-foreground text-center">
                  Automatically create comprehensive client histories
                </p>
              </div>
            </div>
            <Button onClick={connectGmail} disabled={isConnecting} size="lg">
              <Link className="h-4 w-4 mr-2" />
              {isConnecting ? "Connecting..." : "Connect Gmail"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Connection Status - Left Side */}
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
            {/* Sync Controls */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={syncGmail} disabled={isSyncing} variant="outline" size="sm">
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                {isSyncing ? "Syncing..." : "Sync Now"}
              </Button>
              <Button onClick={runJobProcessor} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Process Jobs
              </Button>
              <Button
                onClick={processContacts}
                disabled={isProcessingContacts}
                variant="outline"
                size="sm"
              >
                <Mail className={`h-4 w-4 mr-2 ${isProcessingContacts ? "animate-spin" : ""}`} />
                {isProcessingContacts ? "Processing..." : "Process Contacts"}
              </Button>
              <Button
                onClick={generateEmbeddings}
                disabled={isEmbedding}
                variant="outline"
                size="sm"
              >
                <Brain className={`h-4 w-4 mr-2 ${isEmbedding ? "animate-spin" : ""}`} />
                {isEmbedding ? "Embedding..." : "Generate AI Embeddings"}
              </Button>
              <Button
                onClick={loadInsights}
                disabled={isLoadingInsights}
                variant="outline"
                size="sm"
              >
                <Zap className={`h-4 w-4 mr-2 ${isLoadingInsights ? "animate-spin" : ""}`} />
                {isLoadingInsights ? "Loading..." : "AI Insights"}
              </Button>
              <Button onClick={onSettingsClick} variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Emails Processed</span>
                <Badge variant="secondary">{status.emailCount || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Contacts Found</span>
                <Badge variant="secondary">{status.contactCount || 0}</Badge>
              </div>
            </div>

            {/* Job Status */}
            {jobStatus && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Job Status</span>
                  <Button
                    onClick={checkJobStatus}
                    variant="ghost"
                    size="sm"
                    disabled={isLoadingJobStatus}
                  >
                    <RefreshCw className={`h-3 w-3 ${isLoadingJobStatus ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                {jobStatus.jobs?.length > 0 ? (
                  <div className="space-y-1">
                    {jobStatus.jobs.slice(0, 3).map((job: any, index: number) => (
                      <div key={job?.id || index} className="flex justify-between text-xs">
                        <span className="truncate">{job?.kind || "Unknown"}</span>
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
                          {job?.status || "unknown"}
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

      {/* Recent Emails Preview - Right Side */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Emails</CardTitle>
          <CardDescription>Your most recent email communications</CardDescription>
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
                <p className="text-sm">No emails available</p>
                <p className="text-xs">Click "Sync Now" to preview your recent emails</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      </div>

      {/* AI Search & Insights */}
      <div className="mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Semantic Search */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Semantic Gmail Search
              </CardTitle>
              <CardDescription>
                Search your emails using natural language (e.g., "project updates from John", "meeting
                notes")
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Search your emails..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && searchGmail()}
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
                <div className="grid grid-cols-1 gap-4">
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

                  {insights.emailVolume && (
                    <div>
                      <h4 className="font-medium mb-2">📈 Email Volume</h4>
                      <div className="text-sm text-muted-foreground">
                        <div>Total: {insights.emailVolume.total} emails</div>
                        <div>This week: {insights.emailVolume.thisWeek} emails</div>
                        <div
                          className={`font-medium ${insights.emailVolume.trend === "up" ? "text-green-600" : insights.emailVolume.trend === "down" ? "text-red-600" : "text-gray-600"}`}
                        >
                          Trend:{" "}
                          {insights.emailVolume.trend === "up"
                            ? "↗️"
                            : insights.emailVolume.trend === "down"
                              ? "↘️"
                              : "➡️"}{" "}
                          {insights.emailVolume.trend}
                        </div>
                      </div>
                    </div>
                  )}

                  {insights.topContacts?.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">👥 Top Contacts</h4>
                      <ul className="space-y-1 text-sm">
                        {insights.topContacts
                          .slice(0, 3)
                          .map((contact: ContactData, index: number) => (
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
        </div>
      </div>
      <GmailSyncPreview
        isOpen={showSyncPreview}
        onClose={() => setShowSyncPreview(false)}
        onApprove={handleSyncApprove}
      />
    </div>
);
}
