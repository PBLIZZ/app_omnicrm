import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { tasksStorage } from "@/server/storage/tasks.storage";
import { z } from "zod";

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { workspaceId } = await params;

  try {
    const workspace = await tasksStorage.getWorkspace(workspaceId, userId);
    if (!workspace) {
      return err(404, "workspace_not_found");
    }
    return ok({ workspace });
  } catch (error) {
    console.error("Error fetching workspace:", error);
    return err(500, "internal_server_error");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { workspaceId } = await params;
  
  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = UpdateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    await tasksStorage.updateWorkspace(workspaceId, userId, parsed.data);
    const workspace = await tasksStorage.getWorkspace(workspaceId, userId);
    return ok({ workspace });
  } catch (error) {
    console.error("Error updating workspace:", error);
    return err(500, "internal_server_error");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { workspaceId } = await params;

  try {
    await tasksStorage.deleteWorkspace(workspaceId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return err(500, "internal_server_error");
  }
}