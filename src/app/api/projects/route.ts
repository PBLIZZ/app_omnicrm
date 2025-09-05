import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { MomentumStorage } from "@/server/storage/momentum.storage";

const momentumStorage = new MomentumStorage();
import { z } from "zod";

const CreateProjectSchema = z.object({
  momentumWorkspaceId: z.string().uuid("Invalid workspace ID"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  color: z.string().default("#10b981"),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
  dueDate: z.string().datetime().optional(),
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
  const workspaceId = searchParams.get("workspaceId") ?? undefined;

  try {
    const projects = await momentumStorage.getMomentumProjects(userId, workspaceId);
    return ok({ projects });
  } catch (error) {
    console.error("Error fetching projects:", error);
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
  const parsed = CreateProjectSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    const project = await momentumStorage.createMomentumProject(userId, {
      momentumWorkspaceId: parsed.data.momentumWorkspaceId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      color: parsed.data.color,
      status: parsed.data.status,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
    });
    return ok({ project });
  } catch (error) {
    console.error("Error creating project:", error);
    return err(500, "internal_server_error");
  }
}
