import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { tasks } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    const userId = await getServerUserId();

    const db = await getDb();
    // Get all tasks for the user
    const userTasks = await db
      .select({
        aiContext: tasks.aiContext,
      })
      .from(tasks)
      .where(eq(tasks.userId, userId));

    // Extract tags from aiContext
    const tagsSet = new Set<string>();

    userTasks.forEach((task) => {
      if (task.aiContext && typeof task.aiContext === "object") {
        const context = task.aiContext as any;
        if (Array.isArray(context.tags)) {
          context.tags.forEach((tag: string) => {
            if (typeof tag === "string" && tag.trim()) {
              tagsSet.add(tag.trim());
            }
          });
        }
      }
    });

    // Convert to sorted array
    const tags = Array.from(tagsSet).sort();

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify user is authenticated
    await getServerUserId();

    const body = await request.json();
    const { tag } = body;

    if (!tag || typeof tag !== "string") {
      return NextResponse.json({ error: "Tag is required" }, { status: 400 });
    }

    const trimmedTag = tag.trim();
    if (!trimmedTag) {
      return NextResponse.json({ error: "Tag cannot be empty" }, { status: 400 });
    }

    // For now, we'll just return success since tags are stored in task aiContext
    // In a more robust implementation, we might have a separate tags table
    return NextResponse.json({
      message: "Tag created successfully",
      tag: trimmedTag,
    });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
