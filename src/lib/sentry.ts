/**
 * Sentry Configuration
 *
 * Centralized Sentry setup for error tracking and performance monitoring.
 * Integrates with existing structured logging system.
 */

import * as Sentry from "@sentry/nextjs";

// Initialize Sentry with proper configuration
export function initSentry() {
  if (typeof window === "undefined") {
    // Server-side initialization
    if (process.env["NEXT_PUBLIC_SENTRY_DSN"]) {
      const integrations = [Sentry.consoleIntegration(), Sentry.rewriteFramesIntegration()];

      // Only add server-specific integrations if not in edge runtime
      if (process.env["NEXT_RUNTIME"] !== "edge") {
        try {
          integrations.push(
            Sentry.httpIntegration({
              breadcrumbs: true,
            }),
            Sentry.prismaIntegration(),
          );
        } catch (error) {
          // Silently fail if integrations are not available
          console.warn("Some Sentry integrations not available:", error);
        }
      }

      Sentry.init({
        dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"],
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        profilesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        debug: process.env.NODE_ENV === "development",
        beforeSend(event, hint) {
          // Filter out development errors and known non-critical issues
          if (process.env.NODE_ENV === "development") {
            return null;
          }

          // Filter out known non-critical errors
          if (event.exception) {
            const error = hint.originalException;
            if (error instanceof Error) {
              // Filter out common non-critical errors
              const nonCriticalPatterns = [
                /Network Error/,
                /Failed to fetch/,
                /ResizeObserver loop limit exceeded/,
                /Non-Error promise rejection/,
              ];

              if (nonCriticalPatterns.some((pattern) => pattern.test(error.message))) {
                return null;
              }
            }
          }

          return event;
        },
        integrations,
      });
    }
  } else {
    // Client-side initialization
    if (process.env["NEXT_PUBLIC_SENTRY_DSN"]) {
      Sentry.init({
        dsn: process.env["NEXT_PUBLIC_SENTRY_DSN"],
        environment: process.env.NODE_ENV,
        tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
        debug: process.env.NODE_ENV === "development",
        beforeSend(event, hint) {
          // Filter out development errors and known non-critical issues
          if (process.env.NODE_ENV === "development") {
            return null;
          }

          // Filter out known non-critical errors
          if (event.exception) {
            const error = hint.originalException;
            if (error instanceof Error) {
              // Filter out common non-critical errors
              const nonCriticalPatterns = [
                /Network Error/,
                /Failed to fetch/,
                /ResizeObserver loop limit exceeded/,
                /Non-Error promise rejection/,
                /Script error/,
              ];

              if (nonCriticalPatterns.some((pattern) => pattern.test(error.message))) {
                return null;
              }
            }
          }

          return event;
        },
        integrations: [
          Sentry.browserTracingIntegration(),
          Sentry.replayIntegration({
            maskAllText: false,
            blockAllMedia: false,
          }),
        ],
      });
    }
  }
}

/**
 * Enhanced error reporting with context
 */
export function captureError(
  error: unknown,
  context: {
    operation: string;
    endpoint?: string;
    userId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  Sentry.withScope((scope) => {
    // Set context
    scope.setTag("operation", context.operation);
    if (context.endpoint) scope.setTag("endpoint", context.endpoint);
    if (context.userId) scope.setUser({ id: context.userId });
    if (context.requestId) scope.setTag("requestId", context.requestId);

    // Set additional context
    if (context.metadata) {
      Object.entries(context.metadata).forEach(([key, value]) => {
        if (typeof value === "object" && value !== null) {
          scope.setContext(key, value as Record<string, unknown>);
        }
      });
    }

    // Capture the error
    Sentry.captureException(error);
  });
}

/**
 * Capture message with context
 */
export function captureMessage(
  message: string,
  level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
  context?: {
    operation?: string;
    endpoint?: string;
    userId?: string;
    requestId?: string;
    metadata?: Record<string, unknown>;
  },
) {
  Sentry.withScope((scope) => {
    if (context) {
      if (context.operation) scope.setTag("operation", context.operation);
      if (context.endpoint) scope.setTag("endpoint", context.endpoint);
      if (context.userId) scope.setUser({ id: context.userId });
      if (context.requestId) scope.setTag("requestId", context.requestId);

      if (context.metadata) {
        Object.entries(context.metadata).forEach(([key, value]) => {
          if (typeof value === "object" && value !== null) {
            scope.setContext(key, value as Record<string, unknown>);
          }
        });
      }
    }

    Sentry.captureMessage(message, level);
  });
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}) {
  Sentry.setUser(user);
}

/**
 * Add breadcrumb for debugging
 */
export function addBreadcrumb(
  message: string,
  category: string,
  level: "debug" | "info" | "warning" | "error" | "fatal" = "info",
  data?: Record<string, unknown>,
) {
  Sentry.addBreadcrumb({
    message,
    category,
    level,
    ...(data && { data }),
    timestamp: Date.now() / 1000,
  });
}

/**
 * Performance monitoring
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startSpan({ name, op }, () => {});
}

/**
 * Set span context
 */
export function setSpanContext(span: Sentry.Span, context: Record<string, unknown>) {
  span.setAttributes(context as Record<string, string | number | boolean | undefined>);
}

/**
 * Finish span
 */
export function finishSpan(
  span: Sentry.Span,
  status?:
    | "cancelled"
    | "unknown_error"
    | "internal_error"
    | "unauthenticated"
    | "permission_denied"
    | "not_found"
    | "already_exists"
    | "failed_precondition"
    | "aborted"
    | "out_of_range"
    | "unimplemented"
    | "unavailable"
    | "data_loss",
) {
  if (status) {
    (span.setStatus as any)({ code: status });
  }
  span.end();
}

/**
 * Capture request errors with proper instrumentation
 */
export function captureRequestError(
  err: unknown,
  request: {
    path: string;
    method: string;
    headers: Record<string, string | string[] | undefined>;
  },
) {
  Sentry.withScope((scope) => {
    // Set request context
    scope.setTag("request.path", request.path);
    scope.setTag("request.method", request.method);
    scope.setContext("request", {
      path: request.path,
      method: request.method,
      headers: request.headers,
    });

    // Capture the error
    Sentry.captureException(err);
  });
}

// Export Sentry instance for direct use if needed
export { Sentry };
