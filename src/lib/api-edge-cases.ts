/**
 * Specialized API Handlers for Edge Cases
 *
 * Extended handlers for auth flows, file uploads, public routes, webhooks, and streaming
 */

import { z } from "zod";
import type { NextRequest } from "next/server";
import { AppError } from "@/lib/errors/app-error";
import { createSanitizedErrorResponse } from "@/server/lib/error-sanitizer";
import { logError } from "@/server/lib/structured-logger";

// ============================================================================
// AUTH FLOW HANDLERS
// ============================================================================

/**
 * Auth Flow Handler (OAuth callbacks, login, logout)
 *
 * Handles special auth cases with redirect responses and cookie management
 */
export function handleAuthFlow<TQuery = Record<string, string>>(
  querySchema: z.ZodType<TQuery>,
  fn: (query: TQuery, request: NextRequest) => Promise<Response>,
) {
  return async (req: NextRequest) => {
    try {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      const parsed = querySchema.parse(queryParams);

      // Let the auth handler manage its own response (redirects, cookies, etc.)
      return await fn(parsed, req);
    } catch (error) {
      if (error instanceof z.ZodError) {
        // For auth flows, redirect to error page instead of JSON error
        const errorUrl = new URL("/auth/error", req.url);
        errorUrl.searchParams.set("error", "invalid_request");
        return Response.redirect(errorUrl.toString(), 302);
      }

      // Log auth flow error
      logError(
        "Auth flow error",
        {
          operation: "auth_flow",
          endpoint: req.url,
        },
        error,
      );

      // For auth errors, redirect to login
      const loginUrl = new URL("/login", req.url);
      return Response.redirect(loginUrl.toString(), 302);
    }
  };
}

// ============================================================================
// FILE UPLOAD HANDLERS
// ============================================================================

/**
 * File Upload Handler with FormData support
 *
 * Handles multipart/form-data uploads with file validation
 */
export function handleFileUpload<TOut>(
  outputSchema: z.ZodType<TOut>,
  fn: (formData: FormData, userId: string) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      // Lazy import to avoid circular dependencies
      const { getServerUserId } = await import("../server/auth/user");
      const { cookies } = await import("next/headers");

      const cookieStore = await cookies();
      const userId = await getServerUserId(cookieStore);

      // Validate content type
      const contentType = req.headers.get("content-type");
      if (!contentType?.includes("multipart/form-data")) {
        return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data" }), {
          headers: { "content-type": "application/json" },
          status: 400,
        });
      }

      const formData = await req.formData();

      // Validate files if options provided (delegated to business logic)
      // Note: File validation is implemented in the business logic function
      // to avoid TypeScript issues with FormData iteration in different environments

      const result = await fn(formData, userId);
      const validated = outputSchema.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      // Handle auth errors
      if (error instanceof Error && "status" in error && error.status === 401) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { "content-type": "application/json" },
          status: 401,
        });
      }

      // Handle file processing errors
      if (error instanceof Error && error.message.includes("file")) {
        return new Response(JSON.stringify({ error: "File processing failed" }), {
          headers: { "content-type": "application/json" },
          status: 400,
        });
      }

      // Log error with structured logging
      logError(
        "File upload error",
        {
          operation: "file_upload",
          endpoint: "unknown",
        },
        error,
      );

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, {
        operation: "file_upload",
        endpoint: "unknown",
      });

      return new Response(JSON.stringify(sanitizedError), {
        headers: { "content-type": "application/json" },
        status: 500,
      });
    }
  };
}

/**
 * Public File Upload Handler (no authentication)
 *
 * For public file uploads like onboarding forms
 */
export function handlePublicFileUpload<TOut>(
  outputSchema: z.ZodType<TOut>,
  fn: (formData: FormData) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      // Validate content type
      const contentType = req.headers.get("content-type");
      if (!contentType?.includes("multipart/form-data")) {
        return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data" }), {
          headers: { "content-type": "application/json" },
          status: 400,
        });
      }

      const formData = await req.formData();

      // File validation is delegated to business logic function

      const result = await fn(formData);
      const validated = outputSchema.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      // Log error with structured logging
      logError(
        "Public file upload error",
        {
          operation: "public_file_upload",
          endpoint: "unknown",
        },
        error,
      );

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, {
        operation: "public_file_upload",
        endpoint: "unknown",
      });

      return new Response(JSON.stringify(sanitizedError), {
        headers: { "content-type": "application/json" },
        status: 500,
      });
    }
  };
}

// ============================================================================
// PUBLIC ROUTE HANDLERS
// ============================================================================

/**
 * Public Route Handler (no authentication required)
 *
 * For public endpoints like health checks, webhooks, etc.
 */
