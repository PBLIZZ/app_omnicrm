"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, MessageSquare, Wifi, RefreshCw } from "lucide-react";
import { logger } from "@/lib/observability";

export default function MessagesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    void logger.error(
      "omni_connect_route_error",
      {
        operation: "route_error",
        additionalData: {
          component: "OmniConnectErrorBoundary",
          errorMessage: error.message,
          errorStack: error.stack?.split("\n")[0],
        },
      },
      error,
    );
  }, [error]);

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center space-y-6 p-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
          <MessageSquare className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold">Messages Error</h2>
          </div>

          <p className="text-muted-foreground max-w-md">
            We couldn&apos;t load your messages right now. This might be due to a connection issue
            or a temporary problem with our messaging service.
          </p>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mt-4">
            <Wifi className="h-4 w-4" />
            <span>Check your internet connection and try again</span>
          </div>

          {process.env.NODE_ENV === "development" && error.message && (
            <details className="mt-4 p-4 bg-muted rounded-md text-left">
              <summary className="cursor-pointer text-sm font-medium">
                Error Details (Development)
              </summary>
              <p className="mt-2 text-xs font-mono text-muted-foreground">{error.message}</p>
            </details>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={reset} variant="default" className="min-w-[120px]">
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>

        <Button
          variant="outline"
          onClick={() => (window.location.href = "/omni-flow")}
          className="min-w-[120px]"
        >
          Go to Dashboard
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center max-w-sm">
        If this problem persists, please contact support or try accessing messages from a different
        device.
      </p>
    </div>
  );
}
