// Route Handler System
// Extracted from src/server/utils/api-helpers.ts for better organization
// Handles route composition, middleware, and request processing

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerUserId } from "@/server/auth/user";
import { logger } from "@/lib/observability";
import { RateLimiter } from "../lib/rate-limiter";
import { apiError, apiOk, API_ERROR_CODES } from "./response";
import { ensureError } from "@/lib/utils/error-handler";

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Correlation ID utilities (extracted from api-helpers.ts lines 110-116)
export function getCorrelationId(request: NextRequest): string {
  return (
    request.headers.get("x-correlation-id") ??
    request.headers.get("x-request-id") ??
    crypto.randomUUID()
  );
}

function getClientIdentifier(request: NextRequest): string {
  // Use IP address for rate limiting key
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded
    ? (forwarded.split(",")[0]?.trim() ?? "unknown")
    : (request.headers.get("x-real-ip") ?? "unknown");
  return `ip:${ip}`;
}

// ============================================================================
// MIDDLEWARE WRAPPERS
// ============================================================================

// Authentication wrapper that improves on existing pattern (extracted from api-helpers.ts lines 276-326)
export function withAuth<T extends unknown[]>(
  handler: (userId: string, requestId: string, ...args: T) => Promise<NextResponse>,
) {
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

      if (error && typeof error === "object" && "status" in error) {
        const authError = error as { status?: number; message?: string };
        return apiError(
          API_ERROR_CODES.UNAUTHORIZED,
          authError.message ?? "Unauthorized",
          authError.status ?? 401,
          requestId,
        );
      }

      return apiError(API_ERROR_CODES.INTERNAL_ERROR, "Authentication failed", 500, requestId);
    }
  };
}

// Validation wrapper that improves on existing Zod usage (extracted from api-helpers.ts lines 329-400)
export function withValidation<
  TQuery extends z.ZodSchema = z.ZodVoid,
  TBody extends z.ZodSchema = z.ZodVoid,
  TParams extends z.ZodSchema = z.ZodVoid,
>(schemas: { query?: TQuery; body?: TBody; params?: TParams }) {
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
  ) {
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
            return apiError(
              API_ERROR_CODES.VALIDATION_ERROR,
              "Invalid JSON in request body",
              400,
              requestId,
            );
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
          return apiError(API_ERROR_CODES.VALIDATION_ERROR, "Validation failed", 400, requestId, {
            issues: error.errors,
          });
        }

        await logger.error(
          "Validation wrapper error",
          {
            operation: "api_validation",
            additionalData: { requestId },
          },
          error instanceof Error ? error : new Error(String(error)),
        );
        return apiError(
          API_ERROR_CODES.INTERNAL_ERROR,
          "Validation processing failed",
          500,
          requestId,
        );
      }
    };
  };
}

// Rate limiting options - supports both legacy and advanced rate limiting
interface RateLimitOptions {
  // Legacy rate limiting (kept for backward compatibility)
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (request: NextRequest) => string;

  // Advanced rate limiting with predefined operations
  operation?: string; // Operation key for advanced rate limiter
}

// Advanced rate limiting configuration for createRouteHandler
interface AdvancedRateLimitConfig {
  operation: string; // Required operation key for RateLimiter.checkRateLimit()
}

// Simple in-memory rate limiter - replace with Redis/distributed solution in production
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Legacy rate limiting wrapper (kept for backward compatibility)
export function withRateLimit(options: RateLimitOptions) {
  return function <T extends unknown[]>(handler: (...args: T) => Promise<NextResponse>) {
    return async (...args: T): Promise<NextResponse> => {
      const [request] = args as unknown as [NextRequest, ...unknown[]];
      const requestId = getCorrelationId(request);

      // Use advanced rate limiter if operation is specified
      if (options.operation) {
        // Extract userId from request context - fallback to IP-based identification
        const userId = getClientIdentifier(request); // In real usage, this should be actual userId

        const rateLimitResult = await RateLimiter.checkRateLimit(options.operation, userId);

        if (!rateLimitResult.allowed) {
          const resetTime = rateLimitResult.resetTime ?? Date.now();
          const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

          await logger.warn("Advanced rate limit exceeded", {
            operation: "rate_limit_advanced",
            additionalData: {
              requestId,
              operation: options.operation,
              userId,
              reason: rateLimitResult.reason,
              resetTime,
            },
          });

          const response = apiError(
            API_ERROR_CODES.RATE_LIMITED,
            rateLimitResult.reason ?? "Rate limit exceeded",
            429,
            requestId,
          );
          response.headers.set("Retry-After", retryAfter.toString());
          response.headers.set("X-RateLimit-Remaining", "0");
          response.headers.set("X-RateLimit-Reset", resetTime.toString());
          return response;
        }

        // Set rate limit headers for successful requests
        const result = await handler(...args);
        if (rateLimitResult.remaining !== undefined) {
          result.headers.set("X-RateLimit-Remaining", rateLimitResult.remaining.toString());
        }
        if (rateLimitResult.resetTime) {
          result.headers.set("X-RateLimit-Reset", rateLimitResult.resetTime.toString());
        }
        return result;
      }

      // Fall back to legacy rate limiting
      if (!options.maxRequests || !options.windowMs) {
        return handler(...args);
      }

      const key = options.keyGenerator
        ? options.keyGenerator(request)
        : getClientIdentifier(request);

      const now = Date.now();
      const windowStart = now - options.windowMs;

      // Clean up old entries
      for (const [k, v] of Array.from(rateLimitStore.entries())) {
        if (v.resetTime < windowStart) {
          rateLimitStore.delete(k);
        }
      }

      const current = rateLimitStore.get(key);
      if (!current) {
        rateLimitStore.set(key, { count: 1, resetTime: now + options.windowMs });
        return handler(...args);
      }

      if (current.count >= options.maxRequests) {
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        await logger.warn("Legacy rate limit exceeded", {
          operation: "rate_limit_legacy",
          additionalData: { requestId, key, count: current.count },
        });

        const response = apiError(
          API_ERROR_CODES.RATE_LIMITED,
          "Too many requests",
          429,
          requestId,
        );
        response.headers.set("Retry-After", retryAfter.toString());
        return response;
      }

      current.count++;
      return handler(...args);
    };
  };
}

