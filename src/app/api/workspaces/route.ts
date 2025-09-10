import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const CreateWorkspaceSchema = z.object({
  name: z.string().min(1, "Workspace name is required"),
  description: z.string().optional(),
  color: z.string().default("#6366f1"),
  isDefault: z.boolean().default(false),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "workspaces_list" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("workspaces_list", requestId);

  try {
    const workspaces = await momentumStorage.getMomentumWorkspaces(userId);
    return api.success({ workspaces });
  } catch (error) {
    return api.error("Failed to fetch workspaces", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "workspaces_create" },
  validation: {
    body: CreateWorkspaceSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("workspaces_create", requestId);

  try {
    const workspace = await momentumStorage.createMomentumWorkspace(userId, {
      name: validated.body.name,
      description: validated.body.description ?? null,
      color: validated.body.color,
      isDefault: validated.body.isDefault,
    });

    return api.success({ workspace });
  } catch (error) {
    return api.error("Failed to create workspace", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
