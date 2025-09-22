import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';
import * as contactsService from '@/server/services/contacts.service';
import * as omniClientsAdapters from '@/server/adapters/omniClients';
import * as authUser from '@/server/auth/user';
import {
  setupRepoMocks,
  resetRepoMocks,
  configureCommonScenarios,
  makeOmniClientWithNotes,
  makeOmniClient,
  makeCreateOmniClientInput,
  testUtils,
  type AllRepoFakes
} from '@packages/testing';

// Mock service layer (keeping existing pattern since this is API route test)
vi.mock('@/server/services/contacts.service');
vi.mock('@/server/adapters/omniClients');
vi.mock('@/server/auth/user');

describe('/api/omni-clients API Routes', () => {
  let fakes: AllRepoFakes;
  let scenarios: ReturnType<typeof configureCommonScenarios>;
  const mockUserId = testUtils.defaultUserId;

  beforeEach(() => {
    vi.clearAllMocks();
    fakes = setupRepoMocks();
    scenarios = configureCommonScenarios(fakes);
    resetRepoMocks(fakes);

    // Mock authentication
    vi.mocked(authUser.getServerUserId).mockResolvedValue(mockUserId);
  });

  describe('GET /api/omni-clients', () => {
    it('should return list of omni clients with default parameters', async () => {
      // Use factory to create test data
      const contactListItem = {
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
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        notesCount: 2,
        lastNote: 'Recent interaction',
      };

      const mockContactsResult = {
        items: [contactListItem],
        total: 1,
      };

      const mockOmniClient = makeOmniClientWithNotes({
        id: 'contact-1',
        displayName: 'John Doe',
        primaryEmail: 'john@example.com',
        primaryPhone: '+1234567890',
        stage: 'New Client',
        notesCount: 2,
        lastNote: 'Recent interaction',
      });

      const mockOmniClients = [mockOmniClient];

      vi.mocked(contactsService.listContactsService).mockResolvedValue(mockContactsResult);
      vi.mocked(omniClientsAdapters.toOmniClientsWithNotes).mockReturnValue(mockOmniClients);

      // Create NextRequest object
      const request = new Request('http://localhost:3000/api/omni-clients?page=1&pageSize=50&sort=displayName&order=asc');

      const response = await GET(request as any);

      expect(contactsService.listContactsService).toHaveBeenCalledWith(mockUserId, {
        sort: 'displayName',
        order: 'asc',
        page: 1,
        pageSize: 50,
      });
      expect(omniClientsAdapters.toOmniClientsWithNotes).toHaveBeenCalledWith(mockContactsResult.items);
      expect(response).toBeDefined();

      // Verify response structure
      const json = await response.json();
      expect(json).toEqual({
        items: mockOmniClients,
        total: 1,
        nextCursor: null,
      });
    });

    it('should handle search parameter', async () => {
      const mockContactsResult = { items: [], total: 0 };
      const mockOmniClients: ReturnType<typeof makeOmniClientWithNotes>[] = [];

      vi.mocked(contactsService.listContactsService).mockResolvedValue(mockContactsResult);
      vi.mocked(omniClientsAdapters.toOmniClientsWithNotes).mockReturnValue(mockOmniClients);

      // Create NextRequest object with search parameter
      const request = new Request('http://localhost:3000/api/omni-clients?search=john&page=1&pageSize=25&sort=displayName&order=asc');

      await GET(request as any);

      expect(contactsService.listContactsService).toHaveBeenCalledWith(mockUserId, {
        sort: 'displayName',
        order: 'asc',
        page: 1,
        pageSize: 25,
        search: 'john',
      });
    });

    it('should handle service errors gracefully', async () => {
      vi.mocked(contactsService.listContactsService).mockRejectedValue(new Error('Database error'));

      // Create NextRequest object
      const request = new Request('http://localhost:3000/api/omni-clients?page=1&pageSize=50');

      const response = await GET(request as any);

      expect(response).toBeDefined();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({
        error: 'Failed to fetch omni clients',
        details: 'Database error'
      });
    });
  });

  describe('POST /api/omni-clients', () => {
    it('should create a new omni client', async () => {
      // Use factories for test data
      const mockContactInput = makeCreateOmniClientInput({
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '+1987654321',
        source: 'manual',
      });

      const mockCreatedContact = {
        id: 'contact-2',
        userId: mockUserId,
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '+1987654321',
        source: 'manual',
        slug: 'jane-smith',
        stage: null,
        tags: null,
        confidenceScore: null,
        createdAt: new Date('2024-01-02'),
        updatedAt: new Date('2024-01-02'),
        notesCount: 0,
        lastNote: null,
      };

      const mockOmniClient = makeOmniClient({
        id: 'contact-2',
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '+1987654321',
        source: 'manual',
        slug: 'jane-smith',
      });

      vi.mocked(omniClientsAdapters.fromOmniClientInput).mockReturnValue(mockContactInput);
      vi.mocked(contactsService.createContactService).mockResolvedValue(mockCreatedContact);
      vi.mocked(omniClientsAdapters.toOmniClient).mockReturnValue(mockOmniClient);

      // Create NextRequest object with JSON body
      const request = new Request('http://localhost:3000/api/omni-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Jane Smith',
          primaryEmail: 'jane@example.com',
          primaryPhone: '+1987654321',
        }),
      });

      const response = await POST(request as any);

      expect(omniClientsAdapters.fromOmniClientInput).toHaveBeenCalledWith({
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
        primaryPhone: '+1987654321',
      });
      expect(contactsService.createContactService).toHaveBeenCalledWith(mockUserId, mockContactInput);
      expect(omniClientsAdapters.toOmniClient).toHaveBeenCalledWith(mockCreatedContact);
      expect(response).toBeDefined();
      expect(response.status).toBe(201);

      const json = await response.json();
      expect(json).toEqual({ item: mockOmniClient });
    });

    it('should handle creation failure', async () => {
      const mockContactInput = makeCreateOmniClientInput({
        displayName: 'Failed Contact',
        source: 'manual',
      });

      vi.mocked(omniClientsAdapters.fromOmniClientInput).mockReturnValue(mockContactInput);
      vi.mocked(contactsService.createContactService).mockResolvedValue(null);

      // Create NextRequest object
      const request = new Request('http://localhost:3000/api/omni-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Failed Contact',
        }),
      });

      const response = await POST(request as any);

      expect(contactsService.createContactService).toHaveBeenCalledWith(mockUserId, mockContactInput);
      expect(response).toBeDefined();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({
        error: 'Failed to create client'
      });
    });

    it('should handle service errors during creation', async () => {
      const mockContactInput = makeCreateOmniClientInput({
        displayName: 'Error Contact',
        source: 'manual',
      });

      vi.mocked(omniClientsAdapters.fromOmniClientInput).mockReturnValue(mockContactInput);
      vi.mocked(contactsService.createContactService).mockRejectedValue(new Error('Database error'));

      // Create NextRequest object
      const request = new Request('http://localhost:3000/api/omni-clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: 'Error Contact',
        }),
      });

      const response = await POST(request as any);

      expect(response).toBeDefined();
      expect(response.status).toBe(500);

      const json = await response.json();
      expect(json).toEqual({
        error: 'Failed to create omni client',
        details: 'Database error'
      });
    });
  });
});
