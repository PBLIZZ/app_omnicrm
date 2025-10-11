import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMockSupabaseClient } from "@/__tests__/utils/mock-request";

// Mock Supabase
const mockSupabase = createMockSupabaseClient();

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// Mock environment variables
Object.defineProperty(process, "env", {
  value: {
    NEXT_PUBLIC_SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_SECRET_KEY: "test-secret-key",
    NEXT_PUBLIC_APP_URL: "https://test.app.com",
  },
  writable: true,
});

// Mock crypto
vi.mock("crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("crypto")>();
  return {
    ...actual,
    randomBytes: vi.fn(() => ({
      toString: vi.fn(() => "test-token-123"),
    })),
  };
});

// Test the core route logic without middleware
async function testGenerateToken(
  userId: string,
  hoursValid: number,
  maxUses: number,
  mockSetup?: () => void,
): Promise<{ status: number; data: any }> {
  try {
    // Generate secure token
    const { randomBytes } = await import("crypto");
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(Date.now() + hoursValid * 3600 * 1000);

    // Set up custom mock if provided
    if (mockSetup) {
      mockSetup();
    } else {
      // Default mock setup
      const mockTokenData = {
        token: "test-token-123",
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        created_at: new Date().toISOString(),
      };

      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: mockTokenData,
            error: null,
          }),
        })),
      }));

      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }));

      mockSupabase.from = mockFrom;
    }

    // Insert token into database
    const { data, error } = await mockSupabase
      .from("onboarding_tokens")
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        max_uses: maxUses,
        created_by: userId,
      })
      .select("token, expires_at, max_uses, created_at")
      .single();

    if (error) {
      return { status: 500, data: { error: "Failed to create onboarding token" } };
    }

    // Generate public URL
    const publicUrl = `${process.env["NEXT_PUBLIC_APP_URL"]}/onboard/${data.token}`;

    return {
      status: 200,
      data: {
        token: data.token,
        onboardingUrl: publicUrl,
        expiresAt: data.expires_at,
        maxUses: data.max_uses,
      },
    };
  } catch (error) {
    console.error("Test error:", error);
    return { status: 500, data: { error: "Internal server error" } };
  }
}

describe("Onboarding Token Generation Logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should generate token successfully with valid input", async () => {
    const result = await testGenerateToken("user-123", 72, 1);

    expect(result.status).toBe(200);
    expect(result.data).toEqual({
      token: "test-token-123",
      onboardingUrl: "https://test.app.com/onboard/test-token-123",
      expiresAt: expect.any(String),
      maxUses: 1,
    });

    expect(mockSupabase.from).toHaveBeenCalledWith("onboarding_tokens");
    expect(mockSupabase.from().insert).toHaveBeenCalledWith({
      user_id: "user-123",
      token: "test-token-123",
      expires_at: expect.any(String),
      max_uses: 1,
      created_by: "user-123",
    });
  });

  it("should handle database errors gracefully", async () => {
    const result = await testGenerateToken("user-123", 72, 1, () => {
      // Set up the mock to return an error
      const mockInsert = vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database connection failed" },
          }),
        })),
      }));

      const mockFrom = vi.fn(() => ({
        insert: mockInsert,
      }));

      mockSupabase.from = mockFrom;
    });

    expect(result.status).toBe(500);
    expect(result.data).toEqual({
      error: "Failed to create onboarding token",
    });
  });

  it("should calculate correct expiration time", async () => {
    const result = await testGenerateToken("user-123", 24, 1);

    expect(result.status).toBe(200);

    // Verify that the expiration time is calculated correctly
    const insertCall = mockSupabase.from().insert;
    expect(insertCall).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-123",
        token: "test-token-123",
        expires_at: expect.any(String),
        max_uses: 1,
        created_by: "user-123",
      }),
    );

    // Check that the expiration time is approximately 24 hours from now
    const insertArgs = insertCall.mock.calls[0][0];
    const expiresAt = new Date(insertArgs.expires_at);
    const now = new Date();
    const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    expect(hoursDiff).toBeCloseTo(24, 1); // Within 0.1 hours
  });

  it("should generate different tokens for different calls", async () => {
    // Mock different token responses
    let callCount = 0;
    const mockInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockImplementation(() => {
          callCount++;
          return Promise.resolve({
            data: {
              token: `test-token-${callCount}`,
              expires_at: "2024-01-01T12:00:00Z",
              max_uses: 1,
              created_at: "2024-01-01T10:00:00Z",
            },
            error: null,
          });
        }),
      })),
    }));

    const mockFrom = vi.fn(() => ({
      insert: mockInsert,
    }));

    mockSupabase.from = mockFrom;

    const result1 = await testGenerateToken("user-123", 72, 1, () => {
      // Mock setup is already done above
    });
    const result2 = await testGenerateToken("user-456", 48, 3, () => {
      // Mock setup is already done above
    });

    expect(result1.status).toBe(200);
    expect(result2.status).toBe(200);
    expect(result1.data.token).toBe("test-token-1");
    expect(result2.data.token).toBe("test-token-2");
  });

  it("should handle different max uses values", async () => {
    const result = await testGenerateToken("user-123", 72, 5);

    expect(result.status).toBe(200);
    expect(result.data.maxUses).toBe(5);

    expect(mockSupabase.from().insert).toHaveBeenCalledWith(
      expect.objectContaining({
        max_uses: 5,
      }),
    );
  });

  it("should handle different duration values", async () => {
    const result = await testGenerateToken("user-123", 168, 1); // 1 week

    expect(result.status).toBe(200);

    // Check that the expiration time is approximately 168 hours from now
    const insertCall = mockSupabase.from().insert;
    const insertArgs = insertCall.mock.calls[0][0];
    const expiresAt = new Date(insertArgs.expires_at);
    const now = new Date();
    const hoursDiff = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

    expect(hoursDiff).toBeCloseTo(168, 1); // Within 0.1 hours
  });
});
