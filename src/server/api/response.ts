// Server Response System
// Extracted from src/server/utils/api-helpers.ts for better organization
// Handles API response building, error handling, and response utilities

import { NextResponse } from "next/server";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

// ============================================================================
// ERROR CODES AND TYPES
// ============================================================================

// Enhanced API Error Codes (extracted from api-helpers.ts lines 28-38)
export const API_ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  CONFLICT: "CONFLICT",
  RATE_LIMITED: "RATE_LIMITED",
  DATABASE_ERROR: "DATABASE_ERROR",
  INTEGRATION_ERROR: "INTEGRATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

// HTTP status code mappings (extracted from api-helpers.ts lines 618-628)
export const ERROR_STATUS_CODES: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  DATABASE_ERROR: 500,
  INTEGRATION_ERROR: 502,
  INTERNAL_ERROR: 500,
};

// Response types for compatibility
export interface OkResponse<T = unknown> {
  ok: true;
  data: T;
  message?: string;
  timestamp: string;
}

export interface ErrorResponse {
  ok: false;
  error: string;
  code?: string;
  details?: unknown;
  timestamp: string;
  requestId?: string;
}

export type ApiResponse<T = unknown> = OkResponse<T> | ErrorResponse;

// Enhanced error response format with correlation ID
export interface APIErrorResponse {
  ok: false;
  error: {
    code: ApiErrorCode;
    message: string;
    requestId: string;
    timestamp: string;
    details?: unknown;
  };
}

export interface APISuccessResponse<T> {
  ok: true;
  data: T;
  requestId?: string;
  timestamp?: string;
}

