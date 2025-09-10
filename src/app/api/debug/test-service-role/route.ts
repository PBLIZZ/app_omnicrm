import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { supaAdminGuard } from "@/server/db/supabase-admin";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_test_service_role" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.test_service_role", requestId);

  try {
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

    await logger.info("Testing service role insert", {
      operation: "debug.test_service_role.insert",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        testEventKeys: Object.keys(testEvent),
      },
    });

    const result = await supaAdminGuard.insert("raw_events", testEvent);

    await logger.info("Service role test successful", {
      operation: "debug.test_service_role.insert",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        insertedCount: result.length,
      },
    });
    return api.success({
      success: true,
      message: "Service role insert successful",
      insertedCount: result.length,
      userId,
    });
  } catch (error) {
    await logger.error(
      "Service role test failed",
      {
        operation: "debug.test_service_role.insert",
        additionalData: {
          userId: "unknown",
        },
      },
      ensureError(error),
    );
    return api.error(
      `Service role test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_cleanup_test_data" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.cleanup_test_data", requestId);

  try {
    // Clean up test data
    await logger.info("Cleaning up test data", {
      operation: "debug.cleanup_test_data.update",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
      },
    });

    const result = await supaAdminGuard.update(
      "raw_events",
      { provider: "test" },
      { sourceMeta: { cleaned: true } },
    );

    await logger.info("Cleanup successful", {
      operation: "debug.cleanup_test_data.update",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        updatedCount: result.length,
      },
    });
    return api.success({
      success: true,
      message: "Test data cleaned up",
      updatedCount: result.length,
      userId,
    });
  } catch (error) {
    await logger.error(
      "Cleanup failed",
      {
        operation: "debug.cleanup_test_data.update",
        additionalData: {
          userId: "unknown",
        },
      },
      ensureError(error),
    );
    return api.error(
      `Cleanup failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
