// Route Handler System
// Extracted from src/server/utils/api-helpers.ts for better organization
// Handles route composition, middleware, and request processing

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerUserId } from "@/server/auth/user";
import { logger } from "@/lib/observability";
import { RateLimiter } from "./rate-limiter";
import { ensureError } from "@/lib/utils/error-handler";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Get request ID from middleware-set headers
export function getCorrelationId(request: NextRequest): string {
  return (
    request.headers.get("x-correlation-id") ?? request.headers.get("x-request-id") ?? "unknown"
  );
}

// Extract client IP address from request headers
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip") ?? "unknown";
  return ip;
}

// ============================================================================
// MIDDLEWARE WRAPPERS
// ============================================================================

// Authentication wrapper that improves on existing pattern (extracted from api-helpers.ts lines 276-326)
export function withAuth<T extends unknown[]>(
  handler: (userId: string, requestId: string, ...args: T) => Promise<NextResponse>,
): (...args: T) => Promise<NextResponse> {
  return async (...args: T): Promise<NextResponse> => {
    // Type guard to ensure first argument is a NextRequest
    function isNextRequest(arg: unknown): arg is NextRequest {
      return arg !== null && typeof arg === "object" && "nextUrl" in arg && "headers" in arg;
    }

    const [firstArg] = args;
    if (!isNextRequest(firstArg)) {
      throw new Error("First argument must be a NextRequest");
    }

    const request = firstArg;
    const requestId = getCorrelationId(request);

    try {
      await logger.info("Route handler started", {
        operation: "api_call",
        additionalData: { requestId, path: request.nextUrl.pathname },
      });

      const userId = await getServerUserId();
      const result = await handler(userId, requestId, ...args);

      await logger.info("Route handler completed successfully", {
        operation: "api_call",
        additionalData: {
          requestId,
          path: request.nextUrl.pathname,
          status: result.status,
        },
      });

      return result;
    } catch (error: unknown) {
      // Check if this is an authentication error
      const isAuthError =
        error &&
        typeof error === "object" &&
        "status" in error &&
        (error as { status?: number }).status === 401;

      if (isAuthError) {
        const authError = error as { status?: number; message?: string };
        await logger.warn("Authentication failed", {
          operation: "api_call",
          additionalData: {
            requestId,
            path: request.nextUrl.pathname,
            error: authError.message ?? "Unauthorized",
          },
        });
        return NextResponse.json(
          { error: authError.message ?? "Unauthorized" },
          { status: authError.status ?? 401 },
        );
      }

      // Log server errors with full details
      await logger.error(
        "Route handler failed",
        {
          operation: "api_call",
          additionalData: {
            requestId,
            path: request.nextUrl.pathname,
            error: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          },
        },
        ensureError(error),
      );

      // Handle plain Error objects as server errors
      if (error instanceof Error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
      }

      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

// Validation wrapper that improves on existing Zod usage (extracted from api-helpers.ts lines 329-400)
export function withValidation<
  TQuery extends z.ZodSchema = z.ZodVoid,
  TBody extends z.ZodSchema = z.ZodVoid,
  TParams extends z.ZodSchema = z.ZodVoid,
>(schemas: {
  query?: TQuery;
  body?: TBody;
  params?: TParams;
}): <T extends unknown[]>(
  handler: (
    validated: {
      query: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
      body: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
      params: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
    },
    requestId: string,
    ...args: T
  ) => Promise<NextResponse>,
) => (...args: T) => Promise<NextResponse> {
  return function <T extends unknown[]>(
    handler: (
      validated: {
        query: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
        body: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
        params: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
      },
      requestId: string,
      ...args: T
    ) => Promise<NextResponse>,
  ): (...args: T) => Promise<NextResponse> {
    return async (...args: T): Promise<NextResponse> => {
      const [request, routeParams] = args as unknown as [
        NextRequest,
        { params?: Promise<unknown> },
        ...unknown[],
      ];
      const requestId = getCorrelationId(request);

      try {
        const validated: {
          query?: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
          body?: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
          params?: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
        } = {};

        // Validate query parameters
        if (schemas.query) {
          const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
          validated.query = schemas.query.parse(searchParams) as TQuery extends z.ZodVoid
            ? undefined
            : z.infer<TQuery>;
        }

        // Validate request body
        if (schemas.body) {
          try {
            const body: unknown = await request.json();
            validated.body = schemas.body.parse(body) as TBody extends z.ZodVoid
              ? undefined
              : z.infer<TBody>;
          } catch {
            return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
          }
        }

        // Validate route parameters (await the Promise in Next.js 15)
        if (schemas.params && routeParams?.params) {
          const params = await routeParams.params;
          validated.params = schemas.params.parse(params) as TParams extends z.ZodVoid
            ? undefined
            : z.infer<TParams>;
        }

        return await handler(
          {
            query: validated.query,
            body: validated.body,
            params: validated.params,
          } as {
            query: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
            body: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
            params: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
          },
          requestId,
          ...args,
        );
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: "Validation failed", issues: error.issues },
            { status: 400 },
          );
        }

        await logger.error(
          "Validation wrapper error",
          {
            operation: "api_validation",
            additionalData: { requestId },
          },
          error instanceof Error ? error : new Error(String(error)),
        );
        return NextResponse.json({ error: "Validation processing failed" }, { status: 500 });
      }
    };
  };
}

