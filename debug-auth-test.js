// Debug script to test error handling
const error = Object.assign(new Error("Unauthorized"), { status: 401 });

console.log("Error details:");
console.log("- instanceof Error:", error instanceof Error);
console.log("- status in error:", "status" in error);
console.log("- error.status:", error.status);
console.log("- error.status === 401:", error.status === 401);

// Test the condition from the API handler
if (error instanceof Error && "status" in error && error.status === 401) {
  console.log("✅ Auth error condition matched");
} else {
  console.log("❌ Auth error condition NOT matched");
}

// Test what happens when we throw and catch
try {
  throw error;
} catch (caughtError) {
  console.log("\nAfter throwing and catching:");
  console.log("- instanceof Error:", caughtError instanceof Error);
  console.log("- status in error:", "status" in caughtError);
  console.log("- caughtError.status:", caughtError.status);
  console.log("- caughtError.status === 401:", caughtError.status === 401);

  if (caughtError instanceof Error && "status" in caughtError && caughtError.status === 401) {
    console.log("✅ Auth error condition matched after throw/catch");
  } else {
    console.log("❌ Auth error condition NOT matched after throw/catch");
  }
}
