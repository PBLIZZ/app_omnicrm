import { describe, it, expect } from 'vitest';
import {
  makeContactDTO,
  makeInteraction,
  makeNoteDTO,
  makeBatch,
  makeContactWithRelations,
  testUtils
} from '../index';

describe('Testing Package Factories', () => {
  describe('makeContactDTO', () => {
    it('should generate a valid contact', () => {
      const contact = makeContactDTO();

      expect(contact).toHaveProperty('id');
      expect(contact).toHaveProperty('userId');
      expect(contact).toHaveProperty('displayName');
      expect(contact.id).toMatch(/^[a-f0-9-]{36}$/); // UUID pattern
      expect(typeof contact.displayName).toBe('string');
      expect(contact.displayName.length).toBeGreaterThan(0);
    });

    it('should accept overrides', () => {
      const customName = 'Custom Test Name';
      const contact = makeContactDTO({ displayName: customName });

      expect(contact.displayName).toBe(customName);
    });
  });

  describe('makeNoteDTO', () => {
    it('should generate a valid note', () => {
      const note = makeNoteDTO();

      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('contactId');
      expect(note).toHaveProperty('userId');
      expect(note).toHaveProperty('content');
      expect(note.id).toMatch(/^[a-f0-9-]{36}$/); // UUID pattern
      expect(typeof note.content).toBe('string');
      expect(note.content.length).toBeGreaterThan(0);
    });

    it('should accept overrides', () => {
      const customContactId = 'custom-contact-id';
      const note = makeNoteDTO({ contactId: customContactId });

      expect(note.contactId).toBe(customContactId);
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
      const contacts = makeBatch(() => makeContactDTO(), count);

      expect(contacts).toHaveLength(count);
      expect(contacts[0]).toHaveProperty('id');
      expect(contacts[0]).toHaveProperty('displayName');
    });

    it('should generate different items', () => {
      const contacts = makeBatch(() => makeContactDTO(), 3);

      // Each contact should have a different ID
      const ids = contacts.map(c => c.id);
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