// Rate limiting options
interface RateLimitOptions {
  operation: string; // Operation key for RateLimiter.checkRateLimit()
}

// Caching wrapper for expensive operations (extracted from api-helpers.ts lines 456-510)
interface CacheOptions {
  ttl: number; // Time to live in seconds
  keyGenerator?: (request: NextRequest) => string;
}

// Redis-based cache implementation
import { redisGet, redisSet, redisDel } from "./redis-client";

class RedisCache {
  private readonly keyPrefix = "middleware:cache:";

  async get(key: string): Promise<{ data: unknown; expires: number } | undefined> {
    try {
      const cached = await redisGet(`${this.keyPrefix}${key}`);
      if (!cached) return undefined;

      let parsed: { data: unknown; expires: number };
      try {
        parsed = JSON.parse(cached as string);
      } catch (parseError) {
        await logger.error("Failed to parse cached data", {
          operation: "cache_get",
          additionalData: {
            key,
            error: parseError instanceof Error ? parseError.message : String(parseError),
          },
        });
        // Delete corrupted cache entry
        await redisDel(`${this.keyPrefix}${key}`);
        return undefined;
      }

      // Validate parsed data structure
      if (
        typeof parsed !== "object" ||
        parsed === null ||
        typeof parsed.expires !== "number" ||
        !("data" in parsed)
      ) {
        await logger.error("Invalid cached data structure", {
          operation: "cache_get",
          additionalData: { key, parsed },
        });
        // Delete invalid cache entry
        await redisDel(`${this.keyPrefix}${key}`);
        return undefined;
      }

      const now = Date.now();

      if (parsed.expires < now) {
        // Expired, clean up
        await redisDel(`${this.keyPrefix}${key}`);
        return undefined;
      }

      return { data: parsed.data, expires: parsed.expires };
    } catch (error) {
      await logger.error("Redis cache get error", {
        operation: "cache_get",
        additionalData: { key, error: error instanceof Error ? error.message : String(error) },
      });
      return undefined;
    }
  }

  async set(key: string, data: unknown, expires: number): Promise<void> {
    try {
      const cacheData = {
        data,
        expires,
        lastAccessed: Date.now(),
      };

      const ttl = Math.floor((expires - Date.now()) / 1000);
      if (ttl <= 0) {
        // Data is already expired, don't cache it
        await logger.debug("Skipping cache set for expired data", {
          operation: "cache_set",
          additionalData: { key, ttl },
        });
        return;
      }

      await redisSet(`${this.keyPrefix}${key}`, JSON.stringify(cacheData), ttl);
    } catch (error) {
      await logger.error("Redis cache set error", {
        operation: "cache_set",
        additionalData: { key, error: error instanceof Error ? error.message : String(error) },
      });
    }
  }

  async destroy(): Promise<void> {
    // Redis handles cleanup automatically via TTL
    // No need for manual cleanup
  }
}

const cache = new RedisCache();

