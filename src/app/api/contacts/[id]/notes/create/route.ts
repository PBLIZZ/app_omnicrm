import { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { notes } from "@/server/db/schema";
import { getServerUserId } from "@/server/auth/user";
import { ok, err } from "@/lib/api/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const userId = await getServerUserId();

    const { id: contactId } = await params;
    const body = (await request.json()) as { content?: string };
    const { content } = body;

    if (!contactId) {
      return err(400, "Contact ID is required");
    }

    if (!content || typeof content !== "string" || content.trim().length === 0) {
      return err(400, "Note content is required");
    }

    const db = await getDb();
    const newNote = await db
      .insert(notes)
      .values({
        contactId,
        userId,
        content: content.trim(),
      })
      .returning();

    return ok(newNote[0]);
  } catch (error) {
    console.error("Error creating note:", error);
    return err(500, "Failed to create note");
  }
}
