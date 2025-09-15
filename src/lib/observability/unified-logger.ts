/**
 * Unified Logging System
 * Single source of truth for all application logging
 */

import { toast } from "sonner";
import {
  ERROR_CLASSIFICATION,
  type ErrorContext,
  type ErrorSeverity,
  type ErrorCategory,
} from "./error-classification";
// Note: Server-side logging functionality commented out to avoid circular deps
// TODO: Re-enable when pino-logger and log-context are properly set up
// import { log as pinoLogger, type LogBindings } from "@/server/lib/pino-logger";
// import { buildLogContext } from "@/server/lib/log-context";

export interface LogEntry {
  timestamp: string;
  level: ErrorSeverity;
  category: ErrorCategory;
  message: string;
  context?: ErrorContext | undefined;
  error?: Error | undefined;
  stack?: string | undefined;
  requestId?: string | undefined;
}

export interface SuccessToastOptions {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface InfoToastOptions {
  title?: string;
  description?: string;
  duration?: number;
}

class UnifiedLogger {
  private isDevelopment = process.env.NODE_ENV === "development";
  private isClient = typeof window !== "undefined";

  /**
   * 🔴 CRITICAL: System compromised, data at risk
   */
  async critical(message: string, context?: ErrorContext, error?: Error): Promise<void> {
    await this.log("critical", "security", message, context, error);
  }

  /**
   * 🔴 ERROR: User-facing failure, needs immediate resolution
   */
  async error(message: string, context?: ErrorContext, error?: Error): Promise<void> {
    await this.log("error", "api", message, context, error);
  }

  /**
   * 🟡 WARN: Degraded functionality, user should be aware
   */
  async warn(message: string, context?: ErrorContext, error?: Error): Promise<void> {
    await this.log("warn", "integration", message, context, error);
  }

  /**
   * 🔵 INFO: Successful operations, progress updates
   */
  async info(message: string, context?: ErrorContext): Promise<void> {
    await this.log("info", "business_logic", message, context);
  }

  /**
   * 🟢 DEBUG: Development troubleshooting
   */
  async debug(message: string, context?: ErrorContext): Promise<void> {
    if (this.isDevelopment) {
      await this.log("debug", "ui", message, context);
    }
  }

  /**
   * 🟢 SUCCESS: User-facing success notifications
   * Follows LOGGING_PATTERNS.md - use toast.success() for user achievements
   */
  success(title: string, description?: string, options?: SuccessToastOptions): void {
    if (this.isClient) {
      toast.success(title, {
        description: description ?? options?.description,
        action: options?.action,
      });
    }
    void this.log("info", "business_logic", `Success: ${title}`);
  }

  /**
   * 🔵 INFO: User progress/status messages
   * Follows LOGGING_PATTERNS.md - use toast.info() for progress updates
   */
  progress(title: string, description?: string, options?: InfoToastOptions): void {
    if (this.isClient) {
      const toastOptions: { description?: string; duration?: number } = {};
      if (description) toastOptions.description = description;
      if (options?.duration) toastOptions.duration = options.duration;

      toast.info(title, toastOptions);
    }
    // Note: progress is client-side only, no server logging needed
  }

  /**
   * 🟡 WARNING: User should know about issues
   * Follows LOGGING_PATTERNS.md - use toast() for user warnings
   */
  userWarning(title: string, description?: string): void {
    if (this.isClient) {
      toast(title, {
        description,
      });
    }
    void this.log("warn", "ui", `User warning: ${title}`);
  }

  /**
   * 🔴 USER ERROR: User-initiated action failed
   * Follows LOGGING_PATTERNS.md - toast.error() + console.error()
   */
  userError(title: string, error?: Error, context?: ErrorContext): void {
    if (this.isClient) {
      toast.error(title, {
        description: error?.message,
      });
    }

    // Always log technical details for developers
    console.error(`${title}:`, error);

    void this.log("error", "ui", title, context, error);
  }

  /**
   * 🚨 SECURITY: Potential security threats (silent logging)
   */
  async security(message: string, context?: ErrorContext, error?: Error): Promise<void> {
    // Never show security issues to users - silent logging only

    // SERVER-SIDE LOGIC
    if (!this.isClient) {
      // Use console for server-side security logging
      console.error(`🚨 SECURITY ALERT: ${message}`, {
        category: "security",
        operation: context?.operation ?? "security_event",
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...context?.additionalData,
      });
      return; // Stop here on the server
    }

    // CLIENT-SIDE LOGIC (development only)
    if (this.isDevelopment) {
      const logEntry: LogEntry = {
        timestamp: new Date().toISOString(),
        level: "critical",
        category: "security",
        message: `SECURITY ALERT: ${message}`,
        context: context ?? undefined,
        error,
        stack: error?.stack,
        requestId: this.generateRequestId(),
      };
      console.error("🚨 SECURITY:", logEntry);
    }

    // TODO: Production alert system integration
    // this.alertSecurityTeam(logEntry);
  }