export function withCache(
  options: CacheOptions,
): <T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) => (...args: T) => Promise<NextResponse> {
  return function <T extends unknown[]>(
    handler: (...args: T) => Promise<NextResponse>,
  ): (...args: T) => Promise<NextResponse> {
    return async (...args: T): Promise<NextResponse> => {
      const [request] = args as unknown as [NextRequest, ...unknown[]];
      const requestId = getCorrelationId(request);

      // Only cache GET requests
      if (request.method !== "GET") {
        return handler(...args);
      }

      const key = options.keyGenerator
        ? options.keyGenerator(request)
        : `${request.method}:${request.nextUrl.pathname}${request.nextUrl.search}`;

      const now = Date.now();
      const cached = await cache.get(key);

      if (cached && cached.expires > now) {
        void logger.info("Cache hit", {
          operation: "cache_get",
          additionalData: { requestId, key },
        });
        const response = NextResponse.json(cached.data);
        response.headers.set("x-cache", "HIT");
        return response;
      }

      const response = await handler(...args);

      // Cache successful responses
      if (response.status === 200) {
        const data: unknown = await response.clone().json();
        await cache.set(key, data, now + options.ttl * 1000);
        response.headers.set("x-cache", "MISS");
        void logger.info("Response cached", {
          operation: "cache_set",
          additionalData: { requestId, key, ttl: options.ttl },
        });
      }

      return response;
    };
  };
}

// ============================================================================
// COMPOSITE ROUTE HANDLER
// ============================================================================

// Rate limiting helper for createRouteHandler
async function applyRateLimit(
  operation: string,
  userId: string,
  requestId: string,
): Promise<NextResponse | null> {
  const rateLimitResult = await RateLimiter.checkRateLimit(operation, userId);

  if (!rateLimitResult.allowed) {
    const resetTime = rateLimitResult.resetTime ?? Date.now();
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    await logger.warn("Rate limit exceeded in createRouteHandler", {
      operation: "route_handler_rate_limit",
      additionalData: {
        requestId,
        operation,
        userId,
        reason: rateLimitResult.reason,
        resetTime,
      },
    });

    const response = NextResponse.json(
      {
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: rateLimitResult.reason ?? "Rate limit exceeded",
          requestId,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 429 },
    );
    response.headers.set("Retry-After", retryAfter.toString());
    response.headers.set("X-RateLimit-Remaining", "0");
    response.headers.set("X-RateLimit-Reset", resetTime.toString());
    return response;
  }

  return null; // No rate limit applied
}

// Type definition for segment parameters, aligning with Next.js expectations
type SegmentParams = { [key: string]: string | string[] | undefined };

