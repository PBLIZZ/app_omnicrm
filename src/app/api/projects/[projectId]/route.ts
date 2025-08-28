import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { tasksStorage } from "@/server/storage/tasks.storage";
import { z } from "zod";

const UpdateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).optional(),
  dueDate: z.string().datetime().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { projectId } = await params;

  try {
    const project = await tasksStorage.getProject(projectId, userId);
    if (!project) {
      return err(404, "project_not_found");
    }
    return ok({ project });
  } catch (error) {
    console.error("Error fetching project:", error);
    return err(500, "internal_server_error");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { projectId } = await params;
  
  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = UpdateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    const updateData = { ...parsed.data };
    if (parsed.data.dueDate) {
      updateData.dueDate = new Date(parsed.data.dueDate);
    }
    
    await tasksStorage.updateProject(projectId, userId, updateData);
    const project = await tasksStorage.getProject(projectId, userId);
    return ok({ project });
  } catch (error) {
    console.error("Error updating project:", error);
    return err(500, "internal_server_error");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { projectId } = await params;

  try {
    await tasksStorage.deleteProject(projectId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return err(500, "internal_server_error");
  }
}