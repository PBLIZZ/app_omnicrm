import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

// Import API route handlers
import { GET as healthGet } from "@/app/api/health/route";
import { GET as omniClientsGet, POST as omniClientsPost } from "@/app/api/omni-clients/route";
import { PUT as consentPut } from "@/app/api/settings/consent/route";

// Mock auth utilities
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-123"),
}));

// Database driver mocking removed - use repository/service mocks instead

// Mock services
vi.mock("@/server/services/contacts.service", () => ({
  listContactsService: vi.fn().mockResolvedValue({
    items: [
      {
        id: "contact-1",
        displayName: "Test Contact",
        primaryEmail: "test@example.com",
        source: "manual",
      },
    ],
    total: 1,
  }),
  createContactService: vi.fn().mockResolvedValue({
    id: "new-contact-id",
    displayName: "New Contact",
    primaryEmail: "new@example.com",
    source: "manual",
  }),
}));

/**
 * API Routes Validation Tests
 *
 * These tests verify API route handlers work correctly with proper:
 * - Request/response structure
 * - Authentication requirements
 * - Input validation
 * - Error handling
 * - Response formatting
 */
describe("API Routes Validation Tests", () => {
  describe("Health Check API (/api/health)", () => {
    it("returns system health status without authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const routeContext = { params: Promise.resolve({}) };

      const response = await healthGet(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("data");
      expect(data.data).toHaveProperty("ts");
      expect(data.data).toHaveProperty("db");
      expect(typeof data.data.ts).toBe("string");
      expect(typeof data.data.db).toBe("boolean");
    });

    it("includes valid timestamp format", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const routeContext = { params: Promise.resolve({}) };

      const response = await healthGet(request, routeContext);
      const data = await response.json();

      const timestamp = new Date(data.data.ts);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(Math.abs(Date.now() - timestamp.getTime())).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe("OmniClients API (/api/omni-clients)", () => {
    it("lists omni clients with proper structure", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-clients?page=1&pageSize=10");
      const routeContext = { params: Promise.resolve({}) };

      const response = await omniClientsGet(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data.data).toHaveProperty("items");
      expect(data.data).toHaveProperty("total");
      expect(data.data).toHaveProperty("nextCursor");
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(typeof data.data.total).toBe("number");
    });

    it("supports pagination parameters", async () => {
      const request = new NextRequest("http://localhost:3000/api/omni-clients?page=2&pageSize=25");
      const routeContext = { params: Promise.resolve({}) };

      const response = await omniClientsGet(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      // Pagination parameters are processed without error
    });

    it("creates new omni client with valid data", async () => {
      const clientData = {
        displayName: "New Test Client",
        primaryEmail: "newclient@example.com",
        primaryPhone: "+1234567890",
        stage: "Core Client",
        tags: ["test", "api"],
      };

      const request = new NextRequest("http://localhost:3000/api/omni-clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(clientData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await omniClientsPost(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("ok", true);
      expect(data.data).toHaveProperty("item");
      expect(data.data.item).toHaveProperty("displayName");
      expect(data.data.item).toHaveProperty("id");
    });

    it("validates required fields for client creation", async () => {
      const invalidData = {
        primaryEmail: "invalid@example.com",
        // Missing required displayName
      };

      const request = new NextRequest("http://localhost:3000/api/omni-clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await omniClientsPost(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("ok", false);
      expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("Settings Consent API (/api/settings/consent)", () => {
    it("updates consent settings successfully", async () => {
      const consentData = {
        allowProfilePictureScraping: true,
      };

      const request = new NextRequest("http://localhost:3000/api/settings/consent", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(consentData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await consentPut(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("data");
    });

    it("validates consent data structure", async () => {
      const invalidData = {
        allowProfilePictureScraping: "not_a_boolean", // Should be boolean
        extraField: "not_allowed", // Strict schema should reject extra fields
      };

      const request = new NextRequest("http://localhost:3000/api/settings/consent", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await consentPut(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("ok", false);
      expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("handles missing required fields", async () => {
      const incompleteData = {}; // Missing allowProfilePictureScraping

      const request = new NextRequest("http://localhost:3000/api/settings/consent", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(incompleteData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await consentPut(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("ok", false);
      expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
    });
  });

  describe("Authentication and Authorization", () => {
    it("health endpoint works without authentication", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const routeContext = { params: Promise.resolve({}) };

      const response = await healthGet(request, routeContext);

      expect(response.status).toBe(200);
      // Health check should work without auth
    });

    it("protected endpoints require authentication", async () => {
      // Mock unauthenticated user
      const { getServerUserId } = await import("@/server/auth/user");
      vi.mocked(getServerUserId).mockRejectedValueOnce(new Error("No session"));

      const request = new NextRequest("http://localhost:3000/api/omni-clients");
      const routeContext = { params: Promise.resolve({}) };

      const response = await omniClientsGet(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("ok", false);
      expect(data.error).toHaveProperty("code", "UNAUTHORIZED");

      // Reset mock for other tests
      vi.mocked(getServerUserId).mockResolvedValue("test-user-123");
    });
  });

  describe("Response Format Consistency", () => {
    it("success responses follow consistent format", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const routeContext = { params: Promise.resolve({}) };

      const response = await healthGet(request, routeContext);
      const data = await response.json();

      expect(data).toHaveProperty("ok", true);
      expect(data).toHaveProperty("data");
      expect(data).toHaveProperty("timestamp");
      expect(typeof data.timestamp).toBe("string");
    });

    it("error responses follow consistent format", async () => {
      const invalidData = { invalid: "data" };

      const request = new NextRequest("http://localhost:3000/api/omni-clients", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await omniClientsPost(request, routeContext);
      const data = await response.json();

      expect(data).toHaveProperty("ok", false);
      expect(data).toHaveProperty("error");
      expect(data.error).toHaveProperty("code");
      expect(data.error).toHaveProperty("timestamp");
      expect(data.error).toHaveProperty("requestId");
    });
  });
});
