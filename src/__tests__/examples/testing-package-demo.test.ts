/**
 * Demo test showing how to use the @packages/testing utilities
 * This test demonstrates the testing package's capabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupRepoMocks,
  resetRepoMocks,
  configureCommonScenarios,
  makeOmniClient,
  makeOmniClientWithNotes,
  makeBatch,
  makeContactWithRelations,
  testUtils,
} from '@packages/testing';

describe('Testing Package Demo', () => {
  const fakes = setupRepoMocks();
  const scenarios = configureCommonScenarios(fakes);

  beforeEach(() => {
    resetRepoMocks(fakes);
  });

  describe('Factory Usage Examples', () => {
    it('should generate single contact', () => {
      const contact = makeOmniClient({
        displayName: 'Test Contact',
        primaryEmail: 'test@wellness.com',
        stage: 'VIP Client',
      });

      expect(contact.displayName).toBe('Test Contact');
      expect(contact.primaryEmail).toBe('test@wellness.com');
      expect(contact.stage).toBe('VIP Client');
      expect(contact.id).toMatch(/^[a-f0-9-]{36}$/); // UUID
    });

    it('should generate batch of contacts', () => {
      const contacts = makeBatch(() => makeOmniClientWithNotes(), 5);

      expect(contacts).toHaveLength(5);
      contacts.forEach(contact => {
        expect(contact).toHaveProperty('id');
        expect(contact).toHaveProperty('displayName');
        expect(contact).toHaveProperty('notesCount');
      });

      // All should have different IDs
      const ids = contacts.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(5);
    });

    it('should generate contact with relations', () => {
      const { contact, notes, interactions } = makeContactWithRelations({
        contact: { displayName: 'Yoga Client' },
        noteCount: 3,
        interactionCount: 5,
      });

      expect(contact.displayName).toBe('Yoga Client');
      expect(notes).toHaveLength(3);
      expect(interactions).toHaveLength(5);

      // Verify relationships
      notes.forEach(note => {
        expect(note.contactId).toBe(contact.id);
        expect(note.userId).toBe(contact.userId);
      });

      interactions.forEach(interaction => {
        expect(interaction.contactId).toBe(contact.id);
        expect(interaction.userId).toBe(contact.userId);
      });
    });
  });

  describe('Repository Mock Examples', () => {
    it('should mock listContacts with default behavior', async () => {
      const userId = testUtils.defaultUserId;
      const params = testUtils.createPaginationParams({ pageSize: 3 });

      const result = await fakes.omniClients.listContacts(userId, params);

      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('total');
      expect(result.items).toHaveLength(3);
      expect(fakes.omniClients.listContacts).toHaveBeenCalledWith(userId, params);
    });

    it('should mock empty database scenario', async () => {
      scenarios.emptyDatabase();

      const userId = testUtils.defaultUserId;
      const params = testUtils.createPaginationParams();

      const result = await fakes.omniClients.listContacts(userId, params);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should mock rich contact data scenario', async () => {
      const userId = testUtils.defaultUserId;
      scenarios.richContactData(userId);

      const params = testUtils.createPaginationParams();
      const result = await fakes.omniClients.listContacts(userId, params);

      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toHaveProperty('id');
      expect(result.items[0].userId).toBe(userId);
    });

    it('should handle custom mock behaviors', async () => {
      // Custom mock implementation
      fakes.omniClients.createContact.mockResolvedValue(
        makeOmniClientWithNotes({
          displayName: 'Custom Created Contact',
          source: 'manual',
        })
      );

      const userId = testUtils.defaultUserId;
      const values = {
        displayName: 'Test Contact',
        primaryEmail: 'test@example.com',
        primaryPhone: null,
        source: 'manual' as const,
      };

      const result = await fakes.omniClients.createContact(userId, values);

      expect(result).not.toBeNull();
      expect(result!.displayName).toBe('Custom Created Contact');
      expect(result!.source).toBe('manual');
      expect(fakes.omniClients.createContact).toHaveBeenCalledWith(userId, values);
    });
  });

  describe('Test Utilities Examples', () => {
    it('should use default test values', () => {
      const user = testUtils.createTestUser();
      const params = testUtils.createPaginationParams();

      expect(user.userId).toBe(testUtils.defaultUserId);
      expect(user.email).toContain('@example.com');
      expect(params.page).toBe(1);
      expect(params.pageSize).toBe(10);
    });

    it('should use custom test values', () => {
      const user = testUtils.createTestUser({
        userId: 'custom-user-123',
        email: 'custom@wellness.com',
      });

      const params = testUtils.createPaginationParams({
        pageSize: 25,
        search: 'yoga',
        sort: 'createdAt',
        order: 'desc',
      });

      expect(user.userId).toBe('custom-user-123');
      expect(user.email).toBe('custom@wellness.com');
      expect(params.pageSize).toBe(25);
      expect(params.search).toBe('yoga');
      expect(params.sort).toBe('createdAt');
      expect(params.order).toBe('desc');
    });

    it('should provide date ranges', () => {
      const lastWeek = testUtils.dateRanges.lastWeek;
      const lastMonth = testUtils.dateRanges.lastMonth;

      expect(lastWeek.from).toBeInstanceOf(Date);
      expect(lastWeek.to).toBeInstanceOf(Date);
      expect(lastWeek.from.getTime()).toBeLessThan(lastWeek.to.getTime());

      expect(lastMonth.from).toBeInstanceOf(Date);
      expect(lastMonth.to).toBeInstanceOf(Date);
      expect(lastMonth.from.getTime()).toBeLessThan(lastWeek.from.getTime());
    });

    it('should provide common headers', () => {
      expect(testUtils.headers.json).toEqual({ 'Content-Type': 'application/json' });
      expect(testUtils.headers.csrf).toEqual({ 'x-csrf-token': 'test-csrf-token' });
      expect(testUtils.headers.auth).toEqual({ Authorization: 'Bearer test-token' });
    });

    it('should provide common errors', () => {
      expect(testUtils.errors.validation).toBeInstanceOf(Error);
      expect(testUtils.errors.validation.message).toBe('Validation failed');
      expect(testUtils.errors.notFound.message).toBe('Resource not found');
      expect(testUtils.errors.database.message).toBe('Database connection error');
    });
  });

  describe('Error Scenarios', () => {
    it('should handle database errors', async () => {
      scenarios.databaseError();

      await expect(
        fakes.omniClients.listContacts(testUtils.defaultUserId, testUtils.createPaginationParams())
      ).rejects.toThrow('Database connection error');
    });

    it('should handle user not found', async () => {
      scenarios.userNotFound('non-existent-user');

      const result = await fakes.authUser.getUserContext('non-existent-user');
      expect(result).toBeNull();

      const exists = await fakes.authUser.userExists('non-existent-user');
      expect(exists).toBe(false);
    });
  });

  describe('Wellness Business Data', () => {
    it('should generate wellness-specific tags', () => {
      const contacts = makeBatch(() => makeOmniClient(), 10);

      // Check that some wellness tags are present
      const allTags = contacts.flatMap(c => c.tags || []);
      const wellnessTags = ['Yoga', 'Massage', 'Meditation', 'Stress Relief', 'VIP Client'];

      expect(allTags.some(tag => wellnessTags.includes(tag))).toBe(true);
    });

    it('should generate realistic client stages', () => {
      const contacts = makeBatch(() => makeOmniClient(), 20);
      const stages = contacts.map(c => c.stage).filter(Boolean);
      const validStages = [
        'Prospect', 'New Client', 'Core Client', 'Referring Client',
        'VIP Client', 'Lost Client', 'At Risk Client'
      ];

      stages.forEach(stage => {
        expect(validStages).toContain(stage);
      });
    });
  });
});