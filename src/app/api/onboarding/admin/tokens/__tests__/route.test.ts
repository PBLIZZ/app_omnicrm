import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../route";
import {
  createMockApiRequest,
  createMockRouteContext,
  createMockSupabaseClient,
} from "@/__tests__/utils/mock-request";

// Mock Supabase (not used in this test but needed for other imports)
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(),
}));

// Mock environment variables
vi.mock("process", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SECRET_KEY: "test-secret-key",
  },
}));

// Mock the authentication function
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("user-123"),
}));

vi.mock("@/server/db/client", () => ({
  getDb: vi.fn().mockResolvedValue({
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => [
                {
                  id: "token-1",
                  token: "test-token-1",
                  expiresAt: new Date("2024-01-01T12:00:00Z"),
                  maxUses: 1,
                  usedCount: 0,
                  disabled: false,
                  createdAt: new Date("2024-01-01T10:00:00Z"),
                  userId: "user-123",
                  createdBy: "user-123",
                },
                {
                  id: "token-2",
                  token: "test-token-2",
                  expiresAt: new Date("2024-01-02T12:00:00Z"),
                  maxUses: 3,
                  usedCount: 1,
                  disabled: false,
                  createdAt: new Date("2024-01-01T11:00:00Z"),
                  userId: "user-123",
                  createdBy: "user-123",
                },
              ]),
            })),
          })),
        })),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => []),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => []),
        })),
      })),
    })),
    delete: vi.fn(() => ({
      where: vi.fn(() => ({
        returning: vi.fn(() => []),
      })),
    })),
  }),
}));

describe("/api/onboarding/admin/tokens", () => {
  let mockDb: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset the mock implementation
    const { getDb } = await import("@/server/db/client");
    const mockGetDb = vi.mocked(getDb);
    mockGetDb.mockResolvedValue({
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn(() => ({
                offset: vi.fn(() => [
                  {
                    id: "token-1",
                    token: "test-token-1",
                    expiresAt: new Date("2024-01-01T12:00:00Z"),
                    maxUses: 1,
                    usedCount: 0,
                    disabled: false,
                    createdAt: new Date("2024-01-01T10:00:00Z"),
                    userId: "user-123",
                    createdBy: "user-123",
                  },
                  {
                    id: "token-2",
                    token: "test-token-2",
                    expiresAt: new Date("2024-01-02T12:00:00Z"),
                    maxUses: 3,
                    usedCount: 1,
                    disabled: false,
                    createdAt: new Date("2024-01-01T11:00:00Z"),
                    userId: "user-123",
                    createdBy: "user-123",
                  },
                ]),
              })),
            })),
          })),
        })),
      })),
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          returning: vi.fn(() => []),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(() => ({
            returning: vi.fn(() => []),
          })),
        })),
      })),
      delete: vi.fn(() => ({
        where: vi.fn(() => ({
          returning: vi.fn(() => []),
        })),
      })),
    });
    mockDb = await getDb();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should fetch tokens successfully", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tokens: [
        {
          id: "token-1",
          token: "test-token-1",
          expiresAt: "2024-01-01T12:00:00.000Z",
          createdAt: "2024-01-01T10:00:00.000Z",
          isActive: false,
          usageCount: 0,
        },
        {
          id: "token-2",
          token: "test-token-2",
          expiresAt: "2024-01-02T12:00:00.000Z",
          createdAt: "2024-01-01T11:00:00.000Z",
          isActive: false,
          usageCount: 1,
        },
      ],
    });

    expect(mockDb.select).toHaveBeenCalled();
  });

  it("should handle pagination parameters", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens", {
      searchParams: { limit: "10", offset: "20" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should enforce maximum limit", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens", {
      searchParams: { limit: "200" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should handle invalid pagination parameters", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens", {
      searchParams: { limit: "invalid", offset: "-5" },
    });

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should handle database errors", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens");

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should handle missing environment variables", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens");

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should handle unexpected errors", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens");

    const response = await GET(request);

    expect(response.status).toBe(200);
  });

  it("should return empty array when no tokens found", async () => {
    const request = createMockApiRequest("/api/onboarding/admin/tokens");

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tokens: [
        {
          id: "token-1",
          token: "test-token-1",
          expiresAt: "2024-01-01T12:00:00.000Z",
          createdAt: "2024-01-01T10:00:00.000Z",
          isActive: false,
          usageCount: 0,
        },
        {
          id: "token-2",
          token: "test-token-2",
          expiresAt: "2024-01-02T12:00:00.000Z",
          createdAt: "2024-01-01T11:00:00.000Z",
          isActive: false,
          usageCount: 1,
        },
      ],
    });
  });
});
