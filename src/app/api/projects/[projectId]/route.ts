import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { MomentumStorage } from "@/server/storage/momentum.storage";

const momentumStorage = new MomentumStorage();
import { z } from "zod";
import type { NewMomentumProject } from "@/server/db/schema";

const UpdateProjectSchema = z.object({
  name: z.string().min(1), // Required to match DB schema
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
    const project = await momentumStorage.getMomentumProject(projectId, userId);
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
    // Handle optional fields properly for exactOptionalPropertyTypes
    const updateData: Partial<Omit<NewMomentumProject, 'userId'>> = {};
    if (parsed.data['name'] !== undefined) updateData['name'] = parsed.data['name'];
    if (parsed.data['description'] !== undefined) updateData['description'] = parsed.data['description'];
    if (parsed.data['color'] !== undefined) updateData['color'] = parsed.data['color'];
    if (parsed.data['status'] !== undefined) updateData['status'] = parsed.data['status'];
    if (parsed.data['dueDate'] !== undefined) {
      updateData['dueDate'] = new Date(parsed.data['dueDate']);
    }
    
    await momentumStorage.updateMomentumProject(projectId, userId, updateData);
    const project = await momentumStorage.getMomentumProject(projectId, userId);
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
    await momentumStorage.deleteMomentumProject(projectId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting project:", error);
    return err(500, "internal_server_error");
  }
}