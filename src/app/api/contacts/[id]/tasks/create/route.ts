import { NextRequest } from "next/server";
import { getDb } from "@/server/db/client";
import { momentums as tasks, momentumWorkspaces as workspaces } from "@/server/db/schema";
import { getServerUserId } from "@/server/auth/user";
import { eq, and } from "drizzle-orm";
import { ok, err } from "@/lib/api/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const userId = await getServerUserId();
    const db = await getDb();

    const { id: contactId } = await params;
    const body = (await request.json()) as {
      title?: string;
      description?: string;
      priority?: string;
      estimatedMinutes?: number;
    };
    const { title, description, priority, estimatedMinutes } = body;

    if (!contactId) {
      return err(400, "Contact ID is required");
    }

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return err(400, "Task title is required");
    }

    // Get or create default workspace
    let defaultWorkspace = await db
      .select()
      .from(workspaces)
      .where(and(eq(workspaces.userId, userId), eq(workspaces.isDefault, true)))
      .limit(1)
      .then((rows) => rows[0] ?? null);

    if (!defaultWorkspace) {
      // Create default workspace
      const newWorkspace = await db
        .insert(workspaces)
        .values({
          userId,
          name: "Default Workspace",
          description: "Auto-created workspace for contact tasks",
          isDefault: true,
        })
        .returning();
      defaultWorkspace = newWorkspace[0] ?? null;
    }

    const newTask = await db
      .insert(tasks)
      .values({
        userId,
        momentumWorkspaceId: defaultWorkspace?.id ?? null,
        title: title.trim(),
        description: description ? description.trim() : null,
        priority: priority ?? "medium",
        estimatedMinutes: estimatedMinutes ?? null,
        source: "ai_generated",
        approvalStatus: "approved", // Auto-approve AI generated tasks from user request
        taggedContacts: [contactId], // Store contact ID in tagged contacts
      })
      .returning();

    return ok(newTask[0]);
  } catch (error) {
    console.error("Error creating task:", error);
    return err(500, "Failed to create task");
  }
}
