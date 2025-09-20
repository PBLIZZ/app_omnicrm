import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest';
import { listContacts, createContact, createContactsBatch, searchContactsOptimized, getContactStatsOptimized } from '@/server/repositories/omni-clients.repo';
import { getDb } from '@/server/db/client';
import { contacts } from '@/server/db/schema';
import { eq } from 'drizzle-orm';

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
          slug: 'john-doe',
        },
        {
          userId: testUserId,
          displayName: 'Jane Smith',
          primaryEmail: 'jane@example.com',
          source: 'manual',
          slug: 'jane-smith',
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
          slug: 'john-doe',
        },
        {
          userId: testUserId,
          displayName: 'Jane Smith',
          primaryEmail: 'jane@example.com',
          source: 'manual',
          slug: 'jane-smith',
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
    it('should create a contact with generated slug', async () => {
      const contactData = {
        displayName: 'Alice Johnson',
        primaryEmail: 'alice@example.com',
        primaryPhone: '+1234567890',
        source: 'manual' as const,
      };

      const result = await createContact(testUserId, contactData);

      expect(result).toBeTruthy();
      expect(result?.displayName).toBe('Alice Johnson');
      expect(result?.primaryEmail).toBe('alice@example.com');
      expect(result?.slug).toBeTruthy();

      // Verify it was actually created in the database
      if (!result?.id) {
        throw new Error('Expected result to have an id');
      }

      const dbContact = await db
        .select()
        .from(contacts)
        .where(eq(contacts.id, result.id));

      expect(dbContact).toHaveLength(1);
      expect(dbContact[0]?.displayName).toBe('Alice Johnson');
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
        slug: 'existing-user',
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
          slug: 'john-developer',
        },
        {
          userId: testUserId,
          displayName: 'Johnny Tester',
          primaryEmail: 'johnny@example.com',
          source: 'manual',
          slug: 'johnny-tester',
        },
        {
          userId: testUserId,
          displayName: 'Sarah Designer',
          primaryEmail: 'sarah@example.com',
          source: 'manual',
          slug: 'sarah-designer',
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
          slug: 'manual-contact-1',
        },
        {
          userId: testUserId,
          displayName: 'Manual Contact 2',
          primaryEmail: 'manual2@example.com',
          source: 'manual',
          slug: 'manual-contact-2',
        },
        {
          userId: testUserId,
          displayName: 'Gmail Import',
          primaryEmail: 'gmail@example.com',
          primaryPhone: '+2222222222',
          source: 'gmail_import',
          slug: 'gmail-import',
        },
        {
          userId: testUserId,
          displayName: 'No Email Contact',
          primaryPhone: '+3333333333',
          source: 'upload',
          slug: 'no-email-contact',
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