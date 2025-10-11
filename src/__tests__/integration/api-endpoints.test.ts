import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability/unified-logger";

// Import API route handlers
import { GET as healthGet } from "@/app/api/health/route";
import { GET as contactsGet, POST as contactsPost } from "@/app/api/contacts/route";
import { PUT as consentPut } from "@/app/api/settings/consent/route";

// Import auth utilities
import { getServerUserId } from "@/server/auth/user";

// Mock auth utilities - make it controllable per test
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-api-endpoints"),
}));

// Mock services to return realistic test data
vi.mock("@/server/services/contacts.service", () => ({
  listContactsService: vi.fn().mockResolvedValue({
    items: [
      {
        id: "contact-1",
        displayName: "Test Contact",
        primaryEmail: "test@example.com",
        source: "manual",
        stage: "Core Client",
        tags: ["yoga"],
        confidenceScore: "0.85",
      },
    ],
    total: 1,
    nextCursor: null,
  }),
  createContactService: vi.fn().mockResolvedValue({
    id: "new-contact-id",
    displayName: "New Test Client",
    primaryEmail: "new@example.com",
    source: "manual",
    stage: "Prospect",
    tags: [],
    confidenceScore: "0.95",
  }),
}));

/**
 * API Endpoints Integration Tests
 *
 * These tests verify API endpoint functionality across different domains:
 * - System health endpoints
 * - Business entity CRUD operations
 * - Authentication and authorization
 * - Input validation and error handling
 * - Rate limiting and response formatting
 */
