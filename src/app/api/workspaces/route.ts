import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/server/http/responses";
import { tasksStorage } from "@/server/storage/tasks.storage";
import { z } from "zod";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  isDefault: z.boolean().default(false),
});

export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  try {
    const workspaces = await tasksStorage.getWorkspaces(userId);
    return ok({ workspaces });
  } catch (error) {
    console.error("Error fetching workspaces:", error);
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
  const parsed = CreateWorkspaceSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    const workspace = await tasksStorage.createWorkspace(userId, {
      name: parsed.data.name,
      description: parsed.data.description || null,
      color: parsed.data.color,
      isDefault: parsed.data.isDefault,
    });
    return ok({ workspace });
  } catch (error) {
    console.error("Error creating workspace:", error);
    return err(500, "internal_server_error");
  }
}