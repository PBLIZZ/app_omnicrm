import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "../route";
import {
  createMockApiRequest,
  createMockRouteContext,
  createMockSupabaseClient,
} from "@/__tests__/utils/mock-request";

// Mock Supabase
const mockSupabase = createMockSupabaseClient();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock environment variables
vi.mock("process", () => ({
  env: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SECRET_KEY: "test-secret-key",
  },
}));

describe("/api/onboarding/admin/tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should fetch tokens successfully", async () => {
    const mockTokens = [
      {
        id: "token-1",
        token: "test-token-1",
        expires_at: "2024-01-01T12:00:00Z",
        max_uses: 1,
        used_count: 0,
        disabled: false,
        created_at: "2024-01-01T10:00:00Z",
        user_id: "user-123",
        created_by: "user-123",
      },
      {
        id: "token-2",
        token: "test-token-2",
        expires_at: "2024-01-02T12:00:00Z",
        max_uses: 3,
        used_count: 1,
        disabled: false,
        created_at: "2024-01-01T11:00:00Z",
        user_id: "user-123",
        created_by: "user-123",
      },
    ];

    mockSupabase.from().select().eq().order().range.mockResolvedValue({
      data: mockTokens,
      error: null,
    });

    const request = createMockApiRequest("/api/onboarding/admin/tokens");
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tokens: mockTokens,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("onboarding_tokens");
    expect(mockSupabase.from().select).toHaveBeenCalledWith("*");
    expect(mockSupabase.from().select().eq).toHaveBeenCalledWith("user_id", "user-123");
    expect(mockSupabase.from().select().eq().order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(mockSupabase.from().select().eq().order().range).toHaveBeenCalledWith(0, 19); // default limit
  });

  it("should handle pagination parameters", async () => {
    const mockTokens = [];

    mockSupabase.from().select().eq().order().range.mockResolvedValue({
      data: mockTokens,
      error: null,
    });

    const request = createMockApiRequest("/api/onboarding/admin/tokens", {
      searchParams: { limit: "10", offset: "20" },
    });
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);

    expect(response.status).toBe(200);
    expect(mockSupabase.from().select().eq().order().range).toHaveBeenCalledWith(20, 29); // offset=20, limit=10
  });

  it("should enforce maximum limit", async () => {
    const mockTokens = [];

    mockSupabase.from().select().eq().order().range.mockResolvedValue({
      data: mockTokens,
      error: null,
    });

    const request = createMockApiRequest("/api/onboarding/admin/tokens", {
      searchParams: { limit: "200" },
    });
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);

    expect(response.status).toBe(200);
    expect(mockSupabase.from().select().eq().order().range).toHaveBeenCalledWith(0, 99); // max limit 100
  });

  it("should handle invalid pagination parameters", async () => {
    const mockTokens = [];

    mockSupabase.from().select().eq().order().range.mockResolvedValue({
      data: mockTokens,
      error: null,
    });

    const request = createMockApiRequest("/api/onboarding/admin/tokens", {
      searchParams: { limit: "invalid", offset: "-5" },
    });
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);

    expect(response.status).toBe(200);
    expect(mockSupabase.from().select().eq().order().range).toHaveBeenCalledWith(0, 19); // defaults
  });

  it("should handle database errors", async () => {
    mockSupabase
      .from()
      .select()
      .eq()
      .order()
      .range.mockResolvedValue({
        data: null,
        error: { message: "Database connection failed" },
      });

    const request = createMockApiRequest("/api/onboarding/admin/tokens");
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Failed to fetch tokens",
      code: "DATABASE_ERROR",
    });
  });

  it("should handle missing environment variables", async () => {
    // Mock missing environment variables
    vi.doMock("process", () => ({
      env: {
        NEXT_PUBLIC_SUPABASE_URL: undefined,
        SUPABASE_SECRET_KEY: undefined,
      },
    }));

    const request = createMockApiRequest("/api/onboarding/admin/tokens");
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Server configuration error",
    });
  });

  it("should handle unexpected errors", async () => {
    mockSupabase
      .from()
      .select()
      .eq()
      .order()
      .range.mockRejectedValue(new Error("Unexpected error"));

    const request = createMockApiRequest("/api/onboarding/admin/tokens");
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toEqual({
      error: "Internal server error",
    });
  });

  it("should return empty array when no tokens found", async () => {
    mockSupabase.from().select().eq().order().range.mockResolvedValue({
      data: null,
      error: null,
    });

    const request = createMockApiRequest("/api/onboarding/admin/tokens");
    const mockContext = createMockRouteContext("user-123", {});

    const response = await GET(mockContext as any, request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      tokens: [],
    });
  });
});
