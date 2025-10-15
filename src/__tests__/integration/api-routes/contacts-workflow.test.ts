/**
 * Contacts API Routes - Integration Tests
 *
 * Tests complete CRUD workflows for Contacts with real database:
 * - Full contact lifecycle (create, read, update, delete)
 * - User isolation and security
 * - Search and filtering
 * - Bulk operations
 * - Contact suggestions
 *
 * Coverage Target: 80%+
 */

import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";

// Unmock for real database and API access in integration tests
vi.unmock("@/lib/api");
vi.unmock("drizzle-orm/postgres-js");
vi.unmock("postgres");

// Mock next/headers for API route testing
vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve({
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

import { GET as getContacts, POST as createContact } from "@/app/api/contacts/route";
import {
  GET as getContactById,
  PUT as updateContact,
  DELETE as deleteContact,
} from "@/app/api/contacts/[contactId]/route";
import { GET as getContactCount } from "@/app/api/contacts/count/route";
import { POST as bulkDeleteContacts } from "@/app/api/contacts/bulk-delete/route";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { makeRouteContext } from "@/__tests__/helpers/routeContext";
import { logger } from "@/lib/observability/unified-logger";

// Mock authentication
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-contacts-workflow"),
}));

describe("Contacts API Routes - Integration Workflow Tests", () => {
  let db: Awaited<ReturnType<typeof getDb>>;
  const testUserId = "test-user-contacts-workflow";
  const cleanupIds: string[] = [];
  let dbAvailable = false;

  beforeAll(async () => {
    try {
      db = await getDb();
      dbAvailable = true;
    } catch (error) {
      console.warn("⚠️  Database not available for integration tests. Tests will be skipped.");
      console.warn("   To run integration tests, ensure DATABASE_URL is configured.");
      dbAvailable = false;
    }
  });

  afterEach(async () => {
    // Cleanup test data after each test
    for (const id of cleanupIds) {
      try {
        await db.delete(contacts).where(eq(contacts.id, id));
      } catch (error) {
        const errorInstance = error instanceof Error ? error : new Error(String(error));
        logger.debug(`Cleanup failed for contact ${id}`, {
          operation: "test_cleanup",
          additionalData: { id },
        }, errorInstance);
      }
    }
    cleanupIds.length = 0;
  });

  afterAll(async () => {
    // Final cleanup - remove all test user data
    try {
      await db.delete(contacts).where(eq(contacts.userId, testUserId));
    } catch (error) {
      const errorInstance = error instanceof Error ? error : new Error(String(error));
      logger.debug("Final cleanup failed", {
        operation: "test_cleanup",
        additionalData: { userId: testUserId },
      }, errorInstance);
    }
  });

  describe("Full CRUD Workflow", () => {
    it.skipIf(!dbAvailable)("should complete create → read → update → delete lifecycle", async () => {
      // 1. Create contact
      const createData = {
        displayName: "Workflow Test User",
        primaryEmail: "workflow@test.com",
        primaryPhone: "+1234567890",
      };

      const createRequest = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(createData),
      });

      const createResponse = await createContact(createRequest, makeRouteContext());
      const createdContact = await createResponse.json();

      expect(createResponse.status).toBe(200);
      expect(createdContact).toHaveProperty("id");
      expect(createdContact.displayName).toBe("Workflow Test User");
      
      cleanupIds.push(createdContact.id);

      // 2. Read contact by ID
      const getRequest = new Request(`http://localhost:3000/api/contacts/${createdContact.id}`);
      const getResponse = await getContactById(
        getRequest,
        makeRouteContext({ contactId: createdContact.id })
      );
      const fetchedContact = await getResponse.json();

      expect(getResponse.status).toBe(200);
      expect(fetchedContact.id).toBe(createdContact.id);
      expect(fetchedContact.displayName).toBe("Workflow Test User");

      // 3. Update contact
      const updateData = {
        displayName: "Updated Workflow User",
        primaryEmail: "updated-workflow@test.com",
      };

      const updateRequest = new Request(`http://localhost:3000/api/contacts/${createdContact.id}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(updateData),
      });

      const updateResponse = await updateContact(
        updateRequest,
        makeRouteContext({ contactId: createdContact.id })
      );
      const updatedContact = await updateResponse.json();

      expect(updateResponse.status).toBe(200);
      expect(updatedContact.displayName).toBe("Updated Workflow User");
      expect(updatedContact.primaryEmail).toBe("updated-workflow@test.com");

      // 4. Delete contact
      const deleteRequest = new Request(`http://localhost:3000/api/contacts/${createdContact.id}`, {
        method: "DELETE",
      });

      const deleteResponse = await deleteContact(
        deleteRequest,
        makeRouteContext({ contactId: createdContact.id })
      );
      const deleteResult = await deleteResponse.json();

      expect(deleteResponse.status).toBe(200);
      expect(deleteResult.deleted).toBe(1);

      // 5. Verify deletion (should return 404)
      const verifyRequest = new Request(`http://localhost:3000/api/contacts/${createdContact.id}`);
      const verifyResponse = await getContactById(
        verifyRequest,
        makeRouteContext({ contactId: createdContact.id })
      );

      expect(verifyResponse.status).toBe(404);

      // Remove from cleanup since already deleted
      const index = cleanupIds.indexOf(createdContact.id);
      if (index > -1) {
        cleanupIds.splice(index, 1);
      }
    });
  });

  describe("List and Search Operations", () => {
    it.skipIf(!dbAvailable)("should list all contacts for user", async () => {
      // Create test contacts
      const testContacts = await db
        .insert(contacts)
        .values([
          {
            userId: testUserId,
            displayName: "Alice Test",
            primaryEmail: "alice@test.com",
            source: "manual",
          },
          {
            userId: testUserId,
            displayName: "Bob Test",
            primaryEmail: "bob@test.com",
            source: "manual",
          },
        ])
        .returning();

      testContacts.forEach((contact) => {
        if (contact) cleanupIds.push(contact.id);
      });

      const listRequest = new Request("http://localhost:3000/api/contacts?page=1&pageSize=10");
      const listResponse = await getContacts(listRequest, makeRouteContext());
      const listData = await listResponse.json();

      expect(listResponse.status).toBe(200);
      expect(listData).toHaveProperty("items");
      expect(listData).toHaveProperty("pagination");
      expect(listData.pagination).toHaveProperty("total");
      expect(listData.items.length).toBeGreaterThanOrEqual(2);
    });

    it.skipIf(!dbAvailable)("should filter contacts by search query", async () => {
      // Create test contacts
      const testContacts = await db
        .insert(contacts)
        .values([
          {
            userId: testUserId,
            displayName: "Searchable John",
            primaryEmail: "searchable-john@test.com",
            source: "manual",
          },
          {
            userId: testUserId,
            displayName: "Different Jane",
            primaryEmail: "different-jane@test.com",
            source: "manual",
          },
        ])
        .returning();

      testContacts.forEach((contact) => {
        if (contact) cleanupIds.push(contact.id);
      });

      const searchRequest = new Request("http://localhost:3000/api/contacts?search=Searchable");
      const searchResponse = await getContacts(searchRequest, makeRouteContext());
      const searchData = await searchResponse.json();

      expect(searchResponse.status).toBe(200);
      expect(searchData.items.length).toBeGreaterThanOrEqual(1);
      
      const hasSearchable = searchData.items.some((item: { displayName: string }) =>
        item.displayName.includes("Searchable")
      );
      expect(hasSearchable).toBe(true);
    });
  });

  describe("Contact Count Operations", () => {
    it.skipIf(!dbAvailable)("should return accurate contact count", async () => {
      // Create test contacts
      const testContacts = await db
        .insert(contacts)
        .values([
          {
            userId: testUserId,
            displayName: "Count Test 1",
            primaryEmail: "count1@test.com",
            source: "manual",
          },
          {
            userId: testUserId,
            displayName: "Count Test 2",
            primaryEmail: "count2@test.com",
            source: "manual",
          },
          {
            userId: testUserId,
            displayName: "Count Test 3",
            primaryEmail: "count3@test.com",
            source: "manual",
          },
        ])
        .returning();

      testContacts.forEach((contact) => {
        if (contact) cleanupIds.push(contact.id);
      });

      const countRequest = new Request("http://localhost:3000/api/contacts/count");
      const countResponse = await getContactCount(countRequest, makeRouteContext());
      const countData = await countResponse.json();

      expect(countResponse.status).toBe(200);
      expect(countData).toHaveProperty("count");
      expect(countData.count).toBeGreaterThanOrEqual(3);
    });
  });

  describe("Bulk Delete Operations", () => {
    it.skipIf(!dbAvailable)("should delete multiple contacts", async () => {
      // Create test contacts
      const testContacts = await db
        .insert(contacts)
        .values([
          {
            userId: testUserId,
            displayName: "Bulk Delete 1",
            primaryEmail: "bulk1@test.com",
            source: "manual",
          },
          {
            userId: testUserId,
            displayName: "Bulk Delete 2",
            primaryEmail: "bulk2@test.com",
            source: "manual",
          },
          {
            userId: testUserId,
            displayName: "Bulk Delete 3",
            primaryEmail: "bulk3@test.com",
            source: "manual",
          },
        ])
        .returning();

      const contactIds = testContacts.map((c) => c?.id).filter((id): id is string => !!id);
      
      const bulkDeleteRequest = new Request("http://localhost:3000/api/contacts/bulk-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: contactIds }),
      });

      const bulkDeleteResponse = await bulkDeleteContacts(bulkDeleteRequest, makeRouteContext());
      const bulkDeleteData = await bulkDeleteResponse.json();

      expect(bulkDeleteResponse.status).toBe(200);
      expect(bulkDeleteData).toHaveProperty("deleted");
      expect(bulkDeleteData.deleted).toBe(3);

      // Verify deletion
      const verifyRequest = new Request("http://localhost:3000/api/contacts/count");
      const verifyResponse = await getContactCount(verifyRequest, makeRouteContext());
      const verifyData = await verifyResponse.json();

      // Count should have decreased
      expect(verifyData.count).toBeLessThan(3);
    });
  });

  describe("User Isolation", () => {
    it.skipIf(!dbAvailable)("should not allow access to other users' contacts", async () => {
      // Create contact for another user directly in DB
      const otherUserContact = await db
        .insert(contacts)
        .values({
          userId: "other-user-id",
          displayName: "Other User Contact",
          primaryEmail: "other@test.com",
          source: "manual",
        })
        .returning();

      const otherContactId = otherUserContact[0]?.id;
      expect(otherContactId).toBeDefined();

      // Try to access other user's contact with our test user
      const getRequest = new Request(`http://localhost:3000/api/contacts/${otherContactId}`);
      const getResponse = await getContactById(
        getRequest,
        makeRouteContext({ contactId: otherContactId as string })
      );

      // Should return 404 (not found) to prevent information leakage
      expect(getResponse.status).toBe(404);

      // Cleanup other user's contact
      if (otherContactId) {
        await db.delete(contacts).where(eq(contacts.id, otherContactId));
      }
    });
  });

  describe("Validation and Error Handling", () => {
    it.skipIf(!dbAvailable)("should reject invalid email format", async () => {
      const invalidData = {
        displayName: "Invalid Email Test",
        primaryEmail: "not-an-email",
      };

      const createRequest = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const createResponse = await createContact(createRequest, makeRouteContext());
      expect(createResponse.status).toBe(400);
    });

    it.skipIf(!dbAvailable)("should reject missing required fields", async () => {
      const invalidData = {
        primaryEmail: "test@test.com",
        // Missing displayName
      };

      const createRequest = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(invalidData),
      });

      const createResponse = await createContact(createRequest, makeRouteContext());
      expect(createResponse.status).toBe(400);
    });

    it.skipIf(!dbAvailable)("should handle malformed JSON gracefully", async () => {
      const createRequest = new Request("http://localhost:3000/api/contacts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "invalid json {",
      });

      const createResponse = await createContact(createRequest, makeRouteContext());
      expect(createResponse.status).toBe(400);
    });
  });
});