  /**
   * Core logging method - routes to appropriate handlers
   * Environment-aware: delegates to Pino on server, console/toast on client
   */
  private async log(
    level: ErrorSeverity,
    category: ErrorCategory,
    message: string,
    context?: ErrorContext,
    error?: Error,
  ): Promise<void> {
    // SERVER-SIDE LOGIC
    if (!this.isClient) {
      // Use console for server-side logging
      const logPayload = {
        category,
        operation: context?.operation ?? "unspecified",
        stack: error?.stack,
        timestamp: new Date().toISOString(),
        ...context?.additionalData,
      };

      // Use console methods for structured logging
      switch (level) {
        case "critical":
        case "error":
          console.error(`[${level.toUpperCase()}] ${message}`, logPayload);
          break;
        case "warn":
          console.warn(`[${level.toUpperCase()}] ${message}`, logPayload);
          break;
        case "info":
          console.warn(`[${level.toUpperCase()}] ${message}`, logPayload);
          break;
        case "debug":
          if (process.env.NODE_ENV !== "production") {
            console.warn(`[${level.toUpperCase()}] ${message}`, logPayload);
          }
          break;
      }
      return; // Stop here on the server
    }

    // CLIENT-SIDE LOGIC
    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      context: context ?? undefined,
      error,
      stack: error?.stack,
      requestId: this.generateRequestId(),
    };

    // Console logging (development + production errors)
    if (this.shouldLogToConsole(level)) {
      this.logToConsole(logEntry);
    }

    // Metrics tracking
    if (this.shouldTrackMetrics(level)) {
      this.trackMetrics(logEntry);
    }
  }

  private shouldLogToConsole(level: ErrorSeverity): boolean {
    if (this.isDevelopment) return true; // All levels in dev
    return ["error", "critical"].includes(level); // Only errors in prod
  }

  private shouldTrackMetrics(level: ErrorSeverity): boolean {
    return ["error", "critical", "info"].includes(level);
  }

  private logToConsole(entry: LogEntry): void {
    const prefix = this.getLogPrefix(entry.level);

    if (entry.error) {
      // Use appropriate console method based on log level
      const consoleMethod = this.getConsoleMethod(entry.level);
      consoleMethod(`${prefix} ${entry.message}`);
      if (entry.context) consoleMethod("Context:", entry.context);
      consoleMethod("Error:", entry.error);
      if (entry.stack) consoleMethod("Stack:", entry.stack);
    } else {
      const consoleMethod = this.getConsoleMethod(entry.level);
      consoleMethod(`${prefix} ${entry.message}`, entry.context ?? "");
    }
  }

  private getLogPrefix(level: ErrorSeverity): string {
    const prefixes = {
      critical: "🔴 CRITICAL",
      error: "🔴 ERROR",
      warn: "🟡 WARN",
      info: "🔵 INFO",
      debug: "🟢 DEBUG",
    };
    return prefixes[level];
  }

  private getConsoleMethod(level: ErrorSeverity): typeof console.log {
    switch (level) {
      case "critical":
      case "error":
        return console.error;
      case "warn":
        return console.warn;
      case "info":
        return console.warn;
      case "debug":
        return console.warn;
      default:
        return console.warn;
    }
  }

  private trackMetrics(entry: LogEntry): void {
    // TODO: Integrate with analytics/metrics service
    console.warn("📊 Would track metrics:", {
      level: entry.level,
      category: entry.category,
      operation: entry.context?.operation,
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * Handle API responses with proper error classification
   */
  handleApiResponse<T>(
    response: { ok: boolean; data?: T; error?: string },
    operation: string,
    context?: ErrorContext,
  ): T | never {
    if (response.ok && response.data) {
      return response.data;
    }

    const errorMessage = response.error ?? "Unknown API error";
    const fullContext = { operation, ...context };

    void this.error(`API ${operation} failed: ${errorMessage}`, fullContext);
    throw new Error(errorMessage);
  }

  /**
   * Wrap async operations with comprehensive error handling
   */
  async withErrorHandling<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    options: {
      showUserError?: boolean;
      fallbackValue?: T;
      classification?: keyof typeof ERROR_CLASSIFICATION;
    } = {},
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      const classification = options.classification ?? "API_FAILURE";
      const config = ERROR_CLASSIFICATION[classification];

      if (config.action.showToast && options.showUserError !== false) {
        toast.error(config.action.toastTitle ?? "Operation Failed", {
          description: error instanceof Error ? error.message : "An unexpected error occurred",
        });
      }

      void this.log(
        config.severity,
        config.category,
        `${context.operation} failed: ${error instanceof Error ? error.message : String(error)}`,
        context,
        error instanceof Error ? error : undefined,
      );

      if (options.fallbackValue !== undefined) {
        return options.fallbackValue;
      }

      throw error;
    }
  }
}

// Export singleton instance
export const logger = new UnifiedLogger();

// Export convenience functions for common patterns
export const logError = async (
  message: string,
  context?: ErrorContext,
  error?: Error,
): Promise<void> => await logger.error(message, context, error);

export const logSecurity = async (
  message: string,
  context?: ErrorContext,
  error?: Error,
): Promise<void> => await logger.security(message, context, error);

export const logSuccess = (message: string, options?: SuccessToastOptions): void =>
  logger.success(message, undefined, options);

export const logInfo = (message: string, options?: InfoToastOptions): void =>
  logger.progress(message, options?.description, options);

export const handleApiError = <T>(
  response: { ok: boolean; data?: T; error?: string },
  operation: string,
  context?: ErrorContext,
): T => {
  const result = logger.handleApiResponse(response, operation, context);
  return result;
};
