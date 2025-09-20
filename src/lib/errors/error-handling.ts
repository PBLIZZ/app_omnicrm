/**
 * Centralized Error Handling for React Query
 *
 * Provides consistent error handling patterns across all hooks to ensure
 * uniform user experience and proper error recovery mechanisms.
 */

import { toast } from "sonner";

/**
 * Standard error categories for Google service integrations
 */
export type GoogleServiceError =
  | "token_expired"
  | "no_integration"
  | "api_error"
  | "network_error"
  | "invalid_grant"
  | "quota_exceeded"
  | "permission_denied";

/**
 * Standard error interface for all hooks
 */
export interface StandardError {
  code: GoogleServiceError | string;
  message: string;
  details?: unknown;
  recoverable: boolean;
}

/**
 * Error classification utility
 */
export function classifyError(error: unknown): StandardError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("token") && message.includes("expired")) {
      return {
        code: "token_expired",
        message: "Authentication token has expired",
        recoverable: true,
      };
    }

    if (message.includes("invalid_grant")) {
      return {
        code: "invalid_grant",
        message: "Authentication credentials are invalid",
        recoverable: true,
      };
    }

    if (message.includes("quota")) {
      return {
        code: "quota_exceeded",
        message: "API quota has been exceeded",
        recoverable: false,
      };
    }

    if (message.includes("permission")) {
      return {
        code: "permission_denied",
        message: "Insufficient permissions for this operation",
        recoverable: true,
      };
    }

    if (message.includes("network") || message.includes("fetch")) {
      return {
        code: "network_error",
        message: "Network connection failed",
        recoverable: true,
      };
    }

    return {
      code: "api_error",
      message: error.message,
      recoverable: true,
    };
  }

  return {
    code: "api_error",
    message: "An unknown error occurred",
    recoverable: true,
  };
}

/**
 * Standard error toast notifications
 */
export function showErrorToast(error: StandardError, context?: string): void {
  const title = context ? `${context} Failed` : "Operation Failed";

  switch (error.code) {
    case "token_expired":
      toast.error(title, {
        description: "Please refresh your tokens or reconnect your account.",
        action: error.recoverable ? {
          label: "Refresh",
          onClick: () => window.location.reload(),
        } : undefined,
      });
      break;

    case "no_integration":
      toast.info("Service Not Connected", {
        description: "Please connect your Google account to use this feature.",
      });
      break;

    case "quota_exceeded":
      toast.warning(title, {
        description: "API quota exceeded. Please try again later.",
      });
      break;

    case "permission_denied":
      toast.error(title, {
        description: "Insufficient permissions. Please check your account settings.",
      });
      break;

    case "network_error":
      toast.error(title, {
        description: "Network connection failed. Please check your internet connection.",
        action: {
          label: "Retry",
          onClick: () => window.location.reload(),
        },
      });
      break;

    default:
      toast.error(title, {
        description: error.message,
        action: error.recoverable ? {
          label: "Retry",
          onClick: () => window.location.reload(),
        } : undefined,
      });
  }
}

/**
 * Success notification for sync operations
 */
export function showSyncSuccessToast(service: string, details?: { count?: number; duration?: string }): void {
  const title = `${service} Sync Complete`;
  let description = `${service} data has been synchronized successfully.`;

  if (details?.count !== undefined) {
    description = `${details.count} ${service.toLowerCase()} items synchronized successfully.`;
  }

  if (details?.duration) {
    description += ` (${details.duration})`;
  }

  toast.success(title, { description });
}

/**
 * Connection status notification
 */
export function showConnectionStatusToast(
  service: string,
  isConnected: boolean,
  autoRefreshed?: boolean
): void {
  if (isConnected) {
    if (autoRefreshed) {
      toast.success(`${service} Connected`, {
        description: "Authentication tokens were automatically refreshed.",
      });
    }
  } else {
    toast.warning(`${service} Disconnected`, {
      description: `Please reconnect your ${service} account to sync data.`,
    });
  }
}

/**
 * React Query error handler factory
 */
export function createErrorHandler(context: string): (error: unknown) => void {
  return (error: unknown) => {
    const standardError = classifyError(error);
    showErrorToast(standardError, context);

    // Log for debugging (development only)
    if (process.env.NODE_ENV === "development") {
      console.error(`[${context}] Error:`, error);
    }
  };
}

/**
 * Optimistic loading state provider
 *
 * Provides initial data that assumes connected state for better UX,
 * with graceful fallback when real data arrives.
 */
export function createOptimisticInitialData<T>(fallbackData: T): T {
  return fallbackData;
}

/**
 * Generic retry logic for recoverable errors
 */
export function shouldRetry(error: unknown, retryCount: number): boolean {
  const standardError = classifyError(error);

  // Don't retry non-recoverable errors
  if (!standardError.recoverable) {
    return false;
  }

  // Don't retry permission errors
  if (standardError.code === "permission_denied") {
    return false;
  }

  // Retry network errors and API errors up to 3 times
  if (standardError.code === "network_error" || standardError.code === "api_error") {
    return retryCount < 3;
  }

  // Don't retry auth errors (they need user intervention)
  if (standardError.code === "token_expired" || standardError.code === "invalid_grant") {
    return false;
  }

  return retryCount < 2;
}