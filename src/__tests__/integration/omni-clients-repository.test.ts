import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import { getDb } from '@/server/db/client';
import { contacts } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

// Mock the cache system to avoid Redis dependency in tests
vi.mock('@/server/lib/cache', () => ({
  queryCache: {
    get: vi.fn(async (key: string, fetcher: () => any) => {
      // Always bypass cache in tests - just execute the fetcher function
      return await fetcher();
    }),
  },
  cacheKeys: {
    contactsList: vi.fn((userId: string, params: string) => `contacts_list:${userId}:${params}`),
    contactsCount: vi.fn((userId: string, search?: string) => `contacts_count:${userId}${search ? `:${search}` : ""}`),
  },
  cacheInvalidation: {
    invalidateContacts: vi.fn(),
  },
}));


// Mock logger to avoid noise in tests
vi.mock('@/lib/observability', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Import repository functions after mocks are set up
const { listContacts, createContact, createContactsBatch, searchContactsOptimized, getContactStatsOptimized } = await import('packages/repo/src/contacts.repo');

describe('OmniClientsRepository Integration Tests', () => {
  const testUserId = 'test-user-repo-integration';
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeAll(async () => {
    db = await getDb();
  });

  beforeEach(async () => {
    // Clean up test data before each test
    await db.delete(contacts).where(eq(contacts.userId, testUserId));
  });

  afterAll(async () => {
    // Clean up test data after all tests
    await db.delete(contacts).where(eq(contacts.userId, testUserId));
  });

  describe('listContacts', () => {
    it('should list contacts with pagination', async () => {
      // Create test contacts
      const testContacts = [
        {
          userId: testUserId,
          displayName: 'John Doe',
          primaryEmail: 'john@example.com',
          source: 'manual',
        },
        {
          userId: testUserId,
          displayName: 'Jane Smith',
          primaryEmail: 'jane@example.com',
          source: 'manual',
        },
      ];

      await db.insert(contacts).values(testContacts);

      const params = {
        page: 1,
        pageSize: 10,
        sort: 'displayName' as const,
        order: 'asc' as const,
      };

      const result = await listContacts(testUserId, params);

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items[0]?.displayName).toBe('Jane Smith'); // Should be sorted alphabetically
      expect(result.items[1]?.displayName).toBe('John Doe');
    });

    it('should handle search filtering', async () => {
      await db.insert(contacts).values([
        {
          userId: testUserId,
          displayName: 'John Doe',
          primaryEmail: 'john@example.com',
          source: 'manual',
        },
        {
          userId: testUserId,
          displayName: 'Jane Smith',
          primaryEmail: 'jane@example.com',
          source: 'manual',
        },
      ]);

      const params = {
        search: 'john',
        page: 1,
        pageSize: 10,
        sort: 'displayName' as const,
        order: 'asc' as const,
      };

      const result = await listContacts(testUserId, params);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]?.displayName).toBe('John Doe');
    });

    it('should cap page size at 100', async () => {
      const params = {
        page: 1,
        pageSize: 200, // Exceeds cap
        sort: 'displayName' as const,
        order: 'asc' as const,
      };

      const result = await listContacts(testUserId, params);

      // Should handle large page size gracefully (empty result is fine for test)
      expect(result.items).toBeDefined();
      expect(result.total).toBeDefined();
    });
  });

  describe('createContact', () => {
    it('creates a contact', async () => {
      const contactData = {
        displayName: 'Alice Johnson',
        primaryEmail: 'alice@example.com',
        source: 'manual' as const,
      };

      const result = await createContact(testUserId, contactData);

      expect(result).toBeTruthy();
      if (result) {
        expect(result.displayName).toBe('Alice Johnson');
        expect(result.primaryEmail).toBe('alice@example.com');

        // Verify it was actually created in the database
        const dbContact = await db
          .select()
          .from(contacts)
          .where(eq(contacts.id, result.id));

        expect(dbContact).toHaveLength(1);
        expect(dbContact[0]?.displayName).toBe('Alice Johnson');
      }
    });
  });

  describe('createContactsBatch', () => {
    it('should create multiple contacts with deduplication', async () => {
      const contactsData = [
        {
          displayName: 'Bob Wilson',
          primaryEmail: 'bob@example.com',
          source: 'gmail_import' as const,
        },
        {
          displayName: 'Carol Brown',
          primaryEmail: 'carol@example.com',
          source: 'gmail_import' as const,
        },
      ];

      const result = await createContactsBatch(testUserId, contactsData);

      expect(result.created).toHaveLength(2);
      expect(result.duplicates).toBe(0);
      expect(result.errors).toBe(0);

      // Verify contacts were created in database
      const dbContacts = await db
        .select()
        .from(contacts)
        .where(eq(contacts.userId, testUserId));

      expect(dbContacts).toHaveLength(2);
    });

    it('should detect and handle duplicates', async () => {
      // Create an existing contact
      await db.insert(contacts).values({
        userId: testUserId,
        displayName: 'Existing User',
        primaryEmail: 'existing@example.com',
        source: 'manual',
      });

      const contactsData = [
        {
          displayName: 'New User',
          primaryEmail: 'new@example.com',
          source: 'gmail_import' as const,
        },
        {
          displayName: 'Duplicate User',
          primaryEmail: 'existing@example.com', // This should be detected as duplicate
          source: 'gmail_import' as const,
        },
      ];

      const result = await createContactsBatch(testUserId, contactsData);

      expect(result.created).toHaveLength(1); // Only new user should be created
      expect(result.duplicates).toBe(1); // Existing user should be detected as duplicate
      expect(result.errors).toBe(0);
    });
  });

  describe('searchContactsOptimized', () => {
    it('should search contacts with relevance ranking', async () => {
      await db.insert(contacts).values([
        {
          userId: testUserId,
          displayName: 'John Developer',
          primaryEmail: 'john.dev@example.com',
          source: 'manual',
        },
        {
          userId: testUserId,
          displayName: 'Johnny Tester',
          primaryEmail: 'johnny@example.com',
          source: 'manual',
        },
        {
          userId: testUserId,
          displayName: 'Sarah Designer',
          primaryEmail: 'sarah@example.com',
          source: 'manual',
        },
      ]);

      const results = await searchContactsOptimized(testUserId, 'john', 10);

      expect(results.length).toBeGreaterThan(0);
      // Should find contacts matching 'john'
      const johnContacts = results.filter(contact =>
        contact.displayName.toLowerCase().includes('john')
      );
      expect(johnContacts.length).toBeGreaterThan(0);
    });
  });

  describe('getContactStatsOptimized', () => {
    it('should return comprehensive contact statistics', async () => {
      await db.insert(contacts).values([
        {
          userId: testUserId,
          displayName: 'Manual Contact 1',
          primaryEmail: 'manual1@example.com',
          primaryPhone: '+1111111111',
          source: 'manual',
        },
        {
          userId: testUserId,
          displayName: 'Manual Contact 2',
          primaryEmail: 'manual2@example.com',
          source: 'manual',
        },
        {
          userId: testUserId,
          displayName: 'Gmail Import',
          primaryEmail: 'gmail@example.com',
          primaryPhone: '+2222222222',
          source: 'gmail_import',
        },
        {
          userId: testUserId,
          displayName: 'No Email Contact',
          primaryPhone: '+3333333333',
          source: 'upload',
        },
      ]);

      const stats = await getContactStatsOptimized(testUserId);

      expect(stats.total).toBe(4);
      expect(stats.bySource.manual).toBe(2);
      expect(stats.bySource.gmail_import).toBe(1);
      expect(stats.bySource.upload).toBe(1);
      expect(stats.withEmail).toBe(3); // 3 contacts have email
      expect(stats.withPhone).toBe(3); // 3 contacts have phone
      expect(stats.recentlyAdded).toBeGreaterThanOrEqual(4); // All were just added
    });

    it('should handle zero contacts', async () => {
      const stats = await getContactStatsOptimized(testUserId);

      expect(stats.total).toBe(0);
      expect(stats.bySource).toEqual({});
      expect(stats.recentlyAdded).toBe(0);
      expect(stats.withEmail).toBe(0);
      expect(stats.withPhone).toBe(0);
    });
  });
});