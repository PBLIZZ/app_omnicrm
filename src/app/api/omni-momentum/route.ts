import { NextRequest } from "next/server";
import "@/lib/zod-error-map";
import { getServerUserId } from "@/server/auth/user";
import { ok, err, safeJson } from "@/lib/api/http";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { getDb } from "@/server/db/client";
import { momentumWorkspaces } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/observability/unified-logger";

const CreateMomentumSchema = z.object({
  title: z.string().min(1, "Momentum title is required"),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(), // Optional - momentums can exist in inbox without project
  workspaceId: z.string().uuid().optional(), // Optional - for zone filtering only
  parentMomentumId: z.string().uuid().optional(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignee: z.enum(["user", "ai"]).default("user"),
  source: z.enum(["user", "ai_generated"]).default("user"),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).default("approved"),
  taggedContacts: z.array(z.string().uuid()).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  aiContext: z.any().optional(),
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
  const filters: {
    workspaceId?: string;
    projectId?: string;
    status?: string;
    assignee?: string;
    approvalStatus?: string;
    parentMomentumId?: string | null;
  } = {};

  const workspaceId = searchParams.get("workspaceId");
  if (workspaceId) filters.workspaceId = workspaceId;

  const projectId = searchParams.get("projectId");
  if (projectId) filters.projectId = projectId;

  const status = searchParams.get("status");
  if (status) filters.status = status;

  const assignee = searchParams.get("assignee");
  if (assignee) filters.assignee = assignee;

  const approvalStatus = searchParams.get("approvalStatus");
  if (approvalStatus) filters.approvalStatus = approvalStatus;
  if (searchParams.has("parentMomentumId")) {
    filters.parentMomentumId = searchParams.get("parentMomentumId") ?? null;
  }

  const withContacts = searchParams.get("withContacts") === "true";

  try {
    let momentums;
    if (withContacts) {
      momentums = await momentumStorage.getMomentumsWithContacts(userId);
    } else {
      momentums = await momentumStorage.getMomentums(userId, filters);
    }
    return ok({ momentums });
  } catch (error) {
    console.error("Error fetching momentums:", error);
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
  const parsed = CreateMomentumSchema.safeParse(body);
  if (!parsed.success) {
    return err(400, "invalid_body", parsed.error.flatten());
  }

  try {
    // Get workspaceId or create default workspace
    let workspaceId = parsed.data.workspaceId;

    if (!workspaceId) {
      const db = await getDb();
      let defaultWorkspace = await db.query.momentumWorkspaces.findFirst({
        where: and(eq(momentumWorkspaces.userId, userId), eq(momentumWorkspaces.isDefault, true)),
      });

      if (!defaultWorkspace) {
        // Create default workspace
        const newWorkspace = await db
          .insert(momentumWorkspaces)
          .values({
            userId,
            name: "Default Workspace",
            description: "Auto-created workspace for momentum",
            isDefault: true,
          })
          .returning();
        defaultWorkspace = newWorkspace[0] ?? undefined;
      }

      workspaceId = defaultWorkspace?.id;
    }

    logger.info("Creating momentum", {
      operation: "create_momentum",
      workspaceId,
      projectId: parsed.data.projectId ?? null,
      title: parsed.data.title.substring(0, 50), // Truncate for logs
    });

    const momentum = await momentumStorage.createMomentum(userId, {
      momentumWorkspaceId: workspaceId,
      momentumProjectId: parsed.data.projectId ?? null,
      parentMomentumId: parsed.data.parentMomentumId ?? null,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: parsed.data.status,
      priority: parsed.data.priority,
      assignee: parsed.data.assignee,
      source: parsed.data.source,
      approvalStatus: parsed.data.approvalStatus,
      taggedContacts: parsed.data.taggedContacts ?? null,
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : null,
      estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      aiContext: parsed.data.aiContext ?? null,
    });
    return ok({ momentum });
  } catch (error) {
    console.error("Error creating momentum:", error);
    return err(500, "internal_server_error");
  }
}
