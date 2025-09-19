import { describe, it, expect } from 'vitest';
import {
  makeOmniClient,
  makeOmniClientWithNotes,
  makeInteraction,
  makeBatch,
  makeContactWithRelations,
  testUtils
} from '../index';

describe('Testing Package Factories', () => {
  describe('makeOmniClient', () => {
    it('should generate a valid OmniClient', () => {
      const client = makeOmniClient();

      expect(client).toHaveProperty('id');
      expect(client).toHaveProperty('userId');
      expect(client).toHaveProperty('displayName');
      expect(client.id).toMatch(/^[a-f0-9-]{36}$/); // UUID pattern
      expect(typeof client.displayName).toBe('string');
      expect(client.displayName.length).toBeGreaterThan(0);
    });

    it('should accept overrides', () => {
      const customName = 'Custom Test Name';
      const client = makeOmniClient({ displayName: customName });

      expect(client.displayName).toBe(customName);
    });
  });

  describe('makeOmniClientWithNotes', () => {
    it('should generate client with notes metadata', () => {
      const client = makeOmniClientWithNotes();

      expect(client).toHaveProperty('notesCount');
      expect(client).toHaveProperty('lastNote');
      expect(client).toHaveProperty('interactions');
      expect(typeof client.notesCount).toBe('number');
      expect(client.notesCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero notes case', () => {
      const client = makeOmniClientWithNotes({ notesCount: 0 });

      expect(client.notesCount).toBe(0);
      expect(client.lastNote).toBeNull();
    });
  });

  describe('makeInteraction', () => {
    it('should generate a valid interaction', () => {
      const interaction = makeInteraction();

      expect(interaction).toHaveProperty('id');
      expect(interaction).toHaveProperty('userId');
      expect(interaction).toHaveProperty('type');
      expect(interaction).toHaveProperty('occurredAt');
      expect(interaction.id).toMatch(/^[a-f0-9-]{36}$/); // UUID pattern

      // Should be a valid ISO date string
      expect(() => new Date(interaction.occurredAt)).not.toThrow();
    });
  });

  describe('makeBatch', () => {
    it('should generate specified number of items', () => {
      const count = 5;
      const clients = makeBatch(() => makeOmniClient(), count);

      expect(clients).toHaveLength(count);
      expect(clients[0]).toHaveProperty('id');
      expect(clients[0]).toHaveProperty('displayName');
    });

    it('should generate different items', () => {
      const clients = makeBatch(() => makeOmniClient(), 3);

      // Each client should have a different ID
      const ids = clients.map(c => c.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(3);
    });
  });

  describe('makeContactWithRelations', () => {
    it('should generate contact with related data', () => {
      const { contact, notes, interactions } = makeContactWithRelations({
        noteCount: 3,
        interactionCount: 5
      });

      expect(contact).toHaveProperty('id');
      expect(notes).toHaveLength(3);
      expect(interactions).toHaveLength(5);

      // All notes should belong to the contact
      notes.forEach(note => {
        expect(note.contactId).toBe(contact.id);
      });

      // All interactions should belong to the contact
      interactions.forEach(interaction => {
        expect(interaction.contactId).toBe(contact.id);
      });
    });
  });

  describe('testUtils', () => {
    it('should provide default values', () => {
      expect(testUtils.defaultUserId).toBeDefined();
      expect(testUtils.defaultContactId).toBeDefined();
      expect(typeof testUtils.defaultUserId).toBe('string');
      expect(typeof testUtils.defaultContactId).toBe('string');
    });

    it('should create test user', () => {
      const user = testUtils.createTestUser();

      expect(user).toHaveProperty('userId');
      expect(user).toHaveProperty('email');
      expect(user.email).toContain('@');
    });

    it('should create pagination params', () => {
      const params = testUtils.createPaginationParams();

      expect(params).toHaveProperty('page');
      expect(params).toHaveProperty('pageSize');
      expect(params).toHaveProperty('sort');
      expect(params).toHaveProperty('order');
      expect(typeof params.page).toBe('number');
      expect(typeof params.pageSize).toBe('number');
    });

    it('should provide date ranges', () => {
      expect(testUtils.dateRanges).toHaveProperty('lastWeek');
      expect(testUtils.dateRanges).toHaveProperty('lastMonth');
      expect(testUtils.dateRanges).toHaveProperty('thisYear');

      const lastWeek = testUtils.dateRanges.lastWeek;
      expect(lastWeek.from).toBeInstanceOf(Date);
      expect(lastWeek.to).toBeInstanceOf(Date);
      expect(lastWeek.from.getTime()).toBeLessThan(lastWeek.to.getTime());
    });
  });
});