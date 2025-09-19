import { describe, it, expect, vi, beforeEach } from 'vitest';
import { listContactsService, createContactService, type CreateContactInput } from '../contacts.service';
import * as omniClientsRepo from '@/server/repositories/omni-clients.repo';

// Mock the repository
vi.mock('@/server/repositories/omni-clients.repo', () => ({
  listContacts: vi.fn(),
  createContact: vi.fn(),
}));

describe('ContactsService', () => {
  const mockUserId = 'user-123';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listContactsService', () => {
    it('should call listContacts with correct parameters', async () => {
      const mockResult = {
        items: [
          {
            id: 'contact-1',
            userId: mockUserId,
            displayName: 'John Doe',
            primaryEmail: 'john@example.com',
            primaryPhone: '+1234567890',
            source: 'manual',
            slug: 'john-doe',
            stage: 'New Client',
            tags: null,
            confidenceScore: '0.8',
            createdAt: new Date(),
            updatedAt: new Date(),
            notesCount: 2,
            lastNote: 'Last interaction note',
          },
        ],
        total: 1,
      };

      vi.mocked(omniClientsRepo.listContacts).mockResolvedValue(mockResult);

      const params = {
        search: 'john',
        sort: 'displayName' as const,
        order: 'asc' as const,
        page: 1,
        pageSize: 10,
      };

      const result = await listContactsService(mockUserId, params);

      expect(omniClientsRepo.listContacts).toHaveBeenCalledWith(mockUserId, params);
      expect(result).toEqual(mockResult);
    });

    it('should handle empty search results', async () => {
      const mockResult = { items: [], total: 0 };
      vi.mocked(omniClientsRepo.listContacts).mockResolvedValue(mockResult);

      const params = {
        search: 'nonexistent',
        sort: 'displayName' as const,
        order: 'asc' as const,
        page: 1,
        pageSize: 10,
      };

      const result = await listContactsService(mockUserId, params);

      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('createContactService', () => {
    it('should create contact with valid input', async () => {
      const mockContact = {
        id: 'contact-1',
        userId: mockUserId,
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '+1987654321',
        source: 'manual',
        slug: 'jane-smith',
        stage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        notesCount: 0,
        lastNote: null,
      };

      vi.mocked(omniClientsRepo.createContact).mockResolvedValue(mockContact);

      const input: CreateContactInput = {
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '+1987654321',
        source: 'manual',
      };

      const result = await createContactService(mockUserId, input);

      expect(omniClientsRepo.createContact).toHaveBeenCalledWith(mockUserId, {
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '+1987654321',
        source: 'manual',
      });
      expect(result).toEqual(mockContact);
    });

    it('should handle empty string values by converting to null', async () => {
      const mockContact = {
        id: 'contact-1',
        userId: mockUserId,
        displayName: 'John Empty',
        primaryEmail: null,
        primaryPhone: null,
        source: 'manual',
        slug: 'john-empty',
        stage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        notesCount: 0,
        lastNote: null,
      };

      vi.mocked(omniClientsRepo.createContact).mockResolvedValue(mockContact);

      const input: CreateContactInput = {
        displayName: 'John Empty',
        primaryEmail: '   ', // Empty string with spaces
        primaryPhone: '', // Empty string
        source: 'gmail_import',
      };

      const result = await createContactService(mockUserId, input);

      expect(omniClientsRepo.createContact).toHaveBeenCalledWith(mockUserId, {
        displayName: 'John Empty',
        primaryEmail: null,
        primaryPhone: null,
        source: 'gmail_import',
      });
      expect(result).toEqual(mockContact);
    });

    it('should return null when repository returns null', async () => {
      vi.mocked(omniClientsRepo.createContact).mockResolvedValue(null);

      const input: CreateContactInput = {
        displayName: 'Failed Contact',
        source: 'manual',
      };

      const result = await createContactService(mockUserId, input);

      expect(result).toBeNull();
    });

    it('should handle undefined values correctly', async () => {
      const mockContact = {
        id: 'contact-1',
        userId: mockUserId,
        displayName: 'Minimal Contact',
        primaryEmail: null,
        primaryPhone: null,
        source: 'upload',
        slug: 'minimal-contact',
        stage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        notesCount: 0,
        lastNote: null,
      };

      vi.mocked(omniClientsRepo.createContact).mockResolvedValue(mockContact);

      const input: CreateContactInput = {
        displayName: 'Minimal Contact',
        primaryEmail: undefined,
        primaryPhone: undefined,
        source: 'upload',
      };

      const result = await createContactService(mockUserId, input);

      expect(omniClientsRepo.createContact).toHaveBeenCalledWith(mockUserId, {
        displayName: 'Minimal Contact',
        primaryEmail: null,
        primaryPhone: null,
        source: 'upload',
      });
      expect(result).toEqual(mockContact);
    });
  });
});
