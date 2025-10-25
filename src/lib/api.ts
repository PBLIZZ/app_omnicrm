/**
 * API Utilities - Central Export
 *
 * Re-exports the main API client utilities that are commonly used throughout the app.
 * This maintains compatibility with existing imports while organizing code.
 */

import { z } from "zod";
import { AppError } from "@/lib/errors/app-error";
import {
  createSanitizedErrorResponse,
  type ErrorContext,
} from "@/server/lib/error-sanitizer";
import { logError } from "@/server/lib/structured-logger";

export {
  apiClient,
  apiRequest,
  get,
  post,
  put,
  patch,
  del,
  del as delete,
  buildUrl,
  safeRequest,
  type ApiRequestOptions,
} from "./api/client";

const JSON_HEADERS = { "content-type": "application/json" } as const;

function mapAppErrorToStatus(error: AppError): number {
  switch (error.category) {
    case "validation":
      return 400;
    case "authentication":
      return 401;
    case "network":
      return 503;
    case "database":
      return 500;
    default:
      return 500;
  }
}

function respondWithAppError(
  error: AppError,
  logMessage: string,
  context: ErrorContext,
): Response {
  logError(
    logMessage,
    context,
    error,
    {
      code: error.code,
      category: error.category,
      retryable: error.retryable,
    },
  );

  const sanitizedError = createSanitizedErrorResponse(error, context);

  return new Response(JSON.stringify(sanitizedError), {
    headers: JSON_HEADERS,
    status: mapAppErrorToStatus(error),
  });
}

function extractEndpoint(url: string | null | undefined): string {
  if (!url) return "unknown";
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

/**
 * Typed API Handler Pattern
 *
 * Creates type-safe API route handlers with automatic validation and serialization.
 * Standardizes the API boundary with consistent error handling and type checking.
 *
 * @example
 * ```typescript
 * import { ContactInputSchema, ContactSchema } from "@/server/db/business-schemas/contacts";
 * import { handle } from "@/lib/api";
 * import { contactsRepo } from "@omnicrm/repo";
 *
 * export const POST = handle(ContactInputSchema, ContactSchema, async (data) => {
 *   const saved = await contactsRepo.create(data);
 *   return saved;
 * });
 * ```
 */
export function handle<TIn, TOut>(
  input: z.ZodType<TIn>,
  output: z.ZodType<TOut>,
  fn: (parsed: TIn) => Promise<TOut>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const parsed = input.parse(body);
      const result = await fn(parsed);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: JSON_HEADERS,
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
            headers: JSON_HEADERS,
            status: 400,
          },
        );
      }

      const context = {
        operation: "api_handler",
        endpoint: extractEndpoint(req?.url),
      };

      if (error instanceof AppError) {
        return respondWithAppError(error, "API handler error", context);
      }

      logError("API handler error", context, error);

      const sanitizedError = createSanitizedErrorResponse(error, context);

      return new Response(JSON.stringify(sanitizedError), {
        headers: JSON_HEADERS,
        status: 500,
      });
    }
  };
}

/**
 * Authenticated API Handler Pattern
 *
 * Creates type-safe API route handlers with automatic authentication, validation and serialization.
 */
export function handleAuth<TIn, TOut>(
  input: z.ZodType<TIn>,
  output: z.ZodType<TOut>,
  fn: (parsed: TIn, userId: string) => Promise<TOut>,
): (req: Request) => Promise<Response> {
  return async (req: Request): Promise<Response> => {
    try {
      // Lazy import to avoid circular dependencies
      const { getServerUserId } = await import("../server/auth/user");
      const { cookies } = await import("next/headers");

      const cookieStore = await cookies();
      const userId = await getServerUserId(cookieStore);

      // Check if there's a JSON body to parse
      let body: unknown = undefined;
      const contentType = req.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        try {
          const rawBody = await req.text();
          // Treat empty string as undefined for void schemas, otherwise parse
          body = rawBody === "" ? undefined : JSON.parse(rawBody);
        } catch (error) {
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
                headers: JSON_HEADERS,
                status: 400,
              },
            );
          }
          throw error;
        }
      }

      const parsed = input.parse(body);
      const result = await fn(parsed, userId);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: JSON_HEADERS,
        status: 200,
      });
    } catch (error) {
      // Lazy import ApiError for error handling
      const { ApiError } = await import("./api/errors");

      // Handle ApiError with proper status codes
      if (error instanceof ApiError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            details: error.details,
          }),
          {
            headers: JSON_HEADERS,
            status: error.status,
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
            headers: JSON_HEADERS,
            status: 400,
          },
        );
      }

      // Handle auth errors
      if (error instanceof Error && "status" in error && error.status === 401) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: JSON_HEADERS,
          status: 401,
        });
      }

      const context = {
        operation: "authenticated_api_handler",
        endpoint: extractEndpoint(req?.url),
      };

      if (error instanceof AppError) {
        return respondWithAppError(error, "Authenticated API handler error", context);
      }

      // Log error with structured logging
      logError("Authenticated API handler error", context, error);

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, context);

      return new Response(JSON.stringify(sanitizedError), {
        headers: JSON_HEADERS,
        status: 500,
      });
    }
  };
}

/**
 * Typed GET Handler Pattern
 *
 * Creates type-safe GET route handlers with query parameter validation.
 */
