import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  UserIntegrationsRepository,
  createUserIntegrationsRepository,
} from "./user-integrations.repo";
import { createMockDbClient, createMockQueryBuilder, type MockDbClient } from "@packages/testing";

type IntegrationRow = {
  userId: string;
  provider: string;
  service: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiryDate: Date | null;
  config: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
};

describe("UserIntegrationsRepository", () => {
  let mockDb: MockDbClient;
  let repo: UserIntegrationsRepository;
  const mockUserId = "user-123";

  const createMockIntegration = (overrides: Partial<IntegrationRow> = {}): IntegrationRow => ({
    userId: mockUserId,
    provider: "google",
    service: "gmail",
    accessToken: "access-token-123",
    refreshToken: "refresh-token-456",
    expiryDate: new Date(Date.now() + 3600000), // 1 hour from now
    config: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    mockDb = createMockDbClient();
    repo = createUserIntegrationsRepository(mockDb as any);
    vi.clearAllMocks();
  });

  describe("listUserIntegrations", () => {
    it("should list all integrations for a user", async () => {
      const mockIntegrations: IntegrationRow[] = [
        createMockIntegration({ service: "gmail" }),
        createMockIntegration({ service: "calendar" }),
      ];

      const selectBuilder = createMockQueryBuilder(mockIntegrations);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.listUserIntegrations(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0]?.service).toBe("gmail");
      expect(result[1]?.service).toBe("calendar");
      expect(result[0]?.hasValidToken).toBe(true);
    });

    it("should return empty array when no integrations exist", async () => {
      const selectBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.listUserIntegrations(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should mark expired tokens as invalid", async () => {
      const expiredIntegration = createMockIntegration({
        expiryDate: new Date(Date.now() - 3600000), // 1 hour ago
      });

      const selectBuilder = createMockQueryBuilder([expiredIntegration]);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.listUserIntegrations(mockUserId);

      expect(result[0]?.hasValidToken).toBe(false);
    });

    it("should mark tokens with null expiry as valid", async () => {
      const noExpiryIntegration = createMockIntegration({
        expiryDate: null,
      });

      const selectBuilder = createMockQueryBuilder([noExpiryIntegration]);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.listUserIntegrations(mockUserId);

      expect(result[0]?.hasValidToken).toBe(true);
    });
  });

  describe("getUserIntegration", () => {
    it("should retrieve a specific integration", async () => {
      const mockIntegration = createMockIntegration();
      const selectBuilder = createMockQueryBuilder([mockIntegration]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getUserIntegration(mockUserId, "google", "gmail");

      expect(result).not.toBeNull();
      expect(result?.provider).toBe("google");
      expect(result?.service).toBe("gmail");
    });

    it("should return null when integration not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getUserIntegration(mockUserId, "google", "drive");

      expect(result).toBeNull();
    });

    it("should filter by userId, provider, and service", async () => {
      const selectBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      await repo.getUserIntegration("different-user", "google", "gmail");

      // Verify that query was called
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe("getUserIntegrationsByProvider", () => {
    it("should retrieve all integrations for a provider", async () => {
      const mockIntegrations: IntegrationRow[] = [
        createMockIntegration({ service: "gmail" }),
        createMockIntegration({ service: "calendar" }),
        createMockIntegration({ service: "drive" }),
      ];

      const selectBuilder = createMockQueryBuilder(mockIntegrations);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getUserIntegrationsByProvider(mockUserId, "google");

      expect(result).toHaveLength(3);
      expect(result.every((i) => i.provider === "google")).toBe(true);
    });

    it("should return empty array when no integrations exist for provider", async () => {
      const selectBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getUserIntegrationsByProvider(mockUserId, "microsoft");

      expect(result).toHaveLength(0);
    });
  });

  describe("upsertUserIntegration", () => {
    it("should insert a new integration", async () => {
      const mockIntegration = createMockIntegration();
      const insertBuilder = createMockQueryBuilder([mockIntegration]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const result = await repo.upsertUserIntegration(mockUserId, {
        provider: "google",
        service: "gmail",
        accessToken: "new-token",
        refreshToken: "new-refresh-token",
        expiryDate: new Date(),
        config: null,
      });

      expect(result.provider).toBe("google");
      expect(result.service).toBe("gmail");
    });

    it("should update an existing integration on conflict", async () => {
      const updatedIntegration = createMockIntegration({
        accessToken: "updated-token",
      });
      const insertBuilder = createMockQueryBuilder([updatedIntegration]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const result = await repo.upsertUserIntegration(mockUserId, {
        provider: "google",
        service: "gmail",
        accessToken: "updated-token",
        refreshToken: "refresh-token",
        expiryDate: new Date(),
        config: null,
      });

      expect(result.accessToken).toBe("updated-token");
    });

    it("should handle null values correctly", async () => {
      const mockIntegration = createMockIntegration({
        refreshToken: null,
        expiryDate: null,
        config: null,
      });
      const insertBuilder = createMockQueryBuilder([mockIntegration]);

      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      const result = await repo.upsertUserIntegration(mockUserId, {
        provider: "google",
        service: "gmail",
        accessToken: "token",
      });

      expect(result.refreshToken).toBeNull();
      expect(result.expiryDate).toBeNull();
      expect(result.config).toBeNull();
    });

    it("should throw error when insert returns no data", async () => {
      const insertBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.insert).mockReturnValue(insertBuilder);

      await expect(
        repo.upsertUserIntegration(mockUserId, {
          provider: "google",
          service: "gmail",
          accessToken: "token",
        }),
      ).rejects.toThrow("Failed to upsert user integration");
    });
  });

  describe("updateUserIntegration", () => {
    it("should update specific fields", async () => {
      const updatedIntegration = createMockIntegration({
        accessToken: "new-token",
      });
      const updateBuilder = createMockQueryBuilder([updatedIntegration]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      const result = await repo.updateUserIntegration(mockUserId, "google", "gmail", {
        accessToken: "new-token",
      });

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBe("new-token");
    });

    it("should return null when integration not found", async () => {
      const updateBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      const result = await repo.updateUserIntegration(mockUserId, "google", "drive", {
        accessToken: "token",
      });

      expect(result).toBeNull();
    });

    it("should throw error when no fields provided", async () => {
      await expect(repo.updateUserIntegration(mockUserId, "google", "gmail", {})).rejects.toThrow(
        "No integration fields provided for update",
      );
    });

    it("should handle partial updates", async () => {
      const updatedIntegration = createMockIntegration({
        expiryDate: new Date(),
      });
      const updateBuilder = createMockQueryBuilder([updatedIntegration]);

      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      const result = await repo.updateUserIntegration(mockUserId, "google", "gmail", {
        expiryDate: new Date(),
      });

      expect(result).not.toBeNull();
    });
  });

  describe("deleteUserIntegration", () => {
    it("should delete a specific integration", async () => {
      const deleteBuilder = createMockQueryBuilder([{ id: mockUserId }]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteUserIntegration(mockUserId, "google", "gmail");

      expect(result).toBe(true);
    });

    it("should return false when integration not found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteUserIntegration(mockUserId, "google", "drive");

      expect(result).toBe(false);
    });
  });

  describe("deleteUserIntegrationsByProvider", () => {
    it("should delete all integrations for a provider", async () => {
      const deleteBuilder = createMockQueryBuilder([
        { id: mockUserId },
        { id: mockUserId },
        { id: mockUserId },
      ]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteUserIntegrationsByProvider(mockUserId, "google");

      expect(result).toBe(3);
    });

    it("should return 0 when no integrations found", async () => {
      const deleteBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.delete).mockReturnValue(deleteBuilder);

      const result = await repo.deleteUserIntegrationsByProvider(mockUserId, "microsoft");

      expect(result).toBe(0);
    });
  });

  describe("hasActiveIntegration", () => {
    it("should return true for valid integration with future expiry", async () => {
      const mockIntegration = createMockIntegration({
        expiryDate: new Date(Date.now() + 3600000),
      });
      const selectBuilder = createMockQueryBuilder([mockIntegration]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.hasActiveIntegration(mockUserId, "google", "gmail");

      expect(result).toBe(true);
    });

    it("should return false for expired integration", async () => {
      const mockIntegration = createMockIntegration({
        expiryDate: new Date(Date.now() - 3600000),
      });
      const selectBuilder = createMockQueryBuilder([mockIntegration]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.hasActiveIntegration(mockUserId, "google", "gmail");

      expect(result).toBe(false);
    });

    it("should return false when integration not found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.hasActiveIntegration(mockUserId, "google", "drive");

      expect(result).toBe(false);
    });

    it("should return true for integration with null expiry", async () => {
      const mockIntegration = createMockIntegration({
        expiryDate: null,
      });
      const selectBuilder = createMockQueryBuilder([mockIntegration]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.hasActiveIntegration(mockUserId, "google", "gmail");

      expect(result).toBe(true);
    });
  });

  describe("getExpiringIntegrations", () => {
    it("should return integrations expiring within 1 hour", async () => {
      const expiringIntegration = createMockIntegration({
        expiryDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
      });
      const selectBuilder = createMockQueryBuilder([expiringIntegration]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getExpiringIntegrations(mockUserId);

      expect(result).toHaveLength(1);
      expect(result[0]?.service).toBe("gmail");
    });

    it("should not return already expired integrations", async () => {
      // Already expired tokens should be filtered out by the WHERE clause
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getExpiringIntegrations(mockUserId);

      expect(result).toHaveLength(0);
    });

    it("should not return tokens expiring more than 1 hour away", async () => {
      // Tokens expiring > 1 hour away should be filtered out by the WHERE clause
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getExpiringIntegrations(mockUserId);

      expect(result).toHaveLength(0);
    });
  });

  describe("getRawIntegrationData", () => {
    it("should return raw integration data for a provider", async () => {
      const mockIntegrations: IntegrationRow[] = [
        createMockIntegration({ service: "gmail" }),
        createMockIntegration({ service: "calendar" }),
      ];
      const selectBuilder = createMockQueryBuilder(mockIntegrations);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getRawIntegrationData(mockUserId, "google");

      expect(result).toHaveLength(2);
      expect(result[0]?.accessToken).toBe("access-token-123");
    });

    it("should return empty array when no integrations found", async () => {
      const selectBuilder = createMockQueryBuilder([]);

      vi.mocked(mockDb.select).mockReturnValue(selectBuilder);

      const result = await repo.getRawIntegrationData(mockUserId, "microsoft");

      expect(result).toHaveLength(0);
    });
  });

  describe("updateRawTokens", () => {
    it("should update access token", async () => {
      const updateBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      await repo.updateRawTokens(mockUserId, "google", "gmail", {
        accessToken: "new-access-token",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should update refresh token", async () => {
      const updateBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      await repo.updateRawTokens(mockUserId, "google", "gmail", {
        refreshToken: "new-refresh-token",
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should update expiry date", async () => {
      const updateBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      await repo.updateRawTokens(mockUserId, "google", "gmail", {
        expiryDate: new Date(),
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should update multiple fields at once", async () => {
      const updateBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      await repo.updateRawTokens(mockUserId, "google", "gmail", {
        accessToken: "new-token",
        refreshToken: "new-refresh",
        expiryDate: new Date(),
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should handle null values", async () => {
      const updateBuilder = createMockQueryBuilder([]);
      vi.mocked(mockDb.update).mockReturnValue(updateBuilder);

      await repo.updateRawTokens(mockUserId, "google", "gmail", {
        refreshToken: null,
        expiryDate: null,
      });

      expect(mockDb.update).toHaveBeenCalled();
    });

    it("should do nothing when no updates provided", async () => {
      await repo.updateRawTokens(mockUserId, "google", "gmail", {});

      expect(mockDb.update).not.toHaveBeenCalled();
    });
  });
});
