import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getSql } from "@/server/db/client";
import { ensureError } from "@/lib/utils/error-handler";

// Type guard for database results
function isValidInsertResult(result: unknown): result is { id: string }[] {
  return (
    Array.isArray(result) &&
    result.length > 0 &&
    typeof result[0] === "object" &&
    result[0] !== null &&
    "id" in result[0] &&
    typeof (result[0] as Record<string, unknown>)["id"] === "string"
  );
}

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_test_direct_sql" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.test_direct_sql", requestId);
  try {
    const sql = getSql();

    if (!sql) {
      throw new Error("Database connection not initialized");
    }

    // Test direct SQL insert using postgres.js tagged template literals
    const testData = {
      user_id: userId,
      provider: "test",
      payload: { test: true },
      contact_id: null,
      occurred_at: new Date(),
      source_meta: { test: true },
      batch_id: null,
      source_id: "test-123",
      created_at: new Date(),
    };

    const result = await sql`
      INSERT INTO raw_events (
        user_id, provider, payload, contact_id, occurred_at,
        source_meta, batch_id, source_id, created_at
      ) VALUES (
        ${testData.user_id}, ${testData.provider}, ${JSON.stringify(testData.payload)}, 
        ${testData.contact_id}, ${testData.occurred_at}, ${JSON.stringify(testData.source_meta)}, 
        ${testData.batch_id}, ${testData.source_id}, ${testData.created_at}
      )
      RETURNING id
    `;

    // Clean up - using type guard for safe access
    let insertedId: string | null = null;
    if (isValidInsertResult(result)) {
      insertedId = result[0]!.id;
      await sql`DELETE FROM raw_events WHERE id = ${insertedId}`;
    }

    return api.success({
      success: true,
      message: "Direct SQL insert successful",
      insertedId,
      userId,
    });
  } catch (error) {
    return api.error(
      `Direct SQL test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      "INTERNAL_ERROR",
      undefined,
      ensureError(error),
    );
  }
});
