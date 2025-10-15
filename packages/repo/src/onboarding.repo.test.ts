import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  OnboardingRepository,
  createOnboardingRepository,
} from "./onboarding.repo";
import {
  createMockDbClient,
  createMockQueryBuilder,
  type MockDbClient,
} from "@packages/testing";
import type { OnboardingToken } from "./onboarding.repo";

describe("OnboardingRepository", () => {
  let mockDb: MockDbClient;
  let repo: OnboardingRepository;
  const mockUserId = "user-123";
  const mockTokenId = "token-456";

  const createMockToken = (overrides: Partial<OnboardingToken> = {}): OnboardingToken => ({
    id: mockTokenId,
    userId: mockUserId,
    token: "abc-123-def",
    expiresAt: new Date(Date.now() + 86400000), // Tomorrow
    maxUses: 1,
    usedCount: 0,
    label: "Test Token",
    disabled: false,
    createdBy: mockUserId,
    createdAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createOnboardingRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("createToken", () => {
    it("should create a new onboarding token", async () => {
      const mockToken = createMockToken();
      const insertBuilder = createMockQueryBuilder([mockToken]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const expiresAt = new Date(Date.now() + 86400000);
      const result = await repo.createToken(mockUserId, expiresAt, "Test Label", 1);

      expect(result).not.toBeNull();
      expect(result.id).toBe(mockTokenId);
      expect(result.userId).toBe(mockUserId);
    });

    it("should throw error when insert fails", async () => {
      const insertBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder as any);

      const expiresAt = new Date(Date.now() + 86400000);

      await expect(repo.createToken(mockUserId, expiresAt)).rejects.toThrow(
        "Failed to create token"
      );
    });
  });

  describe("listTokens", () => {
    it("should list tokens for a user", async () => {
      const mockTokens = [
        createMockToken(),
        createMockToken({ id: "token-2", label: "Another Token" }),
      ];
      const selectBuilder = createMockQueryBuilder(mockTokens);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listTokens(mockUserId, 10, 0);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(mockTokenId);
    });

    it("should handle pagination", async () => {
      const mockTokens = [createMockToken()];
      const selectBuilder = createMockQueryBuilder(mockTokens);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.listTokens(mockUserId, 5, 5);

      expect(result).toHaveLength(1);
    });
  });

  describe("getTokenById", () => {
    it("should retrieve token by id", async () => {
      const mockToken = createMockToken();
      const selectBuilder = createMockQueryBuilder([mockToken]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getTokenById(mockUserId, mockTokenId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(mockTokenId);
    });

    it("should return null when token not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.getTokenById(mockUserId, "non-existent");

      expect(result).toBeNull();
    });
  });

  describe("deleteToken", () => {
    it("should delete token successfully", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockTokenId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteToken(mockUserId, mockTokenId);

      expect(result).toBe(true);
    });

    it("should return false when token not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder as any);

      const result = await repo.deleteToken(mockUserId, "non-existent");

      expect(result).toBe(false);
    });
  });

  describe("validateToken", () => {
    it("should validate active token", async () => {
      const mockToken = createMockToken({
        expiresAt: new Date(Date.now() + 86400000),
        usedCount: 0,
        maxUses: 1,
        disabled: false,
      });
      const selectBuilder = createMockQueryBuilder([mockToken]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.validateToken("abc-123-def");

      expect(result.isValid).toBe(true);
      expect(result.token).toBeDefined();
    });

    it("should reject non-existent token", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.validateToken("non-existent");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Token not found");
    });

    it("should reject disabled token", async () => {
      const mockToken = createMockToken({ disabled: true });
      const selectBuilder = createMockQueryBuilder([mockToken]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.validateToken("abc-123-def");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Token is disabled");
    });

    it("should reject expired token", async () => {
      const mockToken = createMockToken({
        expiresAt: new Date(Date.now() - 86400000), // Yesterday
      });
      const selectBuilder = createMockQueryBuilder([mockToken]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.validateToken("abc-123-def");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Token has expired");
    });

    it("should reject token exceeding max uses", async () => {
      const mockToken = createMockToken({ usedCount: 5, maxUses: 5 });
      const selectBuilder = createMockQueryBuilder([mockToken]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const result = await repo.validateToken("abc-123-def");

      expect(result.isValid).toBe(false);
      expect(result.error).toBe("Token usage limit exceeded");
    });
  });

  describe("createContactWithConsent", () => {
    it("should create contact with valid token", async () => {
      // Mock valid token
      const mockToken = createMockToken();
      const tokenSelectBuilder = createMockQueryBuilder([mockToken]);
      vi.mocked(mockDb.select).mockReturnValue(tokenSelectBuilder as any);

      // Mock transaction
      const contactId = "new-contact-123";
      vi.mocked(mockDb.transaction).mockResolvedValue(contactId);

      const clientData = {
        display_name: "John Doe",
        primary_email: "john@example.com",
      };

      const consentData = {
        consent_type: "data_processing" as const,
        consent_text_version: "1.0",
        granted: true,
        ip_address: "127.0.0.1",
        user_agent: "test",
      };

      const result = await repo.createContactWithConsent(
        mockUserId,
        "abc-123-def",
        clientData,
        consentData
      );

      expect(result).toBe(contactId);
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should reject invalid token", async () => {
      const selectBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder as any);

      const clientData = {
        display_name: "John Doe",
        primary_email: "john@example.com",
      };

      const consentData = {
        consent_type: "data_processing" as const,
        consent_text_version: "1.0",
        granted: true,
        ip_address: "127.0.0.1",
        user_agent: "test",
      };

      await expect(
        repo.createContactWithConsent(mockUserId, "invalid-token", clientData, consentData)
      ).rejects.toThrow("Token not found");
    });
  });
});
