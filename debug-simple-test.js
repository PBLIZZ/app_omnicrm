// Debug script to test error handling without vitest
function createMockError() {
  return Object.assign(new Error("Unauthorized"), { status: 401 });
}

// Test calling a function that throws the error
async function testError() {
  try {
    throw createMockError();
  } catch (error) {
    console.log("Caught error:");
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

testError();
