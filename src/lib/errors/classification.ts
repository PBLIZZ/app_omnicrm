/**
 * Error Classification System
 *
 * Provides structured error analysis, categorization, and recovery suggestions
 * for improved error handling and user experience.
 */

import { ERROR_CATEGORIES } from "@/lib/constants/errorCategories";

export type ErrorCategory =
  | "auth"
  | "network"
  | "rate_limit"
  | "validation"
  | "permission"
  | "system"
  | "unknown";

export interface ErrorClassification {
  category: ErrorCategory;
  severity: "low" | "medium" | "high" | "critical";
  retryable: boolean;
  recoveryStrategies: Array<{
    action: string;
    label: string;
    description: string;
    autoRetryable: boolean;
    urgency?: "low" | "medium" | "high" | "immediate";
    estimatedTime?: string;
    preventionTips?: string[];
  }>;
}

/**
 * Classify an error and provide structured recovery information
 */
export function classifyError(error: Error | string): ErrorClassification {
  // Early guard to normalize and null-check message/code
  if (!error) {
    return {
      category: ERROR_CATEGORIES.SYSTEM, // Using system as fallback for unknown
      severity: "medium",
      retryable: true,
      recoveryStrategies: [
        {
          action: "retry_generic",
          label: "Try Again",
          description: "Retry the operation with a short delay",
          autoRetryable: true,
          urgency: "medium",
          estimatedTime: "1 minute",
        },
      ],
    };
  }

  const message = typeof error === "string" ? error : error.message;
  const code = typeof error === "object" && "code" in error ? String(error.code) : "";
  const status = typeof error === "object" && "status" in error ? Number(error.status) : 0;

  if (!message) {
    return {
      category: ERROR_CATEGORIES.SYSTEM, // Using system as fallback for unknown
      severity: "medium",
      retryable: true,
      recoveryStrategies: [
        {
          action: "retry_generic",
          label: "Try Again",
          description: "Retry the operation with a short delay",
          autoRetryable: true,
          urgency: "medium",
          estimatedTime: "1 minute",
        },
      ],
    };
  }

  const lowerMessage = message.toLowerCase();

  // Authentication errors - check status code first, then precise patterns
  if (
    status === 401 ||
    /\b(unauthorized|invalid_grant|invalid_token|authentication failed)\b/.test(lowerMessage)
  ) {
    return {
      category: ERROR_CATEGORIES.AUTH,
      severity: "high",
      retryable: true,
      recoveryStrategies: [
        {
          action: "refresh_token",
          label: "Refresh Access Token",
          description: "Refresh your Google authentication token and try again",
          autoRetryable: true,
          urgency: "high",
          estimatedTime: "5 seconds",
        },
        {
          action: "re_authenticate",
          label: "Re-authenticate",
          description: "Sign out and sign back in to Google",
          autoRetryable: false,
          urgency: "medium",
          estimatedTime: "2 minutes",
          preventionTips: ["Keep browser session active", "Don't revoke app permissions"],
        },
      ],
    };
  }

  // Rate limiting errors - check status code first, then precise patterns
  if (status === 429 || /\b(rate limit|quota exceeded|too many requests)\b/.test(lowerMessage)) {
    return {
      category: ERROR_CATEGORIES.RATE_LIMIT,
      severity: "medium",
      retryable: true,
      recoveryStrategies: [
        {
          action: "exponential_backoff",
          label: "Wait and Retry",
          description: "Wait for rate limit to reset and retry automatically",
          autoRetryable: true,
          urgency: "low",
          estimatedTime: "1-60 minutes",
        },
        {
          action: "reduce_frequency",
          label: "Reduce Sync Frequency",
          description: "Adjust sync settings to avoid hitting rate limits",
          autoRetryable: false,
          urgency: "medium",
          estimatedTime: "5 minutes",
          preventionTips: ["Increase sync intervals", "Reduce data scope"],
        },
      ],
    };
  }

  // Network errors - check specific codes and precise patterns
  if (
    code === "ENOTFOUND" ||
    code === "ETIMEDOUT" ||
    code === "ECONNREFUSED" ||
    /\b(network error|connection failed|connection timeout|fetch failed|fetch error)\b/.test(
      lowerMessage,
    )
  ) {
    return {
      category: ERROR_CATEGORIES.NETWORK,
      severity: "medium",
      retryable: true,
      recoveryStrategies: [
        {
          action: "retry_immediate",
          label: "Retry Now",
          description: "Retry the operation immediately",
          autoRetryable: true,
          urgency: "medium",
          estimatedTime: "30 seconds",
        },
        {
          action: "check_connection",
          label: "Check Internet Connection",
          description: "Verify your internet connection is stable",
          autoRetryable: false,
          urgency: "high",
          estimatedTime: "2 minutes",
          preventionTips: ["Use stable internet connection", "Avoid public WiFi for sync"],
        },
      ],
    };
  }

  // Permission errors - check status code first, then precise patterns
  if (
    status === 403 ||
    /\b(permission denied|forbidden|insufficient scope|access denied)\b/.test(lowerMessage)
  ) {
    return {
      category: ERROR_CATEGORIES.PERMISSION,
      severity: "high",
      retryable: false,
      recoveryStrategies: [
        {
          action: "review_permissions",
          label: "Review App Permissions",
          description: "Check and grant necessary permissions in Google account settings",
          autoRetryable: false,
          urgency: "high",
          estimatedTime: "5 minutes",
          preventionTips: ["Grant all requested permissions", "Don't revoke app access"],
        },
        {
          action: "re_authorize",
          label: "Re-authorize App",
          description: "Remove and re-add app authorization in Google",
          autoRetryable: false,
          urgency: "medium",
          estimatedTime: "10 minutes",
        },
      ],
    };
  }

  // Validation errors - check status code first, then precise patterns
  if (
    status === 400 ||
    status === 422 ||
    /\b(validation error|invalid input|invalid format|malformed data|bad request)\b/.test(
      lowerMessage,
    )
  ) {
    return {
      category: ERROR_CATEGORIES.DATA_FORMAT, // Using data_format for validation errors
      severity: "medium",
      retryable: false,
      recoveryStrategies: [
        {
          action: "check_data",
          label: "Verify Data Format",
          description: "Check that your data meets the required format",
          autoRetryable: false,
          urgency: "medium",
          estimatedTime: "5 minutes",
          preventionTips: ["Validate input data", "Follow API documentation"],
        },
        {
          action: "update_settings",
          label: "Update Settings",
          description: "Review and update your sync settings",
          autoRetryable: false,
          urgency: "low",
          estimatedTime: "10 minutes",
        },
      ],
    };
  }

  // System errors - check status code first, then precise patterns
  if (
    status >= 500 ||
    /\b(internal server error|system error|server error|service unavailable)\b/.test(lowerMessage)
  ) {
    return {
      category: ERROR_CATEGORIES.SYSTEM,
      severity: "high",
      retryable: true,
      recoveryStrategies: [
        {
          action: "retry_later",
          label: "Retry Later",
          description: "Wait for system recovery and retry automatically",
          autoRetryable: true,
          urgency: "low",
          estimatedTime: "15-30 minutes",
        },
        {
          action: "contact_support",
          label: "Contact Support",
          description: "Report the system error to support team",
          autoRetryable: false,
          urgency: "medium",
          estimatedTime: "1 hour",
          preventionTips: ["Monitor status page", "Report persistent issues"],
        },
      ],
    };
  }

  // Default/unknown error
  return {
    category: ERROR_CATEGORIES.SYSTEM, // Using system as fallback for unknown
    severity: "medium",
    retryable: true,
    recoveryStrategies: [
      {
        action: "retry_generic",
        label: "Try Again",
        description: "Retry the operation with a short delay",
        autoRetryable: true,
        urgency: "medium",
        estimatedTime: "1 minute",
      },
      {
        action: "review_logs",
        label: "Review Error Details",
        description: "Check error logs for more specific information",
        autoRetryable: false,
        urgency: "low",
        estimatedTime: "5 minutes",
        preventionTips: ["Monitor error patterns", "Keep detailed logs"],
      },
    ],
  };
}
