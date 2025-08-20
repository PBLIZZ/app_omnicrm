/**
 * Enhanced logging utility with toast notifications.
 * Edge-safe: avoids Node-only APIs and lazily loads client-only toasts.
 */

/**
 * Log levels for different types of messages
 */
export type LogLevel = "info" | "warn" | "error" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
  component?: string;
}

/**
 * Lazily show a toast on the client. No-ops on server/edge during SSR/middleware.
 */
function toastClient(
  kind: "success" | "info" | "error",
  message: string,
  options?: Record<string, unknown>,
): void {
  if (typeof window === "undefined") return;
  // Lazy import so middleware/edge doesn't bundle UI lib
  // and to ensure side-effects only occur in the browser.
  void import("sonner")
    .then(({ toast }) => {
      if (kind === "success") toast.success(message, options);
      else if (kind === "info") toast.info(message, options);
      else toast.error(message, options);
    })
    .catch(() => {
      // ignore toast errors
    });
}

/**
 * No-op file writer to remain compatible with existing call sites.
 * We intentionally skip file I/O to be compatible with Edge Runtime.
 */
function writeToLogFile(entry: LogEntry): void {
  // Intentionally no-op: console output is available on all runtimes.
  // entry parameter is accepted but unused to maintain function signature
  void entry;
}

/**
 * Enhanced logger with toast notifications
 */
export const logger = {
  /**
   * Info level - shows success toast, logs to file
   */
  info(message: string, data?: Record<string, unknown>, component?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "info",
      message,
      ...(data ? { data } : {}),
      ...(component ? { component } : {}),
    };

    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.log(`[${component ?? "App"}] ${message}`, data ?? "");
    }

    toastClient("success", message, { duration: 2000, position: "top-center" });

    writeToLogFile(entry);
  },

  /**
   * Warning level - shows info toast, logs to file
   */
  warn(message: string, data?: Record<string, unknown>, component?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "warn",
      message,
      ...(data ? { data } : {}),
      ...(component ? { component } : {}),
    };

    if (process.env.NODE_ENV === "development") {
      console.warn(`[${component ?? "App"}] ${message}`, data ?? "");
    }

    toastClient("info", message, { duration: 3000, position: "top-center" });

    writeToLogFile(entry);
  },

  /**
   * Error level - shows persistent error toast, logs to file
   */
  error(message: string, error?: Error | unknown, component?: string) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "error",
      message,
      data: error instanceof Error ? { message: error.message, stack: error.stack } : { error },
      ...(component ? { component } : {}),
    };

    console.error(`[${component ?? "App"}] ${message}`, error);

    toastClient("error", message, {
      duration: Infinity,
      position: "top-center",
      description: error instanceof Error ? error.message : String(error),
      action: { label: "Dismiss", onClick: () => {} },
    });

    writeToLogFile(entry);
  },

  /**
   * Debug level - development only
   */
  debug(message: string, data?: Record<string, unknown>, component?: string) {
    if (process.env.NODE_ENV !== "development") return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: "debug",
      message,
      ...(data ? { data } : {}),
      ...(component ? { component } : {}),
    };

    // eslint-disable-next-line no-console
    console.log(`[DEBUG][${component ?? "App"}] ${message}`, data ?? "");
    writeToLogFile(entry);
  },
};