// Custom API Error class for structured error handling
export class APIError extends Error {
  constructor(
    public code: ApiErrorCode,
    public override message: string,
    public statusCode: number,
    public details?: unknown,
  ) {
    super(message);
    this.name = "APIError";
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Enhanced response helpers that build on existing ok/err pattern
export function apiOk<T>(
  data: T,
  options: { status?: number; requestId?: string } = {},
): NextResponse<APISuccessResponse<T>> {
  const response: APISuccessResponse<T> = {
    ok: true,
    data,
    ...(options.requestId && { requestId: options.requestId }),
    timestamp: new Date().toISOString(),
  };

  const nextResponse = NextResponse.json(response, { status: options.status ?? 200 });
  if (options.requestId) {
    nextResponse.headers.set("x-request-id", options.requestId);
  }
  return nextResponse;
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  statusCode: number,
  requestId?: string,
  details?: unknown,
): NextResponse<APIErrorResponse> {
  const response: APIErrorResponse = {
    ok: false,
    error: {
      code,
      message,
      requestId: requestId ?? "unknown",
      timestamp: new Date().toISOString(),
      ...(details && typeof details === "object" && details !== null && !Array.isArray(details)
        ? { details }
        : {}),
    },
  };

  const nextResponse = NextResponse.json(response, { status: statusCode });
  if (requestId) {
    nextResponse.headers.set("x-request-id", requestId);
  }
  return nextResponse;
}

// ============================================================================
// STANDARDIZED API RESPONSE BUILDER (from api-response-standardizer.ts)
// ============================================================================

/**
 * Standardized API Response Builder (extracted from api-helpers.ts lines 633-748)
 */
export class ApiResponseBuilder {
  private requestId: string;
  private operation: string;

  constructor(operation: string, requestId?: string) {
    this.operation = operation;
    this.requestId = requestId ?? this.generateRequestId();
  }

  /**
   * Success response with data
   */
  success<T>(data: T, message?: string, status: number = 200): NextResponse {
    const response: OkResponse<T> = {
      ok: true,
      data,
      timestamp: new Date().toISOString(),
      ...(message && { message }),
    };

    void logger.info(`API ${this.operation} succeeded`, {
      operation: this.operation,
      requestId: this.requestId,
      additionalData: { hasData: !!data, messageIncluded: !!message, status },
    });

    return NextResponse.json(response, { status });
  }

  /**
   * Error response with proper classification and logging
   */
  error(
    message: string,
    code: ApiErrorCode = API_ERROR_CODES.INTERNAL_ERROR,
    details?: unknown,
    originalError?: Error,
  ): NextResponse {
    const response: ErrorResponse = {
      ok: false,
      error: message,
      code,
      details: process.env.NODE_ENV === "development" ? details : undefined,
      timestamp: new Date().toISOString(),
      requestId: this.requestId,
    };

    const status = ERROR_STATUS_CODES[code];

    // Log based on error severity
    if (code === API_ERROR_CODES.INTERNAL_ERROR || status >= 500) {
      void logger.error(
        `API ${this.operation} failed: ${message}`,
        {
          operation: this.operation,
          requestId: this.requestId,
          additionalData: { code, status, details },
        },
        originalError,
      );
    } else if (status >= 400) {
      void logger.warn(`API ${this.operation} client error: ${message}`, {
        operation: this.operation,
        requestId: this.requestId,
        additionalData: { code, status },
      });
    }

    return NextResponse.json(response, { status });
  }

  /**
   * Validation error (400)
   */
  validationError(message: string, details?: unknown): NextResponse {
    return this.error(message, API_ERROR_CODES.VALIDATION_ERROR, details);
  }

  /**
   * Unauthorized error (401)
   */
  unauthorized(message: string = "Authentication required"): NextResponse {
    return this.error(message, API_ERROR_CODES.UNAUTHORIZED);
  }

  /**
   * Forbidden error (403)
   */
  forbidden(message: string = "Access denied"): NextResponse {
    return this.error(message, API_ERROR_CODES.FORBIDDEN);
  }

  /**
   * Not found error (404)
   */
  notFound(message: string = "Resource not found"): NextResponse {
    return this.error(message, API_ERROR_CODES.NOT_FOUND);
  }

  /**
   * Database error (500)
   */
  databaseError(message: string, originalError?: Error): NextResponse {
    return this.error(message, API_ERROR_CODES.DATABASE_ERROR, undefined, originalError);
  }

  /**
   * Server-Sent Events (SSE) response for streaming data
   * This is an exception to the standard response pattern for real-time streaming
   */
  serverSentEvents(
    streamBuilder: (encoder: TextEncoder, controller: ReadableStreamDefaultController) => void,
    userId?: string,
  ): Response {
    const stream = new ReadableStream({
      start(controller) {
        streamBuilder(new TextEncoder(), controller);
      },
      cancel() {
        // Allow custom cleanup in the stream builder
      },
    });

    void logger.info(`SSE stream created for ${this.operation}`, {
      operation: this.operation,
      requestId: this.requestId,
      additionalData: { userId, streamType: "server-sent-events" },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    });
  }

  /**
   * File download response for data exports and file attachments
   * This is an exception to the standard JSON response pattern for file downloads
   */
  fileDownload(
    content: BodyInit,
    filename: string,
    contentType: string = "application/octet-stream",
    additionalHeaders?: Record<string, string>,
  ): Response {
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Pragma: "no-cache",
      Expires: "0",
      ...additionalHeaders,
    };

    void logger.info(`File download response created for ${this.operation}`, {
      operation: this.operation,
      requestId: this.requestId,
      additionalData: { filename, contentType, responseType: "file-download" },
    });

    return new Response(content, {
      status: 200,
      headers,
    });
  }

  /**
   * Raw response for proxy/streaming patterns where data should not be wrapped
   * This is an exception to the standard JSON response pattern for raw data passthrough
   */
  raw(
    content: BodyInit,
    contentType: string = "application/json",
    status: number = 200,
    additionalHeaders?: Record<string, string>,
  ): Response {
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      ...additionalHeaders,
    };

    void logger.info(`Raw response created for ${this.operation}`, {
      operation: this.operation,
      requestId: this.requestId,
      additionalData: { contentType, status, responseType: "raw" },
    });

    return new Response(content, {
      status,
      headers,
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Middleware wrapper for API routes with standardized responses
 */
export function withApiResponse(operation: string): <T extends unknown[]>(
  handler: (apiResponse: ApiResponseBuilder, ...args: T) => Promise<Response>,
) => (...args: T) => Promise<Response> {
  return function <T extends unknown[]>(
    handler: (apiResponse: ApiResponseBuilder, ...args: T) => Promise<Response>,
  ): (...args: T) => Promise<Response> {
    return async (...args: T): Promise<Response> => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const apiResponse = new ApiResponseBuilder(operation, requestId);

      try {
        return await handler(apiResponse, ...args);
      } catch (error) {
        // Catch any unhandled errors and return standardized error response
        const errorMessage =
          error instanceof Error ? error.message : "An unexpected error occurred";

        // Log the unhandled error
        void logger.error(
          `Unhandled error in API ${operation}`,
          {
            operation,
            requestId,
            additionalData: { unhandled: true },
          },
          ensureError(error),
        );

        return apiResponse.error(
          errorMessage,
          API_ERROR_CODES.INTERNAL_ERROR,
          undefined,
          error instanceof Error ? error : undefined,
        );
      }
    };
  };
}
