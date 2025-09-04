import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { MomentumStorage } from "@/server/storage/momentum.storage";

const momentumStorage = new MomentumStorage();
import { z } from "zod";
import type { NewMomentumWorkspace } from "@/server/db/schema";

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1), // Required to match DB schema
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
    const workspace = await momentumStorage.getMomentumWorkspace(workspaceId, userId);
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
    // Handle optional fields properly for exactOptionalPropertyTypes
    const updateData: Partial<Omit<NewMomentumWorkspace, 'userId'>> = {};
    if (parsed.data['name'] !== undefined) updateData['name'] = parsed.data['name'];
    if (parsed.data['description'] !== undefined) updateData['description'] = parsed.data['description'];
    if (parsed.data['color'] !== undefined) updateData['color'] = parsed.data['color'];
    if (parsed.data['isDefault'] !== undefined) updateData['isDefault'] = parsed.data['isDefault'];
    
    await momentumStorage.updateMomentumWorkspace(workspaceId, userId, updateData);
    const workspace = await momentumStorage.getMomentumWorkspace(workspaceId, userId);
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
    await momentumStorage.deleteMomentumWorkspace(workspaceId, userId);
    return ok({ success: true });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return err(500, "internal_server_error");
  }
}