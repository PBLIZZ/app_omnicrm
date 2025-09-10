/**
 * Logging Patterns - Direct Implementation of LOGGING_PATTERNS.md
 *
 * This file provides the exact patterns defined in your documentation,
 * enhanced with security classification and structured logging.
 */

import { toast } from "sonner";
import { logger } from "./unified-logger";

/**
 * PATTERN 1: User Progress/Status Messages
 * Use: toast.info() or toast.success()
 */
export const userProgress = {
  /**
   * Show progress to user for initiated actions
   * @example userProgress.info("Generating AI insights...")
   */
  info: (message: string, description?: string) => {
    toast.info(message, { description });
  },

  /**
   * Show completion of user-initiated actions
   * @example userProgress.success("Contact sync completed!")
   */
  success: (message: string, description?: string) => {
    toast.success(message, { description });
  },
};

/**
 * PATTERN 2: User-Facing Errors
 * Use: toast.error() + console.error() for debugging
 */
export const userErrors = {
  /**
   * User tried to do something that failed
   * @example userErrors.show("Failed to generate insights", error)
   */
  show: (message: string, error?: Error) => {
    // User sees the error
    toast.error(message);

    // Developers see technical details
    console.error(`${message}:`, error);
  },
};

/**
 * PATTERN 3: Technical/Background Errors
 * Use: logger.debug() (dev console only)
 */
export const technicalErrors = {
  /**
   * Internal processing errors users shouldn't see
   * @example technicalErrors.log("Failed to decode Gmail message part", error)
   */
  log: (message: string, error?: Error, additionalData?: Record<string, unknown>) => {
    void logger.debug(message, {
      operation: "background_process",
      ...(additionalData && { additionalData }),
    });

    // Also log to console in development
    if (process.env.NODE_ENV === "development" && error) {
      console.warn(message, error);
    }
  },
};

/**
 * PATTERN 4: User-Facing Warnings
 * Use: toast() with appropriate variant
 */
export const userWarnings = {
  /**
   * User should know about this
   * @example userWarnings.show("Gmail sync may take longer than usual", "Large mailbox detected")
   */
  show: (message: string, description?: string) => {
    toast(message, { description });
  },
};

/**
 * PATTERN 5: Technical Warnings
 * Use: console.warn() (dev console only)
 */
export const technicalWarnings = {
  /**
   * Developer should know, user shouldn't
   * @example technicalWarnings.log("Deprecated API endpoint used", { endpoint: "/old-api" })
   */
  log: (message: string, data?: unknown) => {
    if (process.env.NODE_ENV === "development") {
      console.warn(message, data);
    }

    // Also use structured logging
    void logger.warn(message, {
      operation: "technical_warning",
      additionalData: typeof data === "object" ? (data as Record<string, unknown>) : { data },
    });
  },
};

/**
 * Enhanced patterns with security considerations
 */
export const securityPatterns = {
  /**
   * Security threats - NEVER show to users, silent logging only
   * @example securityPatterns.threat("SQL injection attempt detected", { query, ip })
   */
  threat: (message: string, context?: Record<string, unknown>) => {
    // NEVER toast to user - silent logging only
    void logger.security(message, {
      operation: "security_threat_detected",
      ...context,
    });
  },

  /**
   * Authentication/authorization issues - show generic message to user
   * @example securityPatterns.authFailure("Invalid credentials", error)
   */
  authFailure: (userMessage: string, technicalError?: Error) => {
    // Generic user message
    toast.error(userMessage);

    // Technical details for developers
    void logger.security(
      "Authentication failure",
      {
        operation: "auth_failure",
        additionalData: { userMessage },
      },
      technicalError,
    );
  },
};

/**
 * Decision matrix implementation from LOGGING_PATTERNS.md
 */
export const decisionMatrix = {
  /**
   * AI insight generation progress - User initiated? ✅ User needs to know? ✅
   */
  aiInsightProgress: (message: string = "Generating AI insights...") => {
    userProgress.info(message);
  },

  /**
   * AI insight generation failed - User initiated? ✅ User needs to know? ✅
   */
  aiInsightFailed: (error?: Error) => {
    userErrors.show("Failed to generate insights", error);
  },

  /**
   * Background email processing failed - User initiated? ❌ User needs to know? ❌
   */
  backgroundEmailFailed: (error: Error, emailId?: string) => {
    technicalErrors.log("Background email processing failed", error, { emailId });
  },

  /**
   * Network connection lost - User initiated? ❌ User needs to know? ✅
   */
  networkConnectionLost: () => {
    userWarnings.show("Connection lost", "Trying to reconnect...");
  },

  /**
   * Invalid API response format - User initiated? ❌ User needs to know? ❌
   */
  invalidApiResponse: (response: unknown, endpoint: string) => {
    technicalErrors.log("Invalid API response format", undefined, { response, endpoint });
  },

  /**
   * Contact sync completed - User initiated? ✅ User needs to know? ✅
   */
  contactSyncCompleted: (count?: number) => {
    userProgress.success(
      "Contact sync completed",
      count ? `${count} contacts processed` : undefined,
    );
  },
};

/**
 * Quick access exports matching your existing patterns
 */
export {
  // Direct toast usage (as per your patterns)
  toast,

  // Structured logging for technical details
  logger,
};