export function handleGet<TOut>(output: z.ZodType<TOut>, fn: () => Promise<TOut>) {
  return async () => {
    try {
      const result = await fn();
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: JSON_HEADERS,
        status: 200,
      });
    } catch (error) {
      const context = {
        operation: "get_api_handler",
        endpoint: "unknown",
      };

      if (error instanceof AppError) {
        return respondWithAppError(error, "GET API handler error", context);
      }

      // Log error with structured logging
      logError("GET API handler error", context, error);

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, context);

      return new Response(JSON.stringify(sanitizedError), {
        headers: JSON_HEADERS,
        status: 500,
      });
    }
  };
}

/**
 * Typed GET Handler with Query Parameters
 */
export function handleGetWithQuery<TQuery, TOut>(
  querySchema: z.ZodType<TQuery>,
  output: z.ZodType<TOut>,
  fn: (query: TQuery) => Promise<TOut>,
) {
  return async (req: Request) => {
    try {
      const url = new URL(req.url);
      const queryParams = Object.fromEntries(url.searchParams.entries());
      const parsed = querySchema.parse(queryParams);
      const result = await fn(parsed);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: JSON_HEADERS,
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
            headers: JSON_HEADERS,
            status: 400,
          },
        );
      }

      const context = {
        operation: "get_query_api_handler",
        endpoint: extractEndpoint(req?.url),
      };

      if (error instanceof AppError) {
        return respondWithAppError(error, "GET with query API handler error", context);
      }

      // Log error with structured logging
      logError("GET with query API handler error", context, error);

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, context);

      return new Response(JSON.stringify(sanitizedError), {
        headers: JSON_HEADERS,
        status: 500,
      });
    }
  };
}

/**
 * Authenticated GET Handler with Query Parameters
 */
export function handleGetWithQueryAuth<TQuery, TOut>(
  querySchema: z.ZodType<TQuery>,
  output: z.ZodType<TOut>,
  fn: (query: TQuery, userId: string) => Promise<TOut>,
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
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: JSON_HEADERS,
        status: 200,
      });
    } catch (error) {
      // Lazy import ApiError for error handling
      const { ApiError } = await import("./api/errors");

      // Handle ApiError with proper status codes
      if (error instanceof ApiError) {
        return new Response(
          JSON.stringify({
            error: error.message,
            details: error.details,
          }),
          {
            headers: JSON_HEADERS,
            status: error.status,
          },
        );
      }

      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: "Query validation failed",
            details: error.issues,
          }),
          {
            headers: JSON_HEADERS,
            status: 400,
          },
        );
      }

      // Handle auth errors
      if (error instanceof Error && "status" in error && error.status === 401) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          headers: JSON_HEADERS,
          status: 401,
        });
      }

      const context = {
        operation: "authenticated_get_query_api_handler",
        endpoint: extractEndpoint(req?.url),
      };

      if (error instanceof AppError) {
        return respondWithAppError(
          error,
          "Authenticated GET with query API handler error",
          context,
        );
      }

      // Log error with structured logging
      logError("Authenticated GET with query API handler error", context, error);

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, context);

      return new Response(JSON.stringify(sanitizedError), {
        headers: JSON_HEADERS,
        status: 500,
      });
    }
  };
}
/**
 * Authenticated API Handler for routes with dynamic URL parameters.
 * Supports Next.js 15+ async params pattern.
 */
export function handleAuthWithParams<TIn, TOut, TParams extends Record<string, string>>(
  input: z.ZodType<TIn>,
  output: z.ZodType<TOut>,
  fn: (parsed: TIn, userId: string, params: TParams) => Promise<TOut>,
): (req: Request, context: { params: Promise<TParams> }) => Promise<Response> {
  return async (req: Request, context: { params: Promise<TParams> }): Promise<Response> => {
    try {
      const { getServerUserId } = await import("../server/auth/user");
      const { cookies } = await import("next/headers");

      const cookieStore = await cookies();
      const userId = await getServerUserId(cookieStore);

      // ✅ AWAIT the params (Next.js 15+)
      const params = await context.params;

      let body: unknown = undefined;
      const contentType = req.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        try {
          const rawBody = await req.text();
          body = rawBody === "" ? undefined : JSON.parse(rawBody);
        } catch (error) {
          if (error instanceof SyntaxError) {
            return new Response(
              JSON.stringify({ error: "Malformed JSON", details: error.message }),
              { status: 400, headers: JSON_HEADERS },
            );
          }
          throw error;
        }
      }

      const parsed = input.parse(body);
      const result = await fn(parsed, userId, params);
      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: JSON_HEADERS,
        status: 200,
      });
    } catch (error) {
      const { ApiError } = await import("./api/errors");

      if (error instanceof ApiError) {
        return new Response(JSON.stringify({ error: error.message, details: error.details }), {
          status: error.status,
          headers: JSON_HEADERS,
        });
      }

      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: "Validation failed", details: error.issues }), {
          status: 400,
          headers: JSON_HEADERS,
        });
      }

      if (error instanceof Error && "status" in error && error.status === 401) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: JSON_HEADERS,
        });
      }

      const logContext = {
        operation: "authenticated_api_handler_with_params",
        endpoint: extractEndpoint(req?.url),
      };

      if (error instanceof AppError) {
        return respondWithAppError(
          error,
          "Authenticated API handler with params error",
          logContext,
        );
      }

      // Log error with structured logging
      logError("Authenticated API handler with params error", logContext, error);

      // Return sanitized error response
      const sanitizedError = createSanitizedErrorResponse(error, logContext);

      return new Response(JSON.stringify(sanitizedError), {
        headers: JSON_HEADERS,
        status: 500,
      });
    }
  };
}
