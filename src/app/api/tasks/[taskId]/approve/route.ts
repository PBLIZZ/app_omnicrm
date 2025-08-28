import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { tasksStorage } from "@/server/storage/tasks.storage";
import { z } from "zod";

const ApproveTaskSchema = z.object({
  notes: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
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
  const parsed = ApproveTaskSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    await tasksStorage.approveTask(taskId, userId, parsed.data.notes);
    const task = await tasksStorage.getTask(taskId, userId);
    return ok({ task, message: "Task approved successfully" });
  } catch (error) {
    console.error("Error approving task:", error);
    return err(500, "internal_server_error");
  }
}