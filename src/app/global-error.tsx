"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";
import { logger } from "@/lib/observability";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}): JSX.Element {
  useEffect(() => {
    // Use unified logger for global errors with critical severity
    void logger.critical(
      "Global error boundary triggered",
      {
        operation: "global_error_boundary",
        additionalData: {
          digest: error.digest,
          errorName: error.name,
          errorMessage: error.message,
        },
      },
      error,
    );
  }, [error]);

  return (
    // global-error must include html and body tags
    <html>
      <body>
        <h2>Something went wrong!</h2>
        <button onClick={() => reset()}>Try again</button>
      </body>
    </html>
  );
}
