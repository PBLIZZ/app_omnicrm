import { describe, it, expect, vi, beforeEach } from "vitest";
import { AuthUserRepository } from "../auth-user.repo";
import type { DbClient } from "@/server/db/client";

describe("AuthUserRepository", () => {
  let mockDb: DbClient;
  let repo: AuthUserRepository;
  const mockUserId = "user-123";

  beforeEach(() => {
    mockDb = {
      execute: vi.fn(),
    } as any;
    repo = new AuthUserRepository(mockDb);
    vi.clearAllMocks();
  });

  describe("getUserContext", () => {
    it("should return user context when user found", async () => {
      const mockResult = {
        rows: [
          {
            email: "test@example.com",
            raw_user_meta_data: {
              avatar_url: "https://example.com/avatar.jpg",
              name: "Test User",
            },
          },
        ],
      };

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserContext(mockUserId);

      expect(result).toEqual({
        email: "test@example.com",
        avatarUrl: "https://example.com/avatar.jpg",
      });
      expect(mockDb.execute).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should return user context without avatar when not provided", async () => {
      const mockResult = {
        rows: [
          {
            email: "test@example.com",
            raw_user_meta_data: {
              name: "Test User",
            },
          },
        ],
      };

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserContext(mockUserId);

      expect(result).toEqual({
        email: "test@example.com",
        avatarUrl: undefined,
      });
    });

    it("should return user context with null raw_user_meta_data", async () => {
      const mockResult = {
        rows: [
          {
            email: "test@example.com",
            raw_user_meta_data: null,
          },
        ],
      };

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserContext(mockUserId);

      expect(result).toEqual({
        email: "test@example.com",
        avatarUrl: undefined,
      });
    });

    it("should return null when user not found", async () => {
      const mockResult = {
        rows: [],
      };

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserContext(mockUserId);

      expect(result).toBeNull();
    });

    it("should return null when rows is undefined", async () => {
      const mockResult = {};

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserContext(mockUserId);

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      vi.mocked(mockDb.execute).mockRejectedValue(new Error("Database error"));

      await expect(repo.getUserContext(mockUserId)).rejects.toThrow("Database error");
    });
  });

  describe("getUserProfile", () => {
    it("should return user profile when user found", async () => {
      const mockResult = {
        rows: [
          {
            id: mockUserId,
            email: "test@example.com",
            raw_user_meta_data: {
              avatar_url: "https://example.com/avatar.jpg",
              full_name: "Test User",
            },
            created_at: "2024-01-01T00:00:00.000Z",
          },
        ],
      };

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserProfile(mockUserId);

      expect(result).toEqual({
        id: mockUserId,
        email: "test@example.com",
        avatarUrl: "https://example.com/avatar.jpg",
        displayName: "Test User",
        createdAt: "2024-01-01T00:00:00.000Z",
      });
      expect(mockDb.execute).toHaveBeenCalledWith(expect.any(Object));
    });

    it("should return user profile without optional fields when not provided", async () => {
      const mockResult = {
        rows: [
          {
            id: mockUserId,
            email: "test@example.com",
            raw_user_meta_data: null,
            created_at: "2024-01-01T00:00:00.000Z",
          },
        ],
      };

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserProfile(mockUserId);

      expect(result).toEqual({
        id: mockUserId,
        email: "test@example.com",
        avatarUrl: undefined,
        displayName: undefined,
        createdAt: "2024-01-01T00:00:00.000Z",
      });
    });

    it("should return null when user not found", async () => {
      const mockResult = {
        rows: [],
      };

      vi.mocked(mockDb.execute).mockResolvedValue(mockResult as any);

      const result = await repo.getUserProfile(mockUserId);

      expect(result).toBeNull();
    });

    it("should handle database errors", async () => {
      vi.mocked(mockDb.execute).mockRejectedValue(new Error("Database error"));

      await expect(repo.getUserProfile(mockUserId)).rejects.toThrow("Database error");
    });
  });
});
