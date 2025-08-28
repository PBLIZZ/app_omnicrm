import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { tasksStorage } from "@/server/storage/tasks.storage";
import { z } from "zod";

const CreateTaskSchema = z.object({
  workspaceId: z.string().uuid("Invalid workspace ID"),
  projectId: z.string().uuid().optional(),
  parentTaskId: z.string().uuid().optional(),
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignee: z.enum(["user", "ai"]).default("user"),
  source: z.enum(["user", "ai_generated"]).default("user"),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).default("approved"),
  taggedContacts: z.array(z.string().uuid()).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  aiContext: z.any().optional(),
});

export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { searchParams } = new URL(req.url);
  const filters = {
    workspaceId: searchParams.get("workspaceId") || undefined,
    projectId: searchParams.get("projectId") || undefined,
    status: searchParams.get("status") || undefined,
    assignee: searchParams.get("assignee") || undefined,
    approvalStatus: searchParams.get("approvalStatus") || undefined,
    parentTaskId: searchParams.has("parentTaskId") 
      ? (searchParams.get("parentTaskId") || null)
      : undefined,
  };

  const withContacts = searchParams.get("withContacts") === "true";

  try {
    let tasks;
    if (withContacts) {
      tasks = await tasksStorage.getTasksWithContacts(userId);
    } else {
      tasks = await tasksStorage.getTasks(userId, filters);
    }
    return ok({ tasks });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return err(500, "internal_server_error");
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = CreateTaskSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    const task = await tasksStorage.createTask(userId, {
      workspaceId: parsed.data.workspaceId,
      projectId: parsed.data.projectId || null,
      parentTaskId: parsed.data.parentTaskId || null,
      title: parsed.data.title,
      description: parsed.data.description || null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignee: parsed.data.assignee,
      source: parsed.data.source,
      approvalStatus: parsed.data.approvalStatus,
      taggedContacts: parsed.data.taggedContacts || null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      estimatedMinutes: parsed.data.estimatedMinutes || null,
      aiContext: parsed.data.aiContext || null,
    });
    return ok({ task });
  } catch (error) {
    console.error("Error creating task:", error);
    return err(500, "internal_server_error");
  }
}