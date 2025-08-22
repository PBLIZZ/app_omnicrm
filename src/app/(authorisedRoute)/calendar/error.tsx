"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Calendar, RefreshCw } from "lucide-react";

export default function CalendarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    console.error("Calendar route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center space-y-6 p-6">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full">
          <Calendar className="h-8 w-8 text-destructive" />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <h2 className="text-xl font-semibold">Calendar Error</h2>
          </div>

          <p className="text-muted-foreground max-w-md">
            We encountered an issue loading your calendar. This could be due to a connection problem
            or a temporary server issue.
          </p>

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
          onClick={() => (window.location.href = "/dashboard")}
          className="min-w-[120px]"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
}
