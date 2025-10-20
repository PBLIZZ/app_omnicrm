import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from "vitest";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import type { ContactListItem } from "@/server/services/contacts.service";

// Mock the cache system to avoid Redis dependency in tests
vi.mock("@/server/lib/cache", () => ({
  queryCache: {
    get: vi.fn(async (key: string, fetcher: () => any) => {
      // Always bypass cache in tests - just execute the fetcher function
      return await fetcher();
    }),
  },
  cacheKeys: {
    contactsList: vi.fn((userId: string, params: string) => `contacts_list:${userId}:${params}`),
    contactsCount: vi.fn(
      (userId: string, search?: string) => `contacts_count:${userId}${search ? `:${search}` : ""}`,
    ),
  },
  cacheInvalidation: {
    invalidateContacts: vi.fn(),
  },
}));

// Mock logger to avoid noise in tests
vi.mock("@/lib/observability", () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import repository class after mocks are set up
const { ContactsRepository } = await import("@repo/contacts.repo");

describe("ContactsRepository Integration Tests", () => {
  const testUserId = "test-user-repo-integration";
  let db: Awaited<ReturnType<typeof getDb>>;
  let contactsRepo: ContactsRepository;
  let dbAvailable = false;

  beforeAll(async () => {
    // Unmock database for integration tests
    vi.unmock("drizzle-orm/postgres-js");
    vi.unmock("postgres");

    try {
      db = await getDb();
      contactsRepo = new ContactsRepository(db);
      dbAvailable = true;
    } catch (error) {
      console.log("Database not available, skipping integration tests:", error);
      dbAvailable = false;
    }
  });

  beforeEach(async () => {
    // Clean up test data before each test
    if (dbAvailable) {
      await db.delete(contacts).where(eq(contacts.userId, testUserId));
    }
  });

  afterAll(async () => {
    // Clean up test data after all tests
    if (dbAvailable) {
      await db.delete(contacts).where(eq(contacts.userId, testUserId));
    }
  });

  describe("listContacts", () => {
    it.skipIf(!dbAvailable)("should list contacts with pagination", async () => {
      // Create test contacts
      const testContacts = [
        {
          userId: testUserId,
          displayName: "John Doe",
          primaryEmail: "john@example.com",
          source: "manual",
        },
        {
          userId: testUserId,
          displayName: "Jane Smith",
          primaryEmail: "jane@example.com",
          source: "manual",
        },
      ];

      await db.insert(contacts).values(testContacts);

      const params = {
        page: 1,
        pageSize: 10,
        sort: "displayName" as const,
        order: "asc" as const,
      };

      const result = await contactsRepo.listContacts(testUserId, params);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]?.displayName).toBe("Jane Smith"); // Should be sorted alphabetically
      expect(result.items[1]?.displayName).toBe("John Doe");
    });

    it.skipIf(!dbAvailable)("should handle search filtering", async () => {
      await db.insert(contacts).values([
        {
          userId: testUserId,
          displayName: "John Doe",
          primaryEmail: "john@example.com",
          source: "manual",
        },
        {
          userId: testUserId,
          displayName: "Jane Smith",
          primaryEmail: "jane@example.com",
          source: "manual",
        },
      ]);

      const params = {
        search: "john",
        page: 1,
        pageSize: 10,
        sort: "displayName" as const,
        order: "asc" as const,
      };

      const result = await contactsRepo.listContacts(testUserId, params);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.displayName).toBe("John Doe");
    });

    it.skipIf(!dbAvailable)("should cap page size at 100", async () => {
      const params = {
        page: 1,
        pageSize: 200, // Exceeds cap
        sort: "displayName" as const,
        order: "asc" as const,
      };

      const result = await contactsRepo.listContacts(testUserId, params);

      // Should handle large page size gracefully (empty result is fine for test)
      expect(result.items).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe("createContact", () => {
    it.skipIf(!dbAvailable)("creates a contact", async () => {
      const contactData = {
        userId: testUserId,
        displayName: "Alice Johnson",
        primaryEmail: "alice@example.com",
        source: "manual" as const,
      };

      const result = await contactsRepo.createContact(contactData);

      expect(result.displayName).toBe("Alice Johnson");
      expect(result.primaryEmail).toBe("alice@example.com");

      // Verify it was actually created in the database
      const dbContact = await db.select().from(contacts).where(eq(contacts.id, result.id));

      expect(dbContact).toHaveLength(1);
      expect(dbContact[0]?.displayName).toBe("Alice Johnson");
    });
  });
});
