import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";

const UpdateMomentumSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignee: z.enum(["user", "ai"]).optional(),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).optional(),
  taggedContacts: z.array(z.string().uuid()).optional(),
  dueDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  actualMinutes: z.number().int().min(0).optional(),
});

const ParamsSchema = z.object({
  momentumId: z.string().uuid(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "momentum_get" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("momentum_get", requestId);

  try {
    const momentum = await momentumStorage.getMomentum(validated.params.momentumId, userId);
    if (!momentum) {
      return api.notFound("Momentum not found");
    }

    // Get sub-momentums if any
    const subMomentums = await momentumStorage.getSubMomentums(validated.params.momentumId, userId);

    return api.success({ momentum, subMomentums });
  } catch (error) {
    return api.error("Failed to fetch momentum", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const PUT = createRouteHandler({
  auth: true,
  rateLimit: { operation: "momentum_update" },
  validation: {
    body: UpdateMomentumSchema,
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("momentum_update", requestId);

  try {
    // Get original momentum for tracking changes
    const originalMomentum = await momentumStorage.getMomentum(validated.params.momentumId, userId);
    if (!originalMomentum) {
      return api.notFound("Momentum not found");
    }

    // Transform the data, converting date strings to Date objects where present
    const updateData: Parameters<typeof momentumStorage.updateMomentum>[2] = {};

    if (validated.body.title !== undefined) updateData.title = validated.body.title;
    if (validated.body.description !== undefined)
      updateData.description = validated.body.description;
    if (validated.body.status !== undefined) updateData.status = validated.body.status;
    if (validated.body.priority !== undefined) updateData.priority = validated.body.priority;
    if (validated.body.assignee !== undefined) updateData.assignee = validated.body.assignee;
    if (validated.body.approvalStatus !== undefined)
      updateData.approvalStatus = validated.body.approvalStatus;
    if (validated.body.taggedContacts !== undefined)
      updateData.taggedContacts = validated.body.taggedContacts;
    if (validated.body.estimatedMinutes !== undefined)
      updateData.estimatedMinutes = validated.body.estimatedMinutes;
    if (validated.body.actualMinutes !== undefined)
      updateData.actualMinutes = validated.body.actualMinutes;
    if (validated.body.dueDate !== undefined) updateData.dueDate = new Date(validated.body.dueDate);
    if (validated.body.completedAt !== undefined)
      updateData.completedAt = new Date(validated.body.completedAt);

    await momentumStorage.updateMomentum(validated.params.momentumId, userId, updateData);

    // Record action for AI training if significant changes
    if (
      originalMomentum.approvalStatus === "pending_approval" &&
      validated.body.approvalStatus === "approved"
    ) {
      await momentumStorage.createMomentumAction(userId, {
        momentumId: validated.params.momentumId,
        action: "edited",
        previousData: originalMomentum,
        newData: updateData,
      });
    }

    const momentum = await momentumStorage.getMomentum(validated.params.momentumId, userId);
    return api.success({ momentum });
  } catch (error) {
    return api.error("Failed to update momentum", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "momentum_delete" },
  validation: {
    params: ParamsSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("momentum_delete", requestId);

  try {
    const momentum = await momentumStorage.getMomentum(validated.params.momentumId, userId);
    if (!momentum) {
      return api.notFound("Momentum not found");
    }

    // Record deletion action for AI training
    await momentumStorage.createMomentumAction(userId, {
      momentumId: validated.params.momentumId,
      action: "deleted",
      previousData: momentum,
      newData: null,
    });

    await momentumStorage.deleteMomentum(validated.params.momentumId, userId);
    return api.success({ success: true });
  } catch (error) {
    return api.error("Failed to delete momentum", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
