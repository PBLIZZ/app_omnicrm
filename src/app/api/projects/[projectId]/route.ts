import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { MomentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";
import type { NewMomentumProject } from "@/server/db/schema";
import { ensureError } from "@/lib/utils/error-handler";

const momentumStorage = new MomentumStorage();

const UpdateProjectSchema = z.object({
  name: z.string().min(1), // Required to match DB schema
  description: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(["active", "completed", "on_hold", "cancelled"]).optional(),
  dueDate: z.string().datetime().optional(),
});

const ParamsSchema = z.object({
  projectId: z.string().uuid(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "project_get" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("project_get", requestId);

  try {
    const project = await momentumStorage.getMomentumProject(validated.params.projectId, userId);
    if (!project) {
      return api.notFound("Project not found");
    }

    return api.success({ project });
  } catch (error) {
    return api.error("Failed to fetch project", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "project_update" },
  validation: {
    params: ParamsSchema,
    body: UpdateProjectSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("project_update", requestId);

  try {
    // Handle optional fields properly for exactOptionalPropertyTypes
    const updateData: Partial<Omit<NewMomentumProject, "userId">> = {};
    if (validated.body["name"] !== undefined) updateData["name"] = validated.body["name"];
    if (validated.body["description"] !== undefined)
      updateData["description"] = validated.body["description"];
    if (validated.body["color"] !== undefined) updateData["color"] = validated.body["color"];
    if (validated.body["status"] !== undefined) updateData["status"] = validated.body["status"];
    if (validated.body["dueDate"] !== undefined) {
      updateData["dueDate"] = new Date(validated.body["dueDate"]);
    }

    await momentumStorage.updateMomentumProject(validated.params.projectId, userId, updateData);
    const project = await momentumStorage.getMomentumProject(validated.params.projectId, userId);

    return api.success({ project });
  } catch (error) {
    return api.error("Failed to update project", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "project_delete" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("project_delete", requestId);

  try {
    await momentumStorage.deleteMomentumProject(validated.params.projectId, userId);
    return api.success({ success: true });
  } catch (error) {
    return api.error("Failed to delete project", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
