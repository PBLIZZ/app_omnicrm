"use client";

import React, { Component, ErrorInfo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { OAuthErrorBoundaryProps, OAuthError } from "./types";
import { logger } from "@/lib/logger";

interface State {
  hasError: boolean;
  error?: Error | undefined;
  errorInfo?: ErrorInfo | undefined;
}

/**
 * Default fallback component for OAuth errors
 */
function DefaultErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}): JSX.Element {
  return (
    <Card className="border-red-200 dark:border-red-800">
      <CardHeader>
        <CardTitle className="text-red-800 dark:text-red-200 flex items-center gap-2">
          <div className="h-5 w-5 text-red-600" aria-label="warning">
            ⚠️
          </div>
          Authentication Error
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm text-red-700 dark:text-red-300">
          <p className="font-medium">Something went wrong with the Google authentication:</p>
          <p className="mt-1">{error.message}</p>
        </div>

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer hover:text-foreground">Technical details</summary>
          <pre className="mt-2 rounded bg-muted p-2 overflow-auto">{error.stack}</pre>
        </details>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Troubleshooting tips:</strong>
          </p>
          <ul className="mt-1 text-sm text-blue-700 dark:text-blue-300 list-disc list-inside space-y-1">
            <li>Check your internet connection</li>
            <li>Make sure pop-ups are enabled for this site</li>
            <li>Try refreshing the page and connecting again</li>
            <li>Clear your browser cache and cookies</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={resetError} variant="outline" size="sm">
          Try Again
        </Button>
        <Button onClick={() => window.location.reload()} variant="secondary" size="sm">
          Reload Page
        </Button>
      </CardFooter>
    </Card>
  );
}

/**
 * OAuthErrorBoundary - Robust error boundary for Google OAuth components
 *
 * Features:
 * - Catches and handles OAuth-related errors gracefully
 * - Provides user-friendly error messages and recovery options
 * - Logs detailed error information for debugging
 * - Supports custom fallback components
 * - Follows React error boundary best practices
 */
export class OAuthErrorBoundary extends Component<OAuthErrorBoundaryProps, State> {
  constructor(props: OAuthErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error with detailed context
    const oauthError: OAuthError = {
      code: "react_error_boundary",
      message: error.message,
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: "OAuthErrorBoundary",
        props: this.props,
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
        timestamp: new Date().toISOString(),
        url: typeof window !== "undefined" ? window.location.href : "unknown",
      },
      timestamp: new Date(),
    };

    logger.error("Caught OAuth error", oauthError, "OAuthErrorBoundary");

    // Call the error callback if provided
    this.props.onError?.(error, errorInfo);

    // Store error info in state for potential reporting
    this.setState({
      error,
      errorInfo,
    });

    // Optional: Report to error monitoring service
    if (typeof window !== "undefined" && "gtag" in window) {
      // Google Analytics error reporting (if available)
      const gtag = (window as Record<string, unknown>)["gtag"] as
        | ((event: string, action: string, params: Record<string, unknown>) => void)
        | undefined;
      gtag?.("event", "exception", {
        description: `OAuth Error: ${error.message}`,
        fatal: false,
      });
    }
  }

  resetError = (): void => {
    logger.info("Resetting error state", undefined, "OAuthErrorBoundary");
    this.setState({
      hasError: false,
    });
  };

  override render(): React.ReactNode {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;

      return (
        <div role="alert" className="oauth-error-boundary">
          <FallbackComponent error={this.state.error} resetError={this.resetError} />
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to handle OAuth errors in functional components
 */
export function useOAuthErrorHandler(): {
  error: OAuthError | null;
  handleError: (oauthError: OAuthError) => void;
  clearError: () => void;
  hasError: boolean;
} {
  const [error, setError] = React.useState<OAuthError | null>(null);

  const handleError = React.useCallback((oauthError: OAuthError) => {
    logger.error("OAuth error occurred", oauthError, "useOAuthErrorHandler");
    setError(oauthError);

    // Optional: Report to monitoring service
    if (typeof window !== "undefined" && "gtag" in window) {
      const gtag = (window as Record<string, unknown>)["gtag"] as
        | ((event: string, action: string, params: Record<string, unknown>) => void)
        | undefined;
      gtag?.("event", "exception", {
        description: `OAuth Error: ${oauthError.code} - ${oauthError.message}`,
        fatal: false,
      });
    }
  }, []);

  const clearError = React.useCallback(() => {
    logger.info("Clearing OAuth error state", undefined, "useOAuthErrorHandler");
    setError(null);
  }, []);

  return {
    error,
    handleError,
    clearError,
    hasError: error !== null,
  };
}

/**
 * Higher-order component to wrap components with OAuth error boundary
 */
export function withOAuthErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>,
): React.ComponentType<P> {
  const WithErrorBoundary = (props: P): JSX.Element => (
    <OAuthErrorBoundary fallback={fallback}>
      <WrappedComponent {...props} />
    </OAuthErrorBoundary>
  );

  WithErrorBoundary.displayName = `withOAuthErrorBoundary(${WrappedComponent.displayName || WrappedComponent.name})`;

  return WithErrorBoundary;
}

/**
 * Specialized error fallback for OAuth connection issues
 */
export function OAuthConnectionErrorFallback({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}): JSX.Element {
  const isNetworkError =
    error.message.includes("fetch") ||
    error.message.includes("network") ||
    error.message.includes("NetworkError");

  const isAuthError =
    error.message.includes("auth") ||
    error.message.includes("unauthorized") ||
    error.message.includes("forbidden");

  return (
    <Card className="border-orange-200 dark:border-orange-800">
      <CardHeader>
        <CardTitle className="text-orange-800 dark:text-orange-200 flex items-center gap-2">
          <div className="h-5 w-5 text-orange-600" aria-label="connection">
            🔗
          </div>
          Connection Issue
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isNetworkError && (
          <div className="text-sm text-orange-700 dark:text-orange-300">
            <p className="font-medium">Network connection problem</p>
            <p className="mt-1">
              Unable to connect to Google&apos;s servers. Please check your internet connection and
              try again.
            </p>
          </div>
        )}

        {isAuthError && (
          <div className="text-sm text-orange-700 dark:text-orange-300">
            <p className="font-medium">Authentication issue</p>
            <p className="mt-1">
              There was a problem with your Google account authorization. You may need to sign in
              again.
            </p>
          </div>
        )}

        {!isNetworkError && !isAuthError && (
          <div className="text-sm text-orange-700 dark:text-orange-300">
            <p className="font-medium">Unexpected connection error</p>
            <p className="mt-1">{error.message}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex gap-2">
        <Button onClick={resetError} variant="outline" size="sm">
          Retry Connection
        </Button>
        {isAuthError && (
          <Button
            onClick={() => (window.location.href = "/api/google/oauth?scope=gmail")}
            variant="default"
            size="sm"
          >
            Re-authorize Google
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
