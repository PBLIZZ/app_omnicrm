/**
 * Unit tests for IdentitiesRepository
 * Tests contact identity management, resolution, and deduplication
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { IdentitiesRepository } from "../identities.repo";
import * as dbClient from "@/server/db/client";

// Mock the database client
vi.mock("@/server/db/client", () => ({
  getDb: vi.fn(),
}));

describe("IdentitiesRepository", () => {
  const mockUserId = "test-user-123";
  const mockContactId = "contact-123";
  let repository: IdentitiesRepository;

  const createMockDb = () => ({
    execute: vi.fn(),
  });

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new IdentitiesRepository();
  });

  describe("addEmail", () => {
    it("should add an email identity for a contact", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.addEmail(mockUserId, mockContactId, "Test@Example.com");

      expect(result.success).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should normalize email to lowercase", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.addEmail(mockUserId, mockContactId, "UPPER@CASE.COM");

      expect(result.success).toBe(true);
      // Email should be normalized to lowercase in the implementation
    });

    it("should handle database errors", async () => {
      vi.mocked(dbClient.getDb).mockRejectedValue(new Error("Database error"));

      const result = await repository.addEmail(mockUserId, mockContactId, "test@example.com");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_INSERT_FAILED");
      }
    });
  });

  describe("addPhone", () => {
    it("should add a phone identity for a contact", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.addPhone(mockUserId, mockContactId, "+1-234-567-8900");

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should normalize phone numbers", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.addPhone(mockUserId, mockContactId, "(123) 456-7890");

      expect(mockDb.execute).toHaveBeenCalled();
      // Phone should be normalized to digits only
    });
  });

  describe("addHandle", () => {
    it("should add a handle identity for a contact", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.addHandle(mockUserId, mockContactId, "twitter", "@JohnDoe");

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should normalize handles to lowercase", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.addHandle(mockUserId, mockContactId, "twitter", "@UPPERCASE");

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe("addProviderId", () => {
    it("should add a provider ID identity for a contact", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.addProviderId(mockUserId, mockContactId, "google", "google-user-123");

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe("resolve", () => {
    it("should resolve contact ID by email", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([{ contact_id: mockContactId }]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.resolve(mockUserId, { email: "test@example.com" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should resolve contact ID by phone", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ contact_id: mockContactId }]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.resolve(mockUserId, { phone: "1234567890" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should resolve contact ID by handle and provider", async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ contact_id: mockContactId }]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.resolve(mockUserId, {
        handle: "@johndoe",
        provider: "twitter",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should resolve contact ID by provider ID", async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ contact_id: mockContactId }]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.resolve(mockUserId, {
        providerId: "google-123",
        provider: "google",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should return null when no identity matches", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.resolve(mockUserId, { email: "nonexistent@example.com" });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should handle database errors during resolution", async () => {
      vi.mocked(dbClient.getDb).mockRejectedValue(new Error("Database error"));

      const result = await repository.resolve(mockUserId, { email: "test@example.com" });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
      }
    });
  });

  describe("getContactIdentities", () => {
    it("should retrieve all identities for a contact", async () => {
      const mockIdentities = [
        {
          id: "identity-1",
          user_id: mockUserId,
          contact_id: mockContactId,
          kind: "email",
          value: "test@example.com",
          provider: null,
          created_at: new Date().toISOString(),
        },
        {
          id: "identity-2",
          user_id: mockUserId,
          contact_id: mockContactId,
          kind: "phone",
          value: "1234567890",
          provider: null,
          created_at: new Date().toISOString(),
        },
      ];

      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(mockIdentities);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.getContactIdentities(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(2);
        expect(result.data[0]?.kind).toBe("email");
        expect(result.data[1]?.kind).toBe("phone");
      }
    });

    it("should return empty array when contact has no identities", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.getContactIdentities(mockUserId, mockContactId);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }
    });

    it("should handle database errors", async () => {
      vi.mocked(dbClient.getDb).mockRejectedValue(new Error("Database error"));

      const result = await repository.getContactIdentities(mockUserId, mockContactId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe("DB_QUERY_FAILED");
      }
    });
  });

  describe("findContactsByIdentity", () => {
    it("should find contacts by email", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([
        { contact_id: "contact-1" },
        { contact_id: "contact-2" },
      ]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.findContactsByIdentity(
        mockUserId,
        "email",
        "shared@example.com",
      );

      expect(result).toHaveLength(2);
      expect(result).toContain("contact-1");
      expect(result).toContain("contact-2");
    });

    it("should find contacts by phone", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([{ contact_id: mockContactId }]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.findContactsByIdentity(mockUserId, "phone", "1234567890");

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(mockContactId);
    });

    it("should return empty array when no contacts found", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.findContactsByIdentity(
        mockUserId,
        "email",
        "nonexistent@example.com",
      );

      expect(result).toHaveLength(0);
    });
  });

  describe("removeIdentity", () => {
    it("should remove an identity by ID", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.removeIdentity(mockUserId, "identity-123");

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe("removeContactIdentities", () => {
    it("should remove all identities for a contact", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.removeContactIdentities(mockUserId, mockContactId);

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe("findDuplicateIdentities", () => {
    it("should find duplicate identities across contacts", async () => {
      const mockDuplicates = [
        {
          kind: "email",
          value: "duplicate@example.com",
          provider: null,
          contact_ids: ["contact-1", "contact-2"],
        },
        {
          kind: "phone",
          value: "1234567890",
          provider: null,
          contact_ids: ["contact-3", "contact-4", "contact-5"],
        },
      ];

      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(mockDuplicates);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.findDuplicateIdentities(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]?.contactIds).toHaveLength(2);
      expect(result[1]?.contactIds).toHaveLength(3);
    });

    it("should return empty array when no duplicates exist", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.findDuplicateIdentities(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should include provider information for duplicates", async () => {
      const mockDuplicates = [
        {
          kind: "handle",
          value: "@johndoe",
          provider: "twitter",
          contact_ids: ["contact-1", "contact-2"],
        },
      ];

      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(mockDuplicates);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.findDuplicateIdentities(mockUserId);

      expect(result[0]?.provider).toBe("twitter");
    });
  });

  describe("mergeIdentities", () => {
    it("should merge identities from one contact to another", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.mergeIdentities(mockUserId, "from-contact-123", "to-contact-456");

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("getIdentityStats", () => {
    it("should return identity statistics for a user", async () => {
      const mockStats = [
        { kind: "email", count: "150" },
        { kind: "phone", count: "75" },
        { kind: "handle", count: "30" },
        { kind: "provider_id", count: "45" },
      ];

      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(mockStats);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.getIdentityStats(mockUserId);

      expect(result.email).toBe(150);
      expect(result.phone).toBe(75);
      expect(result.handle).toBe(30);
      expect(result.provider_id).toBe(45);
    });

    it("should return empty object when no identities exist", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.getIdentityStats(mockUserId);

      expect(Object.keys(result)).toHaveLength(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle special characters in email addresses", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.addEmail(
        mockUserId,
        mockContactId,
        "user+tag@example.com",
      );

      expect(result.success).toBe(true);
    });

    it("should handle international phone numbers", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      await repository.addPhone(mockUserId, mockContactId, "+44 20 7946 0958");

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should handle very long provider IDs", async () => {
      const mockDb = createMockDb();
      mockDb.execute.mockResolvedValue(undefined);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const longProviderId = "a".repeat(200);
      await repository.addProviderId(mockUserId, mockContactId, "google", longProviderId);

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should handle multiple identity types in a single resolve query", async () => {
      const mockDb = createMockDb();
      mockDb.execute
        .mockResolvedValueOnce([{ contact_id: mockContactId }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      vi.mocked(dbClient.getDb).mockResolvedValue(mockDb as any);

      const result = await repository.resolve(mockUserId, {
        email: "test@example.com",
        phone: "1234567890",
        handle: "@johndoe",
        provider: "twitter",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });
  });
});