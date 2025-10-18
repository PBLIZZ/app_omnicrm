/**
 * Structured Logger
 *
 * Provides structured logging with proper error handling and sanitization.
 * Replaces console.error with proper logging infrastructure.
 * Integrates with Sentry for error tracking and monitoring.
 */

import { extractSafeErrorDetails, shouldLogErrorDetails } from "./error-sanitizer";
import { captureError, captureMessage, addBreadcrumb } from "@/lib/sentry";

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

export interface LogContext {
  userId?: string;
  requestId?: string;
  operation: string;
  endpoint?: string;
  userAgent?: string;
  ip?: string;
  duration?: number;
  [key: string]: unknown;
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context: LogContext;
  error?:
    | {
        name: string;
        message: string;
        stack?: string;
        code?: string;
        category?: string;
      }
    | undefined;
  metadata?: Record<string, unknown> | undefined;
}

class StructuredLogger {
  private isDevelopment = process.env.NODE_ENV === "development";

  /**
   * Log a message with structured context
   */
  log(
    level: LogLevel,
    message: string,
    context: LogContext,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context,
      metadata,
    };

    // Add error details if provided and safe to log
    if (error && shouldLogErrorDetails(error)) {
      logEntry.error = extractSafeErrorDetails(error) as LogEntry["error"];
    }

    // Add breadcrumb to Sentry for debugging
    addBreadcrumb(message, context.operation, level === "warn" ? "warning" : level, {
      ...context,
      ...metadata,
    });

    // Send to Sentry for error tracking
    if (level === "error" || level === "fatal") {
      if (error) {
        captureError(error, context);
      } else {
        captureMessage(message, level, context);
      }
    } else if (level === "warn") {
      captureMessage(message, "warning", context);
    }

    // In development, use console with colors
    if (this.isDevelopment) {
      this.logToConsole(logEntry);
      return;
    }

    // In production, use structured JSON logging
    this.logToStructured(logEntry);
  }

  /**
   * Development console logging with colors
   */
  private logToConsole(entry: LogEntry): void {
    const { level, message, timestamp, context, error } = entry;

    const levelColors = {
      debug: "\x1b[36m", // Cyan
      info: "\x1b[32m", // Green
      warn: "\x1b[33m", // Yellow
      error: "\x1b[31m", // Red
      fatal: "\x1b[35m", // Magenta
    };

    const resetColor = "\x1b[0m";
    const color = levelColors[level] || resetColor;

    console.log(`${color}[${level.toUpperCase()}]${resetColor} ${timestamp} - ${message}`);

    if (context.operation) {
      console.log(`  Operation: ${context.operation}`);
    }

    if (context.endpoint) {
      console.log(`  Endpoint: ${context.endpoint}`);
    }

    if (context.userId) {
      console.log(`  User: ${context.userId}`);
    }

    if (context.requestId) {
      console.log(`  Request: ${context.requestId}`);
    }

    if (error) {
      console.log(`  Error: ${error.name}: ${error.message}`);
      if (error.stack) {
        console.log(`  Stack: ${error.stack}`);
      }
    }
  }

  /**
   * Production structured JSON logging
   */
  private logToStructured(entry: LogEntry): void {
    // In production, this would typically send to a logging service
    // like DataDog, New Relic, or CloudWatch
    console.log(JSON.stringify(entry));
  }

  /**
   * Debug level logging
   */
  debug(message: string, context: LogContext, metadata?: Record<string, unknown>): void {
    this.log("debug", message, context, undefined, metadata);
  }

  /**
   * Info level logging
   */
  info(message: string, context: LogContext, metadata?: Record<string, unknown>): void {
    this.log("info", message, context, undefined, metadata);
  }

  /**
   * Warning level logging
   */
  warn(
    message: string,
    context: LogContext,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.log("warn", message, context, error, metadata);
  }

  /**
   * Error level logging
   */
  error(
    message: string,
    context: LogContext,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.log("error", message, context, error, metadata);
  }

  /**
   * Fatal level logging
   */
  fatal(
    message: string,
    context: LogContext,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.log("fatal", message, context, error, metadata);
  }

  /**
   * Log API request/response
   */
  logApiRequest(
    method: string,
    endpoint: string,
    context: LogContext,
    metadata?: Record<string, unknown>,
  ): void {
    this.info(
      `${method} ${endpoint}`,
      {
        ...context,
        operation: "api_request",
        endpoint,
        method,
      },
      metadata,
    );
  }

  /**
   * Log API response
   */
  logApiResponse(
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number,
    context: LogContext,
    error?: unknown,
  ): void {
    const level = statusCode >= 500 ? "error" : statusCode >= 400 ? "warn" : "info";
    const message = `${method} ${endpoint} - ${statusCode} (${duration}ms)`;

    this.log(
      level,
      message,
      {
        ...context,
        operation: "api_response",
        endpoint,
        method,
        duration,
        statusCode,
      },
      error,
    );
  }

  /**
   * Log database operations
   */
  logDatabaseOperation(
    operation: string,
    table: string,
    context: LogContext,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(
      "info",
      `Database ${operation} on ${table}`,
      {
        ...context,
        operation: "database",
        table,
      },
      error,
      metadata,
    );
  }

  /**
   * Log authentication events
   */
  logAuthEvent(
    event: string,
    context: LogContext,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(
      "info",
      `Auth event: ${event}`,
      {
        ...context,
        operation: "authentication",
        event,
      },
      error,
      metadata,
    );
  }

  /**
   * Log security events
   */
  logSecurityEvent(
    event: string,
    context: LogContext,
    error?: unknown,
    metadata?: Record<string, unknown>,
  ): void {
    this.log(
      "warn",
      `Security event: ${event}`,
      {
        ...context,
        operation: "security",
        event,
      },
      error,
      metadata,
    );
  }
}

// Export singleton instance
export const logger = new StructuredLogger();

// Export convenience functions
export const log = logger.log.bind(logger);
export const logDebug = logger.debug.bind(logger);
export const logInfo = logger.info.bind(logger);
export const logWarn = logger.warn.bind(logger);
export const logError = logger.error.bind(logger);
export const logFatal = logger.fatal.bind(logger);
export const logApiRequest = logger.logApiRequest.bind(logger);
export const logApiResponse = logger.logApiResponse.bind(logger);
export const logDatabaseOperation = logger.logDatabaseOperation.bind(logger);
export const logAuthEvent = logger.logAuthEvent.bind(logger);
export const logSecurityEvent = logger.logSecurityEvent.bind(logger);
