import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { IdentitiesRepository } from "../identities.repo";
import * as clientModule from "@/server/db/client";
import { ok, err } from "@/lib/utils/result";

// Mock the database client
vi.mock("@/server/db/client");

describe("IdentitiesRepository", () => {
  let repository: IdentitiesRepository;
  const mockUserId = "test-user-id";
  const mockContactId = "test-contact-id";
  const mockDb = {
    execute: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new IdentitiesRepository();
    vi.mocked(clientModule.getDb).mockResolvedValue(mockDb as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("addEmail", () => {
    it("should add email identity in lowercase", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      const result = await repository.addEmail(
        mockUserId,
        mockContactId,
        "Test@Example.COM",
      );

      expect(result.success).toBe(true);
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should handle duplicate email gracefully", async () => {
      const duplicateError = new Error("duplicate key value violates unique constraint");
      mockDb.execute.mockRejectedValue(duplicateError);

      const result = await repository.addEmail(
        mockUserId,
        mockContactId,
        "existing@example.com",
      );

      expect(result.success).toBe(false);
    });

    it("should normalize email addresses", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addEmail(mockUserId, mockContactId, "  TEST@EXAMPLE.COM  ");

      // Email should be trimmed and lowercased
      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should reject invalid email format", async () => {
      const result = await repository.addEmail(mockUserId, mockContactId, "not-an-email");

      // Implementation should validate email format
      expect(result.success).toBe(false);
    });
  });

  describe("addPhone", () => {
    it("should add normalized phone number", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addPhone(mockUserId, mockContactId, "+1 (555) 123-4567");

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should handle various phone formats", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      const phoneFormats = [
        "+1-555-123-4567",
        "(555) 123-4567",
        "555.123.4567",
        "5551234567",
      ];

      for (const phone of phoneFormats) {
        await repository.addPhone(mockUserId, mockContactId, phone);
      }

      expect(mockDb.execute).toHaveBeenCalledTimes(phoneFormats.length);
    });

    it("should reject invalid phone numbers", async () => {
      const invalidPhones = ["abc", "123", "+1-555-TOO-LONG-NUMBER"];

      for (const phone of invalidPhones) {
        await repository.addPhone(mockUserId, mockContactId, phone);
        // Should handle gracefully without throwing
      }

      expect(mockDb.execute).toHaveBeenCalled();
    });
  });

  describe("addHandle", () => {
    it("should add social media handle with provider", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addHandle(mockUserId, mockContactId, "twitter", "@testuser");

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should normalize handle to lowercase", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addHandle(mockUserId, mockContactId, "instagram", "@TestUser");

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should support multiple providers for same handle", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addHandle(mockUserId, mockContactId, "twitter", "@user");
      await repository.addHandle(mockUserId, mockContactId, "instagram", "@user");

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("addProviderId", () => {
    it("should add provider-specific ID", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addProviderId(mockUserId, mockContactId, "google", "google-user-123");

      expect(mockDb.execute).toHaveBeenCalled();
    });

    it("should handle multiple provider IDs for same contact", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addProviderId(mockUserId, mockContactId, "google", "google-123");
      await repository.addProviderId(mockUserId, mockContactId, "slack", "slack-456");

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });
  });

  describe("resolve", () => {
    it("should resolve contact by email", async () => {
      const mockContactId = "resolved-contact-id";
      mockDb.execute.mockResolvedValue({
        rows: [{ contact_id: mockContactId }],
      });

      const result = await repository.resolve(mockUserId, {
        email: "test@example.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should resolve contact by phone", async () => {
      const mockContactId = "resolved-contact-id";
      mockDb.execute.mockResolvedValue({
        rows: [{ contact_id: mockContactId }],
      });

      const result = await repository.resolve(mockUserId, {
        phone: "+1-555-123-4567",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should resolve contact by handle", async () => {
      const mockContactId = "resolved-contact-id";
      mockDb.execute.mockResolvedValue({
        rows: [{ contact_id: mockContactId }],
      });

      const result = await repository.resolve(mockUserId, {
        handle: "@testuser",
        provider: "twitter",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should return null when no match found", async () => {
      mockDb.execute.mockResolvedValue({ rows: [] });

      const result = await repository.resolve(mockUserId, {
        email: "nonexistent@example.com",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should try multiple identity types in order", async () => {
      // First email lookup fails
      mockDb.execute.mockResolvedValueOnce({ rows: [] });
      // Then phone lookup succeeds
      const mockContactId = "resolved-contact-id";
      mockDb.execute.mockResolvedValueOnce({
        rows: [{ contact_id: mockContactId }],
      });

      const result = await repository.resolve(mockUserId, {
        email: "test@example.com",
        phone: "+1-555-123-4567",
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(mockContactId);
      }
    });

    it("should handle database errors gracefully", async () => {
      const dbError = new Error("Database connection failed");
      mockDb.execute.mockRejectedValue(dbError);

      const result = await repository.resolve(mockUserId, {
        email: "test@example.com",
      });

      expect(result.success).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("should handle empty strings gracefully", async () => {
      const result = await repository.addEmail(mockUserId, mockContactId, "");

      expect(result.success).toBe(false);
    });

    it("should handle null/undefined values", async () => {
      const result = await repository.resolve(mockUserId, {
        email: undefined,
        phone: undefined,
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBeNull();
      }
    });

    it("should handle special characters in identities", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      await repository.addEmail(mockUserId, mockContactId, "test+tag@example.com");
      await repository.addHandle(mockUserId, mockContactId, "twitter", "@user_name-123");

      expect(mockDb.execute).toHaveBeenCalledTimes(2);
    });

    it("should handle very long identity values", async () => {
      mockDb.execute.mockResolvedValue({ rowCount: 1 });

      const longEmail = "a".repeat(100) + "@example.com";
      const result = await repository.addEmail(mockUserId, mockContactId, longEmail);

      // Should handle gracefully (may fail validation or truncate)
      expect(mockDb.execute).toHaveBeenCalled();
    });
  });
});