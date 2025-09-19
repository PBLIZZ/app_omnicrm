import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchContacts, createContact, updateContact, deleteContacts, fetchContact } from '../contacts.service';
import type { FetchContactsParams, CreateContactInput, UpdateContactInput } from '@/lib/validation/schemas/omniClients';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock document.cookie for CSRF token
Object.defineProperty(document, 'cookie', {
  writable: true,
  value: 'csrf=test-csrf-token',
});

describe('Client Contacts Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.location.origin
    Object.defineProperty(window, 'location', {
      value: { origin: 'https://test.example.com' },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchContacts', () => {
    it('should fetch contacts with default parameters', async () => {
      const mockResponse = {
        ok: true,
        data: {
          items: [
            {
              id: 'contact-1',
              displayName: 'John Doe',
              primaryEmail: 'john@example.com',
              createdAt: '2024-01-01T00:00:00Z',
            },
          ],
          total: 1,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchContacts();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://test.example.com/api/omni-clients',
        {
          credentials: 'same-origin',
          headers: { 'x-csrf-token': 'test-csrf-token' },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should build URL with search parameters', async () => {
      const mockResponse = {
        ok: true,
        data: { items: [], total: 0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const params: FetchContactsParams = {
        search: 'john',
        sort: 'displayName',
        order: 'desc',
        page: 2,
        pageSize: 25,
        createdAtFilter: { from: '2024-01-01', to: '2024-12-31' },
      };

      await fetchContacts(params);

      const expectedUrl = 'https://test.example.com/api/omni-clients?search=john&sort=displayName&order=desc&page=2&pageSize=25&createdAtFilter=%7B%22from%22%3A%222024-01-01%22%2C%22to%22%3A%222024-12-31%22%7D';
      expect(mockFetch).toHaveBeenCalledWith(expectedUrl, expect.any(Object));
    });

    it('should handle rate limiting error', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        text: () => Promise.resolve('Rate limited'),
        statusText: 'Too Many Requests',
      });

      await expect(fetchContacts()).rejects.toThrow('{"error":"rate_limited"}');
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve('Internal Server Error'),
        statusText: 'Internal Server Error',
      });

      await expect(fetchContacts()).rejects.toThrow('Internal Server Error');
    });

    it('should handle malformed JSON response', async () => {
      const mockResponse = {
        ok: false,
        error: 'Invalid request',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await expect(fetchContacts()).rejects.toThrow('Invalid request');
    });
  });

  describe('createContact', () => {
    it('should create contact with valid input', async () => {
      const mockResponse = {
        ok: true,
        data: {
          id: 'contact-1',
          displayName: 'Jane Smith',
          primaryEmail: 'jane@example.com',
          source: 'manual',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const input: CreateContactInput = {
        displayName: 'Jane Smith',
        primaryEmail: 'jane@example.com',
      };

      const result = await createContact(input);

      expect(mockFetch).toHaveBeenCalledWith('/api/omni-clients', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'test-csrf-token',
        },
        body: JSON.stringify({ ...input, source: 'manual' }),
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('updateContact', () => {
    it('should update contact with valid input', async () => {
      const mockResponse = {
        ok: true,
        data: {
          id: 'contact-1',
          displayName: 'John Updated',
          primaryEmail: 'john.updated@example.com',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const input: UpdateContactInput = {
        displayName: 'John Updated',
        primaryEmail: 'john.updated@example.com',
      };

      const result = await updateContact('contact-1', input);

      expect(mockFetch).toHaveBeenCalledWith('/api/omni-clients/contact-1', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'test-csrf-token',
        },
        body: JSON.stringify(input),
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('deleteContacts', () => {
    it('should delete multiple contacts', async () => {
      const mockResponse = {
        ok: true,
        data: { deleted: 2 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const ids = ['contact-1', 'contact-2'];
      const result = await deleteContacts(ids);

      expect(mockFetch).toHaveBeenCalledWith('/api/omni-clients/bulk-delete', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': 'test-csrf-token',
        },
        body: JSON.stringify({ ids }),
      });
      expect(result).toBe(2);
    });
  });

  describe('fetchContact', () => {
    it('should fetch single contact by ID', async () => {
      const mockResponse = {
        ok: true,
        data: {
          id: 'contact-1',
          displayName: 'John Doe',
          primaryEmail: 'john@example.com',
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      const result = await fetchContact('contact-1');

      expect(mockFetch).toHaveBeenCalledWith('/api/omni-clients/contact-1', {
        credentials: 'same-origin',
        headers: { 'x-csrf-token': 'test-csrf-token' },
      });
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('CSRF token handling', () => {
    it('should handle missing CSRF token', async () => {
      // Mock empty cookie
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: '',
      });

      const mockResponse = {
        ok: true,
        data: { items: [], total: 0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await fetchContacts();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'x-csrf-token': '' },
        })
      );
    });

    it('should extract CSRF token from cookie', async () => {
      Object.defineProperty(document, 'cookie', {
        writable: true,
        value: 'other=value; csrf=my-csrf-token; another=value',
      });

      const mockResponse = {
        ok: true,
        data: { items: [], total: 0 },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      });

      await fetchContacts();

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: { 'x-csrf-token': 'my-csrf-token' },
        })
      );
    });
  });
});
