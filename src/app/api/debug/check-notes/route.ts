import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { ensureError } from "@/lib/utils/error-handler";

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_check_notes" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("debug.check_notes", requestId);

  try {
    const dbo = await getDb();

    // Get contacts with their notes info
    const contactsWithNotes = await dbo
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        notesCount: sql<number>`(
          SELECT COUNT(*)
          FROM ${notes}
          WHERE ${notes.contactId} = ${contacts.id}
          AND ${notes.userId} = ${contacts.userId}
        )`,
        lastNote: sql<string | null>`(
          SELECT ${notes.content}
          FROM ${notes}
          WHERE ${notes.contactId} = ${contacts.id}
          AND ${notes.userId} = ${contacts.userId}
          ORDER BY ${notes.createdAt} DESC
          LIMIT 1
        )`,
      })
      .from(contacts)
      .where(eq(contacts.userId, userId))
      .limit(5);

    // Also get raw notes data
    const rawNotes = await dbo
      .select({
        id: notes.id,
        contactId: notes.contactId,
        content: notes.content,
        createdAt: notes.createdAt,
      })
      .from(notes)
      .where(eq(notes.userId, userId))
      .orderBy(notes.createdAt)
      .limit(10);

    return api.success({
      contactsWithNotes,
      rawNotes,
      userId,
    });
  } catch (error) {
    return api.error("Failed to check notes data", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