export function handlePublic<TIn, TOut>(
  input: z.ZodType<TIn>,
  output: z.ZodType<TOut>,
  fn: (parsed: TIn, request: Request) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      const body = await req.json();
      const parsed = input.parse(body);
      const result = await fn(parsed, req);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      // Handle JSON parse errors
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && error.name === "SyntaxError")
      ) {
        return new Response(
          JSON.stringify({
            error: "Malformed JSON",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      // Handle AppError
      if (error instanceof AppError) {
        const statusMap: Record<string, number> = {
          validation: 400,
          authentication: 401,
          authorization: 403,
          not_found: 404,
          conflict: 409,
          rate_limit: 429,
          database: 500,
          network: 502,
          system: 500,
        };

        return new Response(
          JSON.stringify({
            error: error.message,
            code: error.code,
            category: error.category,
          }),
          {
            headers: { "content-type": "application/json" },
            status: statusMap[error.category] || 500,
          },
        );
      }

      // Handle generic errors with status property
      if (error instanceof Error && "status" in error) {
        return new Response(
          JSON.stringify({
            error: error.message,
          }),
          {
            headers: { "content-type": "application/json" },
            status: (error as Error & { status: number }).status,
          },
        );
      }

      // Log error with structured logging
      logError(
        "Public API handler error",
        {
          operation: "public_api_handler",
          endpoint: "unknown",
        },
        error,
      );

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, {
        operation: "public_api_handler",
        endpoint: "unknown",
      });

      return new Response(JSON.stringify(sanitizedError), {
        headers: { "content-type": "application/json" },
        status: 500,
      });
    }
  };
}

/**
 * Public GET Handler (no authentication, no body)
 */
export function handlePublicGet<TOut>(
  output: z.ZodType<TOut>,
  fn: (request: Request) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      const result = await fn(req);
      const validated = output.parse(result);

      return new Response(
        JSON.stringify({
          ok: true,
          data: validated,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 200,
        },
      );
    } catch (error) {
      // Handle AppError
      if (error instanceof AppError) {
        const statusMap: Record<string, number> = {
          validation: 400,
          authentication: 401,
          authorization: 403,
          not_found: 404,
          conflict: 409,
          rate_limit: 429,
          database: 500,
          network: 502,
          system: 500,
        };

        return new Response(
          JSON.stringify({
            ok: false,
            error: error.message,
            code: error.code,
          }),
          {
            headers: { "content-type": "application/json" },
            status: statusMap[error.category] || 500,
          },
        );
      }

      // Handle ZodError
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            ok: false,
            error: "Validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      // Log error with structured logging
      logError(
        "Public GET handler error",
        {
          operation: "public_get_handler",
          endpoint: "unknown",
        },
        error,
      );

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, {
        operation: "public_get_handler",
        endpoint: "unknown",
      });

      return new Response(
        JSON.stringify({
          ok: false,
          error: sanitizedError.message,
          code: sanitizedError.code,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 500,
        },
      );
    }
  };
}

/**
 * Public GET with Query Parameters
 */
export function handlePublicGetWithQuery<TQuery, TOut>(
  querySchema: z.ZodType<TQuery>,
  output: z.ZodType<TOut>,
  fn: (query: TQuery, request: Request) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      const parsed = querySchema.parse(queryParams);
      const result = await fn(parsed, req);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Query validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      throw error;
    }
  };
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

/**
 * Webhook Handler (validates signatures, no auth)
 *
 * For external webhook endpoints with signature validation
 */
export function handleWebhook<TIn, TOut>(
  input: z.ZodType<TIn>,
  output: z.ZodType<TOut>,
  fn: (parsed: TIn, signature: string | null, rawBody: string, request: Request) => Promise<TOut>,
  signatureHeader = "x-signature",
) {
  return async (req: Request) => {
    try {
      const signature = req.headers.get(signatureHeader);
      const rawBody = await req.text();
      const body = JSON.parse(rawBody);
      const parsed = input.parse(body);
      const result = await fn(parsed, signature, rawBody, req);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      // Handle JSON parse errors
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && error.name === "SyntaxError")
      ) {
        return new Response(
          JSON.stringify({
            error: "Malformed JSON",
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Webhook validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      // Log webhook error with structured logging
      logError(
        "Webhook processing error",
        {
          operation: "webhook_processing",
          endpoint: "unknown",
        },
        error,
      );

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, {
        operation: "webhook_processing",
        endpoint: "unknown",
      });

      return new Response(JSON.stringify(sanitizedError), {
        headers: { "content-type": "application/json" },
        status: 500,
      });
    }
  };
}

// ============================================================================
// STREAMING HANDLERS
// ============================================================================

/**
 * Streaming Response Handler (for SSE, file downloads, etc.)
 *
 * Returns streaming responses without JSON serialization
 */
export function handleStream<TQuery = Record<string, string>>(
  querySchema: z.ZodType<TQuery>,
  fn: (query: TQuery, userId: string) => Promise<ReadableStream | Response>,
) {
  return async (req: Request) => {
    try {
      // Lazy import to avoid circular dependencies
      const { getServerUserId } = await import("../server/auth/user");
      const { cookies } = await import("next/headers");

      const cookieStore = await cookies();
      const userId = await getServerUserId(cookieStore);
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      const parsed = querySchema.parse(queryParams);

      const result = await fn(parsed, userId);

      // If function returns a Response, use it directly
      if (result instanceof Response) {
        return result;
      }

      // Otherwise, create streaming response
      return new Response(result, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Query validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      // Handle auth errors
      if (error instanceof Error && "status" in error && error.status === 401) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: { "content-type": "application/json" },
          status: 401,
        });
      }

      throw error;
    }
  };
}

