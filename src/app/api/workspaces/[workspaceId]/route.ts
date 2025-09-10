import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { MomentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";
import type { NewMomentumWorkspace } from "@/server/db/schema";
import { ensureError } from "@/lib/utils/error-handler";

const momentumStorage = new MomentumStorage();

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1), // Required to match DB schema
  description: z.string().optional(),
  color: z.string().optional(),
  isDefault: z.boolean().optional(),
});

const ParamsSchema = z.object({
  workspaceId: z.string().uuid(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "workspace_get" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("workspace_get", requestId);

  try {
    const workspace = await momentumStorage.getMomentumWorkspace(
      validated.params.workspaceId,
      userId,
    );
    if (!workspace) {
      return api.notFound("Workspace not found");
    }

    return api.success({ workspace });
  } catch (error) {
    return api.error("Failed to fetch workspace", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "workspace_update" },
  validation: {
    params: ParamsSchema,
    body: UpdateWorkspaceSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("workspace_update", requestId);

  try {
    // Handle optional fields properly for exactOptionalPropertyTypes
    const updateData: Partial<Omit<NewMomentumWorkspace, "userId">> = {};
    if (validated.body["name"] !== undefined) updateData["name"] = validated.body["name"];
    if (validated.body["description"] !== undefined)
      updateData["description"] = validated.body["description"];
    if (validated.body["color"] !== undefined) updateData["color"] = validated.body["color"];
    if (validated.body["isDefault"] !== undefined)
      updateData["isDefault"] = validated.body["isDefault"];

    await momentumStorage.updateMomentumWorkspace(validated.params.workspaceId, userId, updateData);
    const workspace = await momentumStorage.getMomentumWorkspace(
      validated.params.workspaceId,
      userId,
    );

    return api.success({ workspace });
  } catch (error) {
    return api.error("Failed to update workspace", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "workspace_delete" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("workspace_delete", requestId);

  try {
    await momentumStorage.deleteMomentumWorkspace(validated.params.workspaceId, userId);
    return api.success({ success: true });
  } catch (error) {
    return api.error("Failed to delete workspace", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
