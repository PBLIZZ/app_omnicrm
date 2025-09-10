import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { MomentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const momentumStorage = new MomentumStorage();

const CreateProjectSchema = z.object({
  momentumWorkspaceId: z.string().uuid("Invalid workspace ID"),
  name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  color: z.string().default("#10b981"),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).default("active"),
  dueDate: z.string().datetime().optional(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "projects_list" },
})(async ({ userId, requestId }, request) => {
  const api = new ApiResponseBuilder("projects_list", requestId);

  try {
    const workspaceId = request.nextUrl.searchParams.get("workspaceId") ?? undefined;
    const projects = await momentumStorage.getMomentumProjects(userId, workspaceId);

    return api.success({ projects });
  } catch (error) {
    return api.error("Failed to fetch projects", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "projects_create" },
  validation: {
    body: CreateProjectSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("projects_create", requestId);

  try {
    const project = await momentumStorage.createMomentumProject(userId, {
      momentumWorkspaceId: validated.body.momentumWorkspaceId,
      name: validated.body.name,
      description: validated.body.description ?? null,
      color: validated.body.color,
      status: validated.body.status,
      dueDate: validated.body.dueDate ? new Date(validated.body.dueDate) : null,
    });

    return api.success({ project });
  } catch (error) {
    return api.error("Failed to create project", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
