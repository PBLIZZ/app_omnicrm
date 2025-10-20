// Test to verify mock setup
import { vi } from "vitest";

// Mock the module
vi.mock("@/server/auth/user", () => ({
  getServerUserId: vi.fn().mockResolvedValue("test-user-id"),
}));

// Test the mock
async function testMock() {
  const { getServerUserId } = await import("@/server/auth/user");

  console.log("Default mock behavior:");
  try {
    const result = await getServerUserId();
    console.log("Result:", result);
  } catch (error) {
    console.log("Error:", error);
  }

  console.log("\nOverriding mock to throw error:");
  vi.mocked(getServerUserId).mockRejectedValueOnce(
    Object.assign(new Error("Unauthorized"), { status: 401 }),
  );

  try {
    const result = await getServerUserId();
    console.log("Result:", result);
  } catch (error) {
    console.log("Caught error:");
    console.log("- instanceof Error:", error instanceof Error);
    console.log("- status in error:", "status" in error);
    console.log("- error.status:", error.status);
    console.log("- error.status === 401:", error.status === 401);
  }
}

testMock();