/**
 * Public Streaming Handler (no authentication)
 */
export function handlePublicStream<TQuery = Record<string, string>>(
  querySchema: z.ZodType<TQuery>,
  fn: (query: TQuery) => Promise<ReadableStream | Response>,
) {
  return async (req: Request) => {
    try {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      const parsed = querySchema.parse(queryParams);

      const result = await fn(parsed);

      // If function returns a Response, use it directly
      if (result instanceof Response) {
        return result;
      }

      // Otherwise, create streaming response
      return new Response(result, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Query validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      throw error;
    }
  };
}

// ============================================================================
// CRON JOB HANDLERS
// ============================================================================

/**
 * Cron Job Handler (validates CRON_SECRET instead of user auth)
 *
 * For system-level cron endpoints that use secret-based authentication
 */
export function handleCron<TIn, TOut>(
  input: z.ZodType<TIn>,
  output: z.ZodType<TOut>,
  fn: (parsed: TIn, request: Request) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      // Validate CRON_SECRET authentication
      const authToken = (req.headers.get("authorization") ?? "").split("Bearer ").at(1);

      if (authToken !== process.env["CRON_SECRET"]) {
        return new Response(JSON.stringify({ error: "Unauthorized cron access" }), {
          headers: { "content-type": "application/json" },
          status: 401,
        });
      }

      // Parse and validate input
      const body = await req.json();
      const parsed = input.parse(body);

      // Execute business logic
      const result = await fn(parsed, req);

      // Validate and return output
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Validation failed",
            details: error.issues,
          }),
          {
            headers: { "content-type": "application/json" },
            status: 400,
          },
        );
      }

      // Log cron job error with structured logging
      logError(
        "Cron job processing error",
        {
          operation: "cron_job_processing",
          endpoint: "unknown",
        },
        error,
      );

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, {
        operation: "cron_job_processing",
        endpoint: "unknown",
      });

      return new Response(
        JSON.stringify({
          error: sanitizedError.message,
          success: false,
          code: sanitizedError.code,
        }),
        {
          headers: { "content-type": "application/json" },
          status: 500,
        },
      );
    }
  };
}

// ============================================================================
// CORS HANDLERS
// ============================================================================

/**
 * CORS Handler for preflight requests
 */
export function handleCORS(
  allowedOrigins: string[] = ["*"],
  allowedMethods: string[] = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: string[] = ["Content-Type", "Authorization"],
) {
  return async (req: Request) => {
    const origin = req.headers.get("origin");
    const method = req.method;

    // Handle preflight requests
    if (method === "OPTIONS") {
      const headers = new Headers();

      if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
        headers.set("Access-Control-Allow-Origin", origin || "*");
      }

      headers.set("Access-Control-Allow-Methods", allowedMethods.join(", "));
      headers.set("Access-Control-Allow-Headers", allowedHeaders.join(", "));
      headers.set("Access-Control-Max-Age", "86400");

      return new Response(null, { status: 204, headers });
    }

    // For non-preflight requests, only add CORS headers if origin is allowed
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Only include Access-Control-Allow-Origin if origin is permitted
    if (allowedOrigins.includes("*") || (origin && allowedOrigins.includes(origin))) {
      headers["Access-Control-Allow-Origin"] = origin ?? "*";

      // Add Vary header when setting specific origin (not wildcard)
      if (!allowedOrigins.includes("*") && origin) {
        headers["Vary"] = "Origin";
      }
    }

    return new Response(JSON.stringify({ error: "Method not implemented with CORS" }), {
      status: 405,
      headers,
    });
  };
}