describe("API Endpoints Integration Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testUserId = "test-user-api-endpoints";
  const cleanupIds: { table: string; id: string }[] = [];
  const mockGetServerUserId = vi.mocked(getServerUserId);

  beforeAll(async () => {
    db = await getDb();
  });

  afterEach(async () => {
    // Clean up test data
    for (const { table, id } of cleanupIds.reverse()) {
      try {
        switch (table) {
          case "contacts":
            await db.delete(contacts).where(eq(contacts.id, id));
            break;
        }
      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        logger.debug(`Cleanup failed for ${table}:${id}`, {
          operation: "test_cleanup",
          additionalData: { table, id }
        }, errorInstance);
      }
    }
    cleanupIds.length = 0;
  });

  afterAll(async () => {
    // Final cleanup
    await db.delete(contacts).where(eq(contacts.userId, testUserId));

    vi.resetAllMocks();
  });

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

    it("includes database connectivity status", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const routeContext = { params: Promise.resolve({}) };

      const response = await healthGet(request, routeContext);
      const data = await response.json();

      expect(data.data.db).toBeDefined();
      // Database should be available in test environment
      expect(data.data.db).toBe(true);
    });

    it("returns valid timestamp format", async () => {
      const request = new NextRequest("http://localhost:3000/api/health");
      const routeContext = { params: Promise.resolve({}) };

      const response = await healthGet(request, routeContext);
      const data = await response.json();

      const timestamp = new Date(data.data.ts);
      expect(timestamp.getTime()).not.toBeNaN();
      expect(Math.abs(Date.now() - timestamp.getTime())).toBeLessThan(5000); // Within 5 seconds
    });
  });

  describe("Contacts API (/api/contacts)", () => {
    beforeEach(() => {
      // Mock authenticated user
      vi.mocked(getServerUserId).mockResolvedValue(testUserId);
    });

    it("lists omni clients with proper pagination", async () => {
      // Create test contact
      await db.insert(contacts).values({
        userId: testUserId,
        displayName: "Test Client",
        primaryEmail: "test@example.com",
        source: "manual",
      });

      const request = new NextRequest("http://localhost:3000/api/contacts?page=1&pageSize=10");
      const routeContext = { params: Promise.resolve({}) };

      const response = await contactsGet(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toHaveProperty("ok", true);
      expect(data.data).toHaveProperty("items");
      expect(data.data).toHaveProperty("total");
      expect(data.data).toHaveProperty("nextCursor");
      expect(Array.isArray(data.data.items)).toBe(true);
      expect(typeof data.data.total).toBe("number");
      expect(data.data.total).toBeGreaterThanOrEqual(0);
    });

    it("supports search filtering", async () => {
      // Create test contacts with different names
      const contacts1 = await db
        .insert(contacts)
        .values([
          {
            userId: testUserId,
            displayName: "John Searchable",
            primaryEmail: "john@example.com",
            source: "manual",
          },
          {
            userId: testUserId,
            displayName: "Jane Different",
            primaryEmail: "jane@example.com",
            source: "manual",
          },
        ])
        .returning();

      contacts1.forEach((contact) => {
        if (contact) cleanupIds.push({ table: "contacts", id: contact.id });
      });

      const request = new NextRequest("http://localhost:3000/api/contacts?search=Searchable");
      const routeContext = { params: Promise.resolve({}) };

      const response = await contactsGet(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.data.items.length).toBeGreaterThanOrEqual(1);
      expect(
        data.data.items.some((item: { displayName: string }) =>
          item.displayName.includes("Searchable"),
        ),
      ).toBe(true);
    });

    it("creates new omni client with validation", async () => {
      const clientData = {
        displayName: "New Test Client",
        primaryEmail: "newclient@example.com",
        primaryPhone: "+1234567890",
        stage: "Core Client",
        tags: ["test", "api"],
      };

      const request = new NextRequest("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(clientData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await contactsPost(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toHaveProperty("ok", true);
      expect(data.data).toHaveProperty("item");
      expect(data.data.item).toHaveProperty("displayName", clientData.displayName);
      expect(data.data.item).toHaveProperty("primaryEmail", clientData.primaryEmail);
      expect(data.data.item).toHaveProperty("id");

      if (data.data.item?.id) {
        cleanupIds.push({ table: "contacts", id: data.data.item.id });
      }
    });

    it("validates required fields for client creation", async () => {
      const invalidData = {
        primaryEmail: "invalid@example.com",
        // Missing required displayName
      };

      const request = new NextRequest("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });
      const routeContext = { params: Promise.resolve({}) };

      const response = await contactsPost(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data).toHaveProperty("ok", false);
      expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
    });

    it("requires authentication for omni clients access", async () => {
      // Mock unauthenticated user for this test
      mockGetServerUserId.mockRejectedValueOnce(new Error("No session"));

      const request = new NextRequest("http://localhost:3000/api/contacts");
      const routeContext = { params: Promise.resolve({}) };

      const response = await contactsGet(request, routeContext);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data).toHaveProperty("ok", false);
      expect(data.error).toHaveProperty("code", "UNAUTHORIZED");
    });
  });

  describe("Projects API (/api/projects)", () => {
    beforeEach(() => {
      // Mock authenticated user
      vi.doMock("@/server/auth/user", () => ({
        getServerUserId: vi.fn().mockResolvedValue(testUserId),
      }));
    });

    describe("Settings Consent API (/api/settings/consent)", () => {
      beforeEach(() => {
        // Mock authenticated user
        vi.doMock("@/server/auth/user", () => ({
          getServerUserId: vi.fn().mockResolvedValue(testUserId),
        }));
      });

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

      it("requires authentication for consent updates", async () => {
        // Mock unauthenticated user for this test
        mockGetServerUserId.mockRejectedValueOnce(new Error("No session"));

        const consentData = {
          allowProfilePictureScraping: false,
        };

        const request = new NextRequest("http://localhost:3000/api/settings/consent", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(consentData),
        });
        const routeContext = { params: Promise.resolve({}) };

        const response = await consentPut(request, routeContext);
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data).toHaveProperty("ok", false);
        expect(data.error).toHaveProperty("code", "UNAUTHORIZED");
      });

      it("handles malformed JSON gracefully", async () => {
        const request = new NextRequest("http://localhost:3000/api/settings/consent", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: "invalid json {",
        });
        const routeContext = { params: Promise.resolve({}) };

        const response = await consentPut(request, routeContext);
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data).toHaveProperty("ok", false);
        expect(data.error).toHaveProperty("code", "VALIDATION_ERROR");
        expect(data.error.message).toContain("Invalid JSON");
      });
    });
  });
});
