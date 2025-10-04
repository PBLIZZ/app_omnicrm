/**
 * API Utilities - Central Export
 *
 * Re-exports the main API client utilities that are commonly used throughout the app.
 * This maintains compatibility with existing imports while organizing code.
 */

import { z } from "zod";

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

      // Re-throw unexpected errors to be handled by global error boundary
      throw error;
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
                headers: { "content-type": "application/json" },
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
        headers: { "content-type": "application/json" },
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
            headers: { "content-type": "application/json" },
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

      // Re-throw unexpected errors to be handled by global error boundary
      throw error;
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
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      // Re-throw to be handled by global error boundary
      throw error;
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
 * Authenticated API Handler for routes with dynamic URL parameters.
 *
 * Extends handleAuth to provide the `context.params` object to the business logic.
 */
export function handleAuthWithParams<TIn, TOut, TParams extends Record<string, string>>(
  input: z.ZodType<TIn>,
  output: z.ZodType<TOut>,
  fn: (parsed: TIn, userId: string, params: TParams) => Promise<TOut>,
): (req: Request, context: { params: TParams }) => Promise<Response> {
  // This returned function is what Next.js will actually call
  return async (req: Request, context: { params: TParams }): Promise<Response> => {
    try {
      const { getServerUserId } = await import("../server/auth/user");
      const { cookies } = await import("next/headers");

      const cookieStore = await cookies();
      const userId = await getServerUserId(cookieStore);

      let body: unknown = undefined;
      const contentType = req.headers.get("content-type");
      if (contentType?.includes("application/json")) {
        const rawBody = await req.text();
        body = rawBody === "" ? undefined : JSON.parse(rawBody);
      }

      const parsed = input.parse(body);

      // The key change: we pass the `context.params` as the third argument
      const result = await fn(parsed, userId, context.params);

      const validated = output.parse(result);

      return new Response(JSON.stringify(validated), {
        headers: { "content-type": "application/json" },
        status: 200,
      });
    } catch (error) {
      // Identical error handling as handleAuth
      const { ApiError } = await import("./api/errors");
      if (error instanceof ApiError) {
        return new Response(JSON.stringify({ error: error.message, details: error.details }), {
          status: error.status,
        });
      }
      if (error instanceof z.ZodError) {
        return new Response(JSON.stringify({ error: "Validation failed", details: error.issues }), {
          status: 400,
        });
      }
      if (error instanceof Error && "status" in error && error.status === 401) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
      }
      throw error;
    }
  };
}
