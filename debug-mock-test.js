// Debug script to test mock error handling
const { vi } = require("vitest");

// Mock a function that throws an error with status
const mockFn = vi.fn();
mockFn.mockRejectedValueOnce(Object.assign(new Error("Unauthorized"), { status: 401 }));

// Test calling the mocked function
async function testMock() {
  try {
    await mockFn();
  } catch (error) {
    console.log("Caught error from mock:");
    console.log("- instanceof Error:", error instanceof Error);
    console.log("- status in error:", "status" in error);
    console.log("- error.status:", error.status);
    console.log("- error.status === 401:", error.status === 401);
    console.log("- Object.keys(error):", Object.keys(error));
    console.log("- Object.getOwnPropertyNames(error):", Object.getOwnPropertyNames(error));

    if (error instanceof Error && "status" in error && error.status === 401) {
      console.log("✅ Auth error condition matched");
    } else {
      console.log("❌ Auth error condition NOT matched");
    }
  }
}

testMock();
