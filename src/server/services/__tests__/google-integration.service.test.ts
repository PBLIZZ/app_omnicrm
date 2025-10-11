import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  upsertIntegrationService,
  getStatusService,
  type IntegrationTokens,
} from "../google-integration.service";
import { createUserIntegrationsRepository } from "@repo";
import * as dbClient from "@/server/db/client";
import * as googleClient from "@/server/google/client";

vi.mock("@repo");
vi.mock("@/server/db/client");
vi.mock("@/server/google/client");

describe("GoogleIntegrationService", () => {
  const mockUserId = "test-user-123";
  let mockRepo: any;
  let mockDb: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRepo = {
      upsertUserIntegration: vi.fn(),
      getUserIntegrationsByProvider: vi.fn(),
    };

    mockDb = { execute: vi.fn() };

    vi.mocked(dbClient.getDb).mockResolvedValue(mockDb);
    vi.mocked(createUserIntegrationsRepository).mockReturnValue(mockRepo);
  });

  describe("upsertIntegrationService", () => {
    it("should upsert Gmail integration with tokens", async () => {
      const tokens: IntegrationTokens = {
        accessToken: "access-token-123",
        refreshToken: "refresh-token-456",
        expiryDate: new Date("2024-12-31"),
        config: { scope: "gmail.readonly" },
      };

      mockRepo.upsertUserIntegration.mockResolvedValue(undefined);

      await upsertIntegrationService(mockUserId, "gmail", tokens);

      expect(mockRepo.upsertUserIntegration).toHaveBeenCalledWith(mockUserId, {
        provider: "google",
        service: "gmail",
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiryDate: tokens.expiryDate,
        config: tokens.config,
      });
    });

    it("should upsert Calendar integration with tokens", async () => {
      const tokens: IntegrationTokens = {
        accessToken: "cal-access-token",
        refreshToken: null,
        expiryDate: new Date("2024-06-30"),
        config: null,
      };

      mockRepo.upsertUserIntegration.mockResolvedValue(undefined);

      await upsertIntegrationService(mockUserId, "calendar", tokens);

      expect(mockRepo.upsertUserIntegration).toHaveBeenCalledWith(mockUserId, {
        provider: "google",
        service: "calendar",
        accessToken: tokens.accessToken,
        refreshToken: null,
        expiryDate: tokens.expiryDate,
        config: null,
      });
    });

    it("should handle null refreshToken", async () => {
      const tokens: IntegrationTokens = {
        accessToken: "access-token",
      };

      mockRepo.upsertUserIntegration.mockResolvedValue(undefined);

      await upsertIntegrationService(mockUserId, "gmail", tokens);

      expect(mockRepo.upsertUserIntegration).toHaveBeenCalledWith(
        mockUserId,
        expect.objectContaining({
          refreshToken: null,
        }),
      );
    });

    it("should throw AppError on repository failure", async () => {
      const tokens: IntegrationTokens = {
        accessToken: "access-token",
      };

      mockRepo.upsertUserIntegration.mockRejectedValue(
        new Error("Database error"),
      );

      await expect(
        upsertIntegrationService(mockUserId, "gmail", tokens),
      ).rejects.toThrow();
    });
  });

  describe("getStatusService", () => {
    const futureDate = new Date(Date.now() + 1000 * 60 * 60);
    const pastDate = new Date(Date.now() - 1000 * 60 * 60);

    it("should return connected status for valid integrations", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([
        {
          service: "gmail",
          accessToken: "valid-token",
          expiryDate: futureDate,
        },
        {
          service: "calendar",
          accessToken: "valid-token",
          expiryDate: futureDate,
        },
      ]);

      const result = await getStatusService(mockUserId, { autoRefresh: false });

      expect(result.gmail.connected).toBe(true);
      expect(result.calendar.connected).toBe(true);
      expect(result.gmail.expiryDate).toBe(futureDate.toISOString());
      expect(result.calendar.expiryDate).toBe(futureDate.toISOString());
    });

    it("should return disconnected for missing integrations", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([]);

      const result = await getStatusService(mockUserId, { autoRefresh: false });

      expect(result.gmail.connected).toBe(false);
      expect(result.gmail.expiryDate).toBeNull();
      expect(result.calendar.connected).toBe(false);
      expect(result.calendar.expiryDate).toBeNull();
    });

    it("should return disconnected for expired tokens", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([
        {
          service: "gmail",
          accessToken: "expired-token",
          expiryDate: pastDate,
        },
      ]);

      const result = await getStatusService(mockUserId, { autoRefresh: false });

      expect(result.gmail.connected).toBe(false);
    });

    it("should return disconnected when accessToken is missing", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([
        {
          service: "gmail",
          accessToken: null,
          expiryDate: futureDate,
        },
      ]);

      const result = await getStatusService(mockUserId, { autoRefresh: false });

      expect(result.gmail.connected).toBe(false);
    });

    it("should consider token valid when expiryDate is null", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([
        {
          service: "gmail",
          accessToken: "valid-token",
          expiryDate: null,
        },
      ]);

      const result = await getStatusService(mockUserId, { autoRefresh: false });

      expect(result.gmail.connected).toBe(true);
    });

    it("should attempt token refresh when autoRefresh is true and tokens expired", async () => {
      mockRepo.getUserIntegrationsByProvider
        .mockResolvedValueOnce([
          {
            service: "gmail",
            accessToken: "expired-token",
            expiryDate: pastDate,
          },
        ])
        .mockResolvedValueOnce([
          {
            service: "gmail",
            accessToken: "new-token",
            expiryDate: futureDate,
          },
        ]);

      vi.mocked(googleClient.getGoogleClients).mockResolvedValue({} as any);

      const result = await getStatusService(mockUserId, { autoRefresh: true });

      expect(googleClient.getGoogleClients).toHaveBeenCalledWith(mockUserId);
      expect(result.gmail.connected).toBe(true);
    });

    it("should not refresh when autoRefresh is false", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([
        {
          service: "gmail",
          accessToken: "expired-token",
          expiryDate: pastDate,
        },
      ]);

      const result = await getStatusService(mockUserId, { autoRefresh: false });

      expect(googleClient.getGoogleClients).not.toHaveBeenCalled();
      expect(result.gmail.connected).toBe(false);
    });

    it("should handle refresh failures gracefully", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([
        {
          service: "gmail",
          accessToken: "expired-token",
          expiryDate: pastDate,
        },
      ]);

      vi.mocked(googleClient.getGoogleClients).mockRejectedValue(
        new Error("Refresh failed"),
      );

      const result = await getStatusService(mockUserId, { autoRefresh: true });

      expect(result.gmail.connected).toBe(false);
    });

    it("should default autoRefresh to true", async () => {
      mockRepo.getUserIntegrationsByProvider
        .mockResolvedValueOnce([
          {
            service: "gmail",
            accessToken: "expired-token",
            expiryDate: pastDate,
          },
        ])
        .mockResolvedValueOnce([
          {
            service: "gmail",
            accessToken: "new-token",
            expiryDate: futureDate,
          },
        ]);

      vi.mocked(googleClient.getGoogleClients).mockResolvedValue({} as any);

      await getStatusService(mockUserId);

      expect(googleClient.getGoogleClients).toHaveBeenCalled();
    });

    it("should handle partial integrations", async () => {
      mockRepo.getUserIntegrationsByProvider.mockResolvedValue([
        {
          service: "gmail",
          accessToken: "valid-token",
          expiryDate: futureDate,
        },
      ]);

      const result = await getStatusService(mockUserId, { autoRefresh: false });

      expect(result.gmail.connected).toBe(true);
      expect(result.calendar.connected).toBe(false);
    });
  });
});