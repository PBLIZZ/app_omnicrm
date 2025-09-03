import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { z } from "zod";

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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ momentumId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { momentumId } = await params;

  try {
    const momentum = await momentumStorage.getMomentum(momentumId, userId);
    if (!momentum) {
      return err(404, "momentum_not_found");
    }

    // Get sub-momentums if any
    const subMomentums = await momentumStorage.getSubMomentums(momentumId, userId);
    
    return ok({ momentum, subMomentums });
  } catch (error) {
    console.error("Error fetching momentum:", error);
    return err(500, "internal_server_error");
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ momentumId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { momentumId } = await params;
  
  const body = (await safeJson<unknown>(req)) ?? {};
  const parsed = UpdateMomentumSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    // Get original momentum for tracking changes
    const originalMomentum = await momentumStorage.getMomentum(momentumId, userId);
    if (!originalMomentum) {
      return err(404, "momentum_not_found");
    }

    // Transform the data, converting date strings to Date objects where present
    const updateData: Parameters<typeof momentumStorage.updateMomentum>[2] = {};
    
    if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
    if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.priority !== undefined) updateData.priority = parsed.data.priority;
    if (parsed.data.assignee !== undefined) updateData.assignee = parsed.data.assignee;
    if (parsed.data.approvalStatus !== undefined) updateData.approvalStatus = parsed.data.approvalStatus;
    if (parsed.data.taggedContacts !== undefined) updateData.taggedContacts = parsed.data.taggedContacts;
    if (parsed.data.estimatedMinutes !== undefined) updateData.estimatedMinutes = parsed.data.estimatedMinutes;
    if (parsed.data.actualMinutes !== undefined) updateData.actualMinutes = parsed.data.actualMinutes;
    if (parsed.data.dueDate !== undefined) updateData.dueDate = new Date(parsed.data.dueDate);
    if (parsed.data.completedAt !== undefined) updateData.completedAt = new Date(parsed.data.completedAt);
    
    await momentumStorage.updateMomentum(momentumId, userId, updateData);

    // Record action for AI training if significant changes
    if (originalMomentum.approvalStatus === "pending_approval" && parsed.data.approvalStatus === "approved") {
      await momentumStorage.createMomentumAction(userId, {
        momentumId,
        action: "edited",
        previousData: originalMomentum,
        newData: updateData,
      });
    }

    const momentum = await momentumStorage.getMomentum(momentumId, userId);
    return ok({ momentum });
  } catch (error) {
    console.error("Error updating momentum:", error);
    return err(500, "internal_server_error");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ momentumId: string }> }
): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (e: unknown) {
    const error = e as { message?: string; status?: number };
    return err(error?.status ?? 401, error?.message ?? "unauthorized");
  }

  const { momentumId } = await params;

  try {
    const momentum = await momentumStorage.getMomentum(momentumId, userId);
    if (!momentum) {
      return err(404, "momentum_not_found");
    }

    // Record deletion action for AI training
    await momentumStorage.createMomentumAction(userId, {
      momentumId,
      action: "deleted",
      previousData: momentum,
      newData: null,
    });

    await momentumStorage.deleteMomentum(momentumId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting momentum:", error);
    return err(500, "internal_server_error");
  }
}