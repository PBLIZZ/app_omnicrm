"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  GoogleLoginButton,
  GmailSyncButton,
  OAuthErrorBoundary,
  useOAuthCallback,
  useOAuthErrorHandler,
  type OAuthError,
  type LogEntry,
  type GoogleOAuthScope,
} from "@/components/google";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * Google OAuth Test Page
 *
 * Comprehensive test interface for Gmail sync functionality including:
 * - Google OAuth flow with incremental authorization
 * - Gmail sync operations with error handling
 * - Extensive logging and feedback for testing
 * - Error boundary demonstration
 * - Component interaction testing
 */
export default function GoogleOAuthTestPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [testResults, setTestResults] = useState<Record<string, boolean>>({});
  const { isComplete } = useOAuthCallback();
  const { error: globalError, handleError, clearError } = useOAuthErrorHandler();

  // Add log entry
  const addLog = (
    level: LogEntry["level"],
    action: string,
    scope?: GoogleOAuthScope,
    details?: Record<string, unknown>,
  ) => {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      level,
      action,
      ...(scope && { scope }),
      ...(details && { details }),
    };

    setLogs((prev) => [logEntry, ...prev].slice(0, 100)); // Keep last 100 logs
    // Unified logger with toasts on client
    const component = "GoogleOAuthTestPage";
    if (level === "error") {
      logger.error(action, { scope, ...(details || {}), logEntry }, component);
    } else if (level === "warn") {
      logger.warn(action, { scope, ...(details || {}), logEntry }, component);
    } else {
      logger.info(action, { scope, ...(details || {}), logEntry }, component);
    }
  };

  // Test result tracking
  const markTestResult = (testName: string, success: boolean) => {
    setTestResults((prev) => ({ ...prev, [testName]: success }));
    addLog(success ? "info" : "error", `Test ${testName}: ${success ? "PASSED" : "FAILED"}`);
  };

  // Error handlers

  const handleLoginError = (error: OAuthError) => {
    const scope =
      error.details && typeof error.details === "object" && "scope" in error.details
        ? (error.details["scope"] as GoogleOAuthScope)
        : undefined;
    addLog("error", "OAuth login failed", scope, { error });
    markTestResult("google_login", false);
    handleError(error);
  };

  const handleSyncStart = (batchId: string) => {
    addLog("info", "Gmail sync started", "gmail", { batchId });
    markTestResult("gmail_sync", true);
  };

  const handleSyncError = (error: OAuthError) => {
    addLog("error", "Gmail sync failed", "gmail", { error });
    markTestResult("gmail_sync", false);
    handleError(error);
  };

  // Test functions
  const runConnectivityTest = async () => {
    addLog("info", "Running connectivity test");

    try {
      // Simple health check - doesn't need OkEnvelope as it's just a status check
      const response = await fetch("/api/health");
      const isHealthy = response.ok;

      markTestResult("api_connectivity", isHealthy);
      addLog(
        isHealthy ? "info" : "error",
        `API connectivity: ${isHealthy ? "OK" : "FAILED"}`,
        undefined,
        {
          status: response.status,
          statusText: response.statusText,
        },
      );
    } catch (error: unknown) {
      markTestResult("api_connectivity", false);
      addLog("error", "API connectivity test failed", undefined, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  };

  const testErrorBoundary = () => {
    addLog("info", "Testing error boundary");
    // Intentionally throw an error to test the boundary
    throw new Error("Test error for error boundary demonstration");
  };

  const clearLogs = () => {
    setLogs([]);
    addLog("info", "Logs cleared");
  };

  const clearTests = () => {
    setTestResults({});
    addLog("info", "Test results cleared");
  };

  const exportLogs = () => {
    const logData = JSON.stringify(logs, null, 2);
    const blob = new Blob([logData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `google-oauth-test-logs-${new Date().toISOString().slice(0, 19)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addLog("info", "Logs exported");
  };

  return (
    <div className="container mx-auto max-w-6xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google OAuth Test Interface</h1>
          <p className="text-muted-foreground mt-2">
            Comprehensive testing environment for Gmail sync functionality
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isComplete && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
            >
              OAuth Complete
            </Badge>
          )}
          {globalError && <Badge variant="destructive">Error Active</Badge>}
        </div>
      </div>

      <Separator />

      {/* Global Error Display */}
      {globalError && (
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader>
            <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
              <span className="h-4 w-4" aria-label="warning">
                ⚠️
              </span>
              Global Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-700 dark:text-red-300 mb-3">{globalError.message}</p>
            <Button onClick={clearError} variant="outline" size="sm">
              Clear Error
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* OAuth Components Testing */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Authentication Testing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <OAuthErrorBoundary
                onError={(error, errorInfo) => {
                  addLog("error", "Error boundary caught error", undefined, {
                    error: error.message,
                    errorInfo,
                  });
                }}
              >
                <div className="space-y-3">
                  <GoogleLoginButton scope="gmail" onError={handleLoginError} variant="default">
                    Connect Gmail
                  </GoogleLoginButton>

                  <GoogleLoginButton scope="calendar" onError={handleLoginError} variant="outline">
                    Connect Calendar
                  </GoogleLoginButton>
                </div>
              </OAuthErrorBoundary>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Gmail Sync Testing</CardTitle>
            </CardHeader>
            <CardContent>
              <OAuthErrorBoundary
                onError={(error, errorInfo) => {
                  addLog("error", "Sync error boundary triggered", "gmail", {
                    error: error.message,
                    errorInfo,
                  });
                }}
              >
                <GmailSyncButton onSyncStart={handleSyncStart} onSyncError={handleSyncError} />
              </OAuthErrorBoundary>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Test Operations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button onClick={runConnectivityTest} variant="outline" size="sm">
                  Test API Connectivity
                </Button>
                <Button onClick={testErrorBoundary} variant="outline" size="sm">
                  Test Error Boundary
                </Button>
                <Button onClick={clearTests} variant="outline" size="sm">
                  Clear Test Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Test Results and Logs */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Test Results
                <Badge variant="outline">{Object.keys(testResults).length} tests</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(testResults).length === 0 ? (
                <p className="text-sm text-muted-foreground">No tests run yet</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(testResults).map(([testName, passed]) => (
                    <div key={testName} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{testName}</span>
                      <Badge variant={passed ? "default" : "destructive"}>
                        {passed ? "PASSED" : "FAILED"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Activity Logs
                <div className="flex gap-2">
                  <Badge variant="outline">{logs.length} entries</Badge>
                  <Button onClick={exportLogs} variant="outline" size="sm">
                    Export
                  </Button>
                  <Button onClick={clearLogs} variant="outline" size="sm">
                    Clear
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No logs yet</p>
                ) : (
                  logs.map((log, index) => (
                    <div key={index} className="text-xs border rounded p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              log.level === "error"
                                ? "destructive"
                                : log.level === "warn"
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {log.level}
                          </Badge>
                          {log.scope && (
                            <Badge variant="outline" className="text-xs">
                              {log.scope}
                            </Badge>
                          )}
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="font-medium">{log.action}</p>
                      {log.details && (
                        <details className="text-muted-foreground">
                          <summary className="cursor-pointer hover:text-foreground">
                            Details
                          </summary>
                          <pre className="mt-1 text-xs overflow-auto">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Documentation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Guide</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Test Flow:</h4>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>First run the API connectivity test to ensure backend is working</li>
              <li>Connect your Google account using the Gmail or Calendar buttons</li>
              <li>After successful OAuth, test the Gmail sync functionality</li>
              <li>Monitor the logs for detailed information about each step</li>
              <li>Test error scenarios using the &quot;Test Error Boundary&quot; button</li>
            </ol>
          </div>

          <div>
            <h4 className="font-medium mb-2">Expected Behavior:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>OAuth buttons should redirect to Google&apos;s authorization page</li>
              <li>After authorization, you&apos;ll be redirected back with success message</li>
              <li>Gmail sync button should show current authorization status</li>
              <li>Sync operations should provide feedback via toasts and logs</li>
              <li>Error boundaries should gracefully handle component errors</li>
            </ul>
          </div>

          <div>
            <h4 className="font-medium mb-2">Troubleshooting:</h4>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>If OAuth fails, check that your Google OAuth credentials are configured</li>
              <li>Ensure the redirect URI is whitelisted in Google Console</li>
              <li>Check browser console for additional error details</li>
              <li>Verify that the required environment variables are set</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
