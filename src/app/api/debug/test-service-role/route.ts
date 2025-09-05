import { supaAdminGuard } from "@/lib/supabase/admin";
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/lib/api/http";

export async function GET(): Promise<Response> {
  try {
    const userId = await getServerUserId();

    // Test inserting a simple raw_event
    const testEvent = {
      userId,
      provider: "test" as const,
      payload: { test: true },
      contactId: null,
      occurredAt: new Date(),
      sourceMeta: { test: true },
      batchId: null,
      sourceId: "test-123",
    };

    // console.log("🧪 Testing service role insert...");
    const result = await supaAdminGuard.insert("raw_events", testEvent);

    // console.log("✅ Service role test successful:", result);
    return ok({
      success: true,
      message: "Service role insert successful",
      insertedCount: result.length,
      userId,
    });
  } catch (error) {
    console.error("❌ Service role test failed:", error);
    return err(
      500,
      `Service role test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function DELETE(): Promise<Response> {
  try {
    const userId = await getServerUserId();

    // Clean up test data
    // console.log("🧹 Cleaning up test data...");
    const result = await supaAdminGuard.update(
      "raw_events",
      { provider: "test" },
      { sourceMeta: { cleaned: true } },
    );

    // console.log("✅ Cleanup successful:", result);
    return ok({
      success: true,
      message: "Test data cleaned up",
      updatedCount: result.length,
      userId,
    });
  } catch (error) {
    console.error("❌ Cleanup failed:", error);
    return err(500, `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}
