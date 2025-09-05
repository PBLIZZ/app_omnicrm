import { getServerUserId } from "@/server/auth/user";
import { getSql } from "@/server/db/client";
import { err, ok } from "@/lib/api/http";

export async function GET(): Promise<Response> {
  try {
    const userId = await getServerUserId();
    const sql = getSql();

    if (!sql) {
      throw new Error("Database connection not initialized");
    }

    // Test direct SQL insert using postgres.js tagged template literals
    // console.log("🧪 Testing direct SQL insert...");

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

    // console.log("✅ Direct SQL insert successful:", result[0]);

    // Clean up
    if (result[0]?.["id"]) {
      await sql`DELETE FROM raw_events WHERE id = ${result[0]["id"]}`;
      // console.log("🧹 Test data cleaned up");
    }

    return ok({
      success: true,
      message: "Direct SQL insert successful",
      insertedId: (result[0] as Record<string, unknown>)?.["id"] as string,
      userId,
    });
  } catch (error) {
    console.error("❌ Direct SQL test failed:", error);
    return err(
      500,
      `Direct SQL test failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
