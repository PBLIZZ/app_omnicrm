import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createRouteHandler, withAuth } from "../handler";
import { apiOk } from "../response";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";

// Mock dependencies
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn(),
}));

vi.mock("@/server/lib/rate-limiter", () => ({
  RateLimiter: {
    checkRateLimit: vi.fn(),
    getStatus: vi.fn(),
  },
}));

import { getServerUserId } from "@/server/auth/user";
import { RateLimiter } from "@/server/lib/rate-limiter";

describe("Handler Authentication System", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("createRouteHandler with auth: true", () => {
    it("returns 401 when no user session exists", async () => {
      vi.mocked(getServerUserId).mockRejectedValue(new Error("No active session"));

      const handler = createRouteHandler({ auth: true })(async ({ userId }) => {
        // This should never be reached
        return apiOk({ userId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body).toMatchObject({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "No active session",
          requestId: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });

    it("provides userId to handler when authenticated", async () => {
      const mockUserId = "user-123";
      vi.mocked(getServerUserId).mockResolvedValue(mockUserId);

      const handler = createRouteHandler({ auth: true })(async ({ userId }) => {
        return apiOk({ receivedUserId: userId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body).toMatchObject({
        ok: true,
        data: { receivedUserId: mockUserId },
      });
    });

    it("returns 401 with custom status from auth error", async () => {
      vi.mocked(getServerUserId).mockRejectedValue({
        status: 403,
        message: "Insufficient permissions",
      });

      const handler = createRouteHandler({ auth: true })(async ({ userId }) => {
        return apiOk({ userId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body).toMatchObject({
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Insufficient permissions",
          requestId: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });

    it("enforces userId type safety at compile time", async () => {
      vi.mocked(getServerUserId).mockResolvedValue("user-123");

      const handler = createRouteHandler({ auth: true })(async ({ userId }) => {
        // TypeScript should know userId is string, not string | undefined
        const upperUserId: string = userId; // This should compile
        return apiOk({ upperUserId: upperUserId.toUpperCase() });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.upperUserId).toBe("USER-123");
    });
  });

  describe("createRouteHandler with auth: false", () => {
    it("allows requests without authentication", async () => {
      // getServerUserId should not be called
      const handler = createRouteHandler({ auth: false })(async ({ userId }) => {
        return apiOk({ userId: userId ?? "anonymous" });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(vi.mocked(getServerUserId)).not.toHaveBeenCalled();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.userId).toBe("anonymous");
    });

    it("provides optional userId if available", async () => {
      // Even with auth: false, if we mock a userId it could be available
      // This tests the optional flow
      const handler = createRouteHandler({ auth: false })(async ({ userId }) => {
        // TypeScript should know userId is string | undefined
        const userType = userId ? "authenticated" : "anonymous";
        return apiOk({ userType });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.userType).toBe("anonymous");
    });
  });

  describe("withAuth wrapper (legacy)", () => {
    it("wraps handler with authentication check", async () => {
      vi.mocked(getServerUserId).mockResolvedValue("user-456");

      const handler = withAuth(async (userId, requestId, request: NextRequest) => {
        return apiOk({ userId, requestId, path: request.nextUrl.pathname });
      });

      const req = new NextRequest("http://localhost:3000/api/wrapped");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data).toMatchObject({
        userId: "user-456",
        requestId: expect.any(String),
        path: "/api/wrapped",
      });
    });

    it("handles auth failure in wrapper", async () => {
      vi.mocked(getServerUserId).mockRejectedValue(new Error("Session expired"));

      const handler = withAuth(async (userId, requestId) => {
        return apiOk({ userId });
      });

      const req = new NextRequest("http://localhost:3000/api/wrapped");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });
  });

  describe("Rate limiting with auth", () => {
    it("applies rate limit after successful auth", async () => {
      vi.mocked(getServerUserId).mockResolvedValue("user-789");
      vi.mocked(RateLimiter.checkRateLimit).mockResolvedValue({
        allowed: false,
        reason: "Too many requests",
        resetTime: Date.now() + 60000,
        remaining: 0,
      });

      const handler = createRouteHandler({
        auth: true,
        rateLimit: { operation: "test_operation" },
      })(async ({ userId }) => {
        return apiOk({ userId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeDefined();
      expect(res.headers.get("X-RateLimit-Remaining")).toBe("0");

      const body = await res.json();
      expect(body).toMatchObject({
        ok: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests",
          requestId: expect.any(String),
          timestamp: expect.any(String),
        },
      });
    });

    it("uses userId for rate limiting when authenticated", async () => {
      const mockUserId = "user-999";
      vi.mocked(getServerUserId).mockResolvedValue(mockUserId);
      vi.mocked(RateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 5,
        resetTime: Date.now() + 60000,
      });

      const handler = createRouteHandler({
        auth: true,
        rateLimit: { operation: "test_operation" },
      })(async ({ userId }) => {
        return apiOk({ userId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      await handler(req, makeRouteContext());

      expect(RateLimiter.checkRateLimit).toHaveBeenCalledWith("test_operation", mockUserId);
    });

    it("uses IP for rate limiting when not authenticated", async () => {
      vi.mocked(RateLimiter.checkRateLimit).mockResolvedValue({
        allowed: true,
        remaining: 10,
        resetTime: Date.now() + 60000,
      });

      const handler = createRouteHandler({
        auth: false,
        rateLimit: { operation: "public_operation" },
      })(async () => {
        return apiOk({ message: "Public endpoint" });
      });

      const req = new NextRequest("http://localhost:3000/api/public", {
        headers: {
          "x-forwarded-for": "192.168.1.1",
        },
      });
      await handler(req, makeRouteContext());

      expect(RateLimiter.checkRateLimit).toHaveBeenCalledWith(
        "public_operation",
        expect.stringContaining("ip:"),
      );
    });
  });

  describe("Request correlation", () => {
    it("uses x-correlation-id header when present", async () => {
      const correlationId = "correlation-123";
      vi.mocked(getServerUserId).mockResolvedValue("user-123");

      const handler = createRouteHandler({ auth: true })(async ({ requestId }) => {
        return apiOk({ requestId });
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-correlation-id": correlationId,
        },
      });
      const res = await handler(req, makeRouteContext());

      const body = await res.json();
      expect(body.data.requestId).toBe(correlationId);
    });

    it("uses x-request-id as fallback", async () => {
      const requestId = "request-456";
      vi.mocked(getServerUserId).mockResolvedValue("user-123");

      const handler = createRouteHandler({ auth: true })(async ({ requestId }) => {
        return apiOk({ requestId });
      });

      const req = new NextRequest("http://localhost:3000/api/test", {
        headers: {
          "x-request-id": requestId,
        },
      });
      const res = await handler(req, makeRouteContext());

      const body = await res.json();
      expect(body.data.requestId).toBe(requestId);
    });

    it("generates UUID when no correlation headers present", async () => {
      vi.mocked(getServerUserId).mockResolvedValue("user-123");

      const handler = createRouteHandler({ auth: true })(async ({ requestId }) => {
        return apiOk({ requestId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      const body = await res.json();
      expect(body.data.requestId).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });
  });

  describe("Error handling edge cases", () => {
    it("handles non-Error objects in auth failure", async () => {
      vi.mocked(getServerUserId).mockRejectedValue("string error");

      const handler = createRouteHandler({ auth: true })(async ({ userId }) => {
        return apiOk({ userId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error.code).toBe("UNAUTHORIZED");
    });

    it("preserves error status codes from auth layer", async () => {
      vi.mocked(getServerUserId).mockRejectedValue({
        status: 418, // I'm a teapot
        message: "Unusual error",
      });

      const handler = createRouteHandler({ auth: true })(async ({ userId }) => {
        return apiOk({ userId });
      });

      const req = new NextRequest("http://localhost:3000/api/test");
      const res = await handler(req, makeRouteContext());

      expect(res.status).toBe(418);
      const body = await res.json();
      expect(body.error.message).toBe("Unusual error");
    });

    it("handles missing request object gracefully", async () => {
      const handler = withAuth(async (userId, requestId) => {
        return apiOk({ userId });
      });

      // This should throw an error about invalid request
      await expect(handler(null as any)).rejects.toThrow("First argument must be a NextRequest");
    });
  });
});

/**
 * CRITICAL TEST COVERAGE
 *
 * These tests ensure:
 * 1. Authentication is properly enforced when auth: true
 * 2. Unauthenticated access is allowed when auth: false
 * 3. Rate limiting integrates correctly with auth
 * 4. Error responses follow consistent structure
 * 5. Request IDs are properly propagated
 * 6. TypeScript types are correctly narrowed based on auth config
 *
 * DO NOT SKIP these tests - they protect against security vulnerabilities
 */
