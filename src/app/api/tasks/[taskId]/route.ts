import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { tasksStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";

const UpdateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignee: z.enum(["user", "ai"]).optional(),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).optional(),
  taggedContacts: z.array(z.string().uuid()).optional(),
  dueDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  actualMinutes: z.number().int().min(0).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { taskId } = await params;

  try {
    const task = await tasksStorage.getTask(taskId, userId);
    if (!task) {
      return err(404, "task_not_found");
    }

    // Get subtasks if any
    const subtasks = await tasksStorage.getSubtasks(taskId, userId);

    return ok({ task, subtasks });
  } catch (error) {
    console.error("Error fetching task:", error);
    return err(500, "internal_server_error");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { taskId } = await params;

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = UpdateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    // Get original task for tracking changes
    const originalTask = await tasksStorage.getTask(taskId, userId);
    if (!originalTask) {
      return err(404, "task_not_found");
    }

    const updateData: Record<string, unknown> = { ...parsed.data };
    if (parsed.data["dueDate"]) {
      updateData["dueDate"] = new Date(parsed.data["dueDate"]).toISOString();
    }
    if (parsed.data["completedAt"]) {
      updateData["completedAt"] = new Date(parsed.data["completedAt"]).toISOString();
    }

    await tasksStorage.updateTask(taskId, userId, updateData);

    // Record action for AI training if significant changes
    if (
      originalTask.approvalStatus === "pending_approval" &&
      parsed.data.approvalStatus === "approved"
    ) {
      await tasksStorage.createTaskAction(userId, {
        momentumId: taskId,
        action: "edited",
        previousData: originalTask,
        newData: updateData,
      });
    }

    const task = await tasksStorage.getTask(taskId, userId);
    return ok({ task });
  } catch (error) {
    console.error("Error updating task:", error);
    return err(500, "internal_server_error");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> },
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { taskId } = await params;

  try {
    const task = await tasksStorage.getTask(taskId, userId);
    if (!task) {
      return err(404, "task_not_found");
    }

    // Record deletion action for AI training
    await tasksStorage.createTaskAction(userId, {
      momentumId: taskId,
      action: "deleted",
      previousData: task,
      newData: null,
    });

    await tasksStorage.deleteTask(taskId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting task:", error);
    return err(500, "internal_server_error");
  }
}
