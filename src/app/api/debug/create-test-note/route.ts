import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

const CreateTestNoteSchema = z.object({
  contactId: z.string().optional(),
  content: z.string().default("This is a test note to verify the lastNote display functionality."),
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "debug_create_test_note" },
  validation: {
    body: CreateTestNoteSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("debug.create_test_note", requestId);

  try {
    const dbo = await getDb();
    const { contactId, content } = validated.body;

    let targetContactId = contactId;

    // If no contactId provided, find the first contact for this user
    if (!targetContactId) {
      const firstContact = await dbo
        .select({ id: contacts.id })
        .from(contacts)
        .where(eq(contacts.userId, userId))
        .limit(1);

      if (firstContact.length === 0 || !firstContact[0]) {
        return api.error("No contacts found for user", "NOT_FOUND");
      }

      targetContactId = firstContact[0].id;
    }

    // Create the test note
    const newNote = await dbo
      .insert(notes)
      .values({
        contactId: targetContactId,
        userId,
        content,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return api.success({
      message: "Test note created successfully",
      note: newNote[0],
      contactId: targetContactId,
    });
  } catch (error) {
    return api.error("Failed to create test note", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
