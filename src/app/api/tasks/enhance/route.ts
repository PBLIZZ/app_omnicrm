import { NextRequest, NextResponse } from "next/server";
import {
  enhanceTaskWithAI,
  suggestTaskBreakdown,
  suggestTaskTags,
} from "@/server/ai/task-enhancement";
import { getServerUserId } from "@/server/auth/user";

export async function POST(request: NextRequest) {
  try {
    const userId = await getServerUserId();

    const body = await request.json();
    const { action, title, description, dueDate, userContext } = body;

    switch (action) {
      case "enhance": {
        if (!title) {
          return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const enhancement = await enhanceTaskWithAI({
          title,
          dueDate: dueDate ? new Date(dueDate) : undefined,
          userContext,
        });

        return NextResponse.json({ enhancement });
      }

      case "breakdown": {
        if (!title) {
          return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const subtasks = await suggestTaskBreakdown(title, description);
        return NextResponse.json({ subtasks });
      }

      case "tags": {
        if (!title || !description) {
          return NextResponse.json(
            { error: "Title and description are required" },
            { status: 400 },
          );
        }

        const existingTags = userContext?.existingTags || [];
        const suggestedTags = await suggestTaskTags(title, description, existingTags);
        return NextResponse.json({ tags: suggestedTags });
      }

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("Task enhancement error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
