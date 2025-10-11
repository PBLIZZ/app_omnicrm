/**
 * Specialized API Handlers for Edge Cases
 *
 * Extended handlers for auth flows, file uploads, public routes, webhooks, and streaming
 */

import { z } from "zod";
import type { NextRequest } from "next/server";

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
        return new Response(
          JSON.stringify({ error: "File processing failed", details: error.message }),
          { headers: { "content-type": "application/json" }, status: 400 },
        );
      }

      throw error;
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
      throw error;
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
      console.log("[handlePublic] Received body:", JSON.stringify(body, null, 2));
      const parsed = input.parse(body);
      console.log("[handlePublic] Validation passed");
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
            details: error.message,
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

      throw error;
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

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      throw error;
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
            details: error.message,
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

      // For webhooks, we don't want to leak internal errors
      console.error("Webhook processing error:", error);
      return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
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

      // For cron jobs, we want to log errors but not leak internal details
      console.error("Cron job processing error:", error);
      return new Response(
        JSON.stringify({
          error: "Cron job processing failed",
          success: false,
          message: error instanceof Error ? error.message : "Unknown error",
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