// Next.js 15 route context - using the correct structure expected by Next.js
interface RouteContext {
  params: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Conditional type to make userId required when auth is true
type AuthenticatedContext<TAuth extends boolean> = TAuth extends true
  ? { userId: string }
  : { userId?: string };

// Composite wrapper that combines all middleware (extracted from api-helpers.ts lines 517-611)
export function createRouteHandler<
  TAuth extends boolean = false,
  TQuery extends z.ZodSchema = z.ZodVoid,
  TBody extends z.ZodSchema = z.ZodVoid,
  TParams extends z.ZodSchema = z.ZodVoid,
>(config: {
  auth?: TAuth;
  validation?: {
    query?: TQuery;
    body?: TBody;
    params?: TParams;
  };
  rateLimit?: RateLimitOptions;
  cache?: CacheOptions;
}): (
  handler: (
    context: AuthenticatedContext<TAuth> & {
      validated: {
        query: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
        body: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
        params: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
      };
      requestId: string;
    },
    request: NextRequest,
    routeParams?: { params?: Promise<SegmentParams> },
  ) => Promise<NextResponse | Response>,
) => (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse> {
  return function (
    handler: (
      context: AuthenticatedContext<TAuth> & {
        validated: {
          query: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
          body: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
          params: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
        };
        requestId: string;
      },
      request: NextRequest,
      routeParams?: { params?: Promise<SegmentParams> },
    ) => Promise<NextResponse | Response>,
  ): (request: NextRequest, routeContext: RouteContext) => Promise<NextResponse> {
    let wrappedHandler = async (
      request: NextRequest,
      routeContext: RouteContext,
    ): Promise<NextResponse> => {
      const requestId = getCorrelationId(request);

      // Handle validation if configured
      const validated: {
        query?: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
        body?: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
        params?: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
      } = {};
      if (config.validation) {
        try {
          if (config.validation.query) {
            const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
            validated.query = config.validation.query.parse(
              searchParams,
            ) as TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
          }

          if (config.validation.body) {
            const body: unknown = await request.json();
            validated.body = config.validation.body.parse(body) as TBody extends z.ZodVoid
              ? undefined
              : z.infer<TBody>;
          }

          if (config.validation.params && routeContext.params) {
            const params = await routeContext.params;
            validated.params = config.validation.params.parse(params) as TParams extends z.ZodVoid
              ? undefined
              : z.infer<TParams>;
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              { error: "Validation failed", issues: error.issues },
              { status: 400 },
            );
          }
          throw error;
        }
      }

      // Handle auth if configured
      let userId: string | undefined;
      if (config.auth) {
        try {
          const authenticatedUserId = await getServerUserId();
          if (!authenticatedUserId) {
            return NextResponse.json(
              { error: "Authentication failed - no user ID" },
              { status: 401 },
            );
          }
          userId = authenticatedUserId; // Now TypeScript knows this is definitely a string
        } catch (error) {
          const authError = error as { status?: number; message?: string };
          return NextResponse.json(
            { error: authError.message ?? "Unauthorized" },
            { status: authError.status ?? 401 },
          );
        }
      }

      // Handle rate limiting if configured
      if (config.rateLimit) {
        const rateLimitUserId = userId ?? `ip:${getClientIp(request)}`;
        const rateLimitResponse = await applyRateLimit(
          config.rateLimit.operation,
          rateLimitUserId,
          requestId,
        );

        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // Create context with proper typing
      // When config.auth is true, userId is guaranteed to be string due to auth checks above
      const context = (
        config.auth
          ? {
              userId: userId as string,
              validated: {
                query: validated.query,
                body: validated.body,
                params: validated.params,
              },
              requestId,
            }
          : {
              userId,
              validated: {
                query: validated.query,
                body: validated.body,
                params: validated.params,
              },
              requestId,
            }
      ) as AuthenticatedContext<TAuth> & {
        validated: {
          query: TQuery extends z.ZodVoid ? undefined : z.infer<TQuery>;
          body: TBody extends z.ZodVoid ? undefined : z.infer<TBody>;
          params: TParams extends z.ZodVoid ? undefined : z.infer<TParams>;
        };
        requestId: string;
      };

      const result = await handler(context, request, routeContext);

      // Convert Response to NextResponse if needed
      let nextResponse: NextResponse;
      if (result instanceof Response && !(result instanceof NextResponse)) {
        // This is a raw Response, convert to NextResponse
        nextResponse = new NextResponse(result.body, {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
        });
      } else {
        nextResponse = result as NextResponse;
      }

      // Add rate limit headers for successful responses
      if (config.rateLimit) {
        const rateLimitUserId = userId ?? `ip:${getClientIp(request)}`;
        const status = await RateLimiter.getStatus(config.rateLimit.operation, rateLimitUserId);

        if (status) {
          nextResponse.headers.set("X-RateLimit-Remaining", status.remaining.toString());
          nextResponse.headers.set("X-RateLimit-Reset", status.resetTime.toString());
        }
      }

      return nextResponse;
    };

    // Apply caching if configured
    if (config.cache) {
      wrappedHandler = withCache(config.cache)(wrappedHandler);
    }

    return wrappedHandler;
  };
}

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export type { RateLimitOptions, CacheOptions };

// Handler context type for better TypeScript support - using intersection type
export type RouteHandlerContext<
  TAuth extends boolean = false,
  TQuery = unknown,
  TBody = unknown,
  TParams = unknown,
> = AuthenticatedContext<TAuth> & {
  validated: {
    query: TQuery;
    body: TBody;
    params: TParams;
  };
  requestId: string;
};

// Route handler function type
export type RouteHandler<
  TAuth extends boolean = false,
  TQuery = unknown,
  TBody = unknown,
  TParams = unknown,
> = (
  context: RouteHandlerContext<TAuth, TQuery, TBody, TParams>,
  request: NextRequest,
  routeParams?: { params?: Promise<SegmentParams> },
) => Promise<NextResponse>;

// Middleware types
export type AuthMiddleware<T extends unknown[]> = (
  handler: (userId: string, requestId: string, ...args: T) => Promise<NextResponse>,
) => (...args: T) => Promise<NextResponse>;

export type ValidationMiddleware<T extends unknown[]> = (
  handler: (
    validated: Record<string, unknown>,
    requestId: string,
    ...args: T
  ) => Promise<NextResponse>,
) => (...args: T) => Promise<NextResponse>;

export type RateLimitMiddleware<T extends unknown[]> = (
  handler: (...args: T) => Promise<NextResponse>,
) => (...args: T) => Promise<NextResponse>;

export type CacheMiddleware<T extends unknown[]> = (
  handler: (...args: T) => Promise<NextResponse>,
) => (...args: T) => Promise<NextResponse>;