// Caching wrapper for expensive operations (extracted from api-helpers.ts lines 456-510)
interface CacheOptions {
  ttl: number; // Time to live in seconds
  keyGenerator?: (request: NextRequest) => string;
}

// Simple in-memory cache - replace with Redis in production
const cache = new Map<string, { data: unknown; expires: number }>();

export function withCache(options: CacheOptions) {
  return function <T extends unknown[]>(handler: (...args: T) => Promise<NextResponse>) {
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
      const cached = cache.get(key);

      if (cached && cached.expires > now) {
        void logger.info("Cache hit", {
          operation: "cache_get",
          additionalData: { requestId, key },
        });
        const response = apiOk(cached.data, { requestId });
        response.headers.set("x-cache", "HIT");
        return response;
      }

      const response = await handler(...args);

      // Cache successful responses
      if (response.status === 200) {
        const data: unknown = await response.clone().json();
        cache.set(key, { data, expires: now + options.ttl * 1000 });
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

// Advanced rate limiting helper for createRouteHandler
async function applyAdvancedRateLimit(
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

    const response = apiError(
      API_ERROR_CODES.RATE_LIMITED,
      rateLimitResult.reason ?? "Rate limit exceeded",
      429,
      requestId,
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
  rateLimit?: RateLimitOptions | AdvancedRateLimitConfig;
  cache?: CacheOptions;
}) {
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
  ) {
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
            return apiError(API_ERROR_CODES.VALIDATION_ERROR, "Validation failed", 400, requestId, {
              issues: error.errors,
            });
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
            return apiError(
              API_ERROR_CODES.UNAUTHORIZED,
              "Authentication failed - no user ID",
              401,
              requestId,
            );
          }
          userId = authenticatedUserId; // Now TypeScript knows this is definitely a string
        } catch (error) {
          const authError = error as { status?: number; message?: string };
          return apiError(
            API_ERROR_CODES.UNAUTHORIZED,
            authError.message ?? "Unauthorized",
            authError.status ?? 401,
            requestId,
          );
        }
      }

      // Handle advanced rate limiting if configured with operation
      if (config.rateLimit && "operation" in config.rateLimit && config.rateLimit.operation) {
        const rateLimitUserId = userId ?? getClientIdentifier(request);
        const rateLimitResponse = await applyAdvancedRateLimit(
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
      if (result instanceof Response && !("cookies" in result)) {
        // This is a raw Response, convert to NextResponse
        nextResponse = new NextResponse(result.body, {
          status: result.status,
          statusText: result.statusText,
          headers: result.headers,
        });
      } else {
        nextResponse = result as NextResponse;
      }

      // Add rate limit headers for successful responses with advanced rate limiting
      if (config.rateLimit && "operation" in config.rateLimit && config.rateLimit.operation) {
        const rateLimitUserId = userId ?? getClientIdentifier(request);
        const status = RateLimiter.getStatus(config.rateLimit.operation, rateLimitUserId);

        if (status) {
          nextResponse.headers.set("X-RateLimit-Remaining", status.remaining.toString());
          nextResponse.headers.set("X-RateLimit-Reset", status.resetTime.toString());
        }
      }

      return nextResponse;
    };

    // Apply legacy rate limiting if configured (only for non-operation-based rate limits)
    if (config.rateLimit && !("operation" in config.rateLimit)) {
      wrappedHandler = withRateLimit(config.rateLimit as RateLimitOptions)(wrappedHandler);
    }

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

export type { RateLimitOptions, AdvancedRateLimitConfig, CacheOptions };

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
