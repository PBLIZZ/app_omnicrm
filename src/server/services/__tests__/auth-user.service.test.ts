import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AuthUserService, type UserData } from "../auth-user.service";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Mock next/headers
vi.mock("next/headers", () => ({
  cookies: vi.fn(),
}));

// Mock Supabase
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

describe("AuthUserService", () => {
  const mockUserId = "user-123";
  const mockEmail = "test@example.com";
  const mockCreatedAt = "2024-01-01T00:00:00.000Z";

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear environment variables
    delete process.env.E2E_USER_ID;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getUserData", () => {
    describe("E2E Mode", () => {
      it("should return mock user data in E2E mode", async () => {
        const result = await AuthUserService.getUserData({
          userId: mockUserId,
          isE2EMode: true,
        });

        expect(result).toMatchObject({
          id: mockUserId,
          email: "test-e2e@example.com",
          user_metadata: {
            name: "E2E Test User",
          },
        });
        expect(result.created_at).toBeDefined();
      });

      it("should use provided userId in E2E mode", async () => {
        const customUserId = "custom-e2e-user";
        const result = await AuthUserService.getUserData({
          userId: customUserId,
          isE2EMode: true,
        });

        expect(result.id).toBe(customUserId);
      });
    });

    describe("Supabase Mode", () => {
      const mockCookies = {
        getAll: vi.fn(() => [
          { name: "sb-access-token", value: "token123" },
          { name: "sb-refresh-token", value: "refresh123" },
        ]),
        set: vi.fn(),
      };

      const mockSupabaseClient = {
        auth: {
          getUser: vi.fn(),
        },
      };

      beforeEach(() => {
        process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "test-key";

        vi.mocked(cookies).mockResolvedValue(mockCookies as any);
        vi.mocked(createServerClient).mockReturnValue(mockSupabaseClient as any);

        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: {
            user: {
              id: mockUserId,
              email: mockEmail,
              user_metadata: { name: "Test User" },
              created_at: mockCreatedAt,
            },
          },
          error: null,
        });
      });

      it("should return user data from Supabase", async () => {
        const result = await AuthUserService.getUserData({
          userId: mockUserId,
          isE2EMode: false,
        });

        expect(result).toMatchObject({
          id: mockUserId,
          email: mockEmail,
          user_metadata: { name: "Test User" },
          created_at: mockCreatedAt,
        });
      });

      it("should create Supabase client with correct configuration", async () => {
        await AuthUserService.getUserData({
          userId: mockUserId,
          isE2EMode: false,
        });

        expect(createServerClient).toHaveBeenCalledWith(
          "https://test.supabase.co",
          "test-key",
          expect.objectContaining({
            cookies: expect.any(Object),
          }),
        );
      });

      it("should throw error when Supabase returns no user", async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: null,
        });

        await expect(
          AuthUserService.getUserData({
            userId: mockUserId,
            isE2EMode: false,
          }),
        ).rejects.toThrow("Unauthorized");
      });

      it("should throw error when Supabase returns error", async () => {
        mockSupabaseClient.auth.getUser.mockResolvedValue({
          data: { user: null },
          error: new Error("Auth error"),
        });

        await expect(
          AuthUserService.getUserData({
            userId: mockUserId,
            isE2EMode: false,
          }),
        ).rejects.toThrow("Unauthorized");
      });

      it("should throw error when environment variables are missing", async () => {
        delete process.env.NEXT_PUBLIC_SUPABASE_URL;

        await expect(
          AuthUserService.getUserData({
            userId: mockUserId,
            isE2EMode: false,
          }),
        ).rejects.toThrow("Server misconfigured");
      });

      it("should handle cookie operations correctly", async () => {
        await AuthUserService.getUserData({
          userId: mockUserId,
          isE2EMode: false,
        });

        expect(mockCookies.getAll).toHaveBeenCalled();
      });
    });
  });

  describe("isE2EMode", () => {
    it("should return true when E2E_USER_ID is set in non-production", () => {
      process.env.NODE_ENV = "development";
      process.env.E2E_USER_ID = "test-user";

      expect(AuthUserService.isE2EMode()).toBe(true);
    });

    it("should return false when E2E_USER_ID is not set", () => {
      process.env.NODE_ENV = "development";
      delete process.env.E2E_USER_ID;

      expect(AuthUserService.isE2EMode()).toBe(false);
    });

    it("should return false in production even with E2E_USER_ID set", () => {
      process.env.NODE_ENV = "production";
      process.env.E2E_USER_ID = "test-user";

      expect(AuthUserService.isE2EMode()).toBe(false);
    });

    it("should return false with empty E2E_USER_ID", () => {
      process.env.NODE_ENV = "development";
      process.env.E2E_USER_ID = "";

      expect(AuthUserService.isE2EMode()).toBe(false);
    });
  });

  describe("getSupabaseConfig", () => {
    it("should return Supabase configuration", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "test-key";

      const config = AuthUserService.getSupabaseConfig();

      expect(config).toEqual({
        url: "https://test.supabase.co",
        key: "test-key",
      });
    });

    it("should throw error when URL is missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY = "test-key";

      expect(() => AuthUserService.getSupabaseConfig()).toThrow(
        "Server misconfigured - missing Supabase environment variables",
      );
    });

    it("should throw error when key is missing", () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

      expect(() => AuthUserService.getSupabaseConfig()).toThrow(
        "Server misconfigured - missing Supabase environment variables",
      );
    });

    it("should throw error when both are missing", () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

      expect(() => AuthUserService.getSupabaseConfig()).toThrow(
        "Server misconfigured - missing Supabase environment variables",
      );
    });
  });
});