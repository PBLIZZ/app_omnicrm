import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { contacts } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_omni_count" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.omni_count", requestId);

  try {
    const dbo = await getDb();

    // Get total contacts for this user
    const totalResult = await dbo
      .select({ count: sql<number>`count(*)` })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    // Get sample contacts
    const sampleContacts = await dbo
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
        source: contacts.source,
        createdAt: contacts.createdAt,
      })
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .limit(5);

    const total = Number(totalResult[0]?.count ?? 0);

    return api.success({
      userId,
      totalContacts: total,
      sampleContacts,
      debug: {
        hasContacts: total > 0,
        userIdLength: userId.length,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    return api.error("Failed to debug omni count", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
