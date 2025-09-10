import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { momentumStorage } from "@/server/storage/momentum.storage";
import { getDb } from "@/server/db/client";
import { momentumWorkspaces } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { ensureError } from "@/lib/utils/error-handler";
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
  aiContext: z.record(z.unknown()).optional(),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "momentum_list" },
})(async ({ userId, requestId }, request) => {
  const api = new ApiResponseBuilder("momentum_list", requestId);

  try {
    const { searchParams } = request.nextUrl;

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

    let momentums;
    if (withContacts) {
      momentums = await momentumStorage.getMomentumsWithContacts(userId);
    } else {
      momentums = await momentumStorage.getMomentums(userId, filters);
    }

    return api.success({ momentums });
  } catch (error) {
    return api.error("Failed to fetch momentums", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "momentum_create" },
  validation: {
    body: CreateMomentumSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("momentum_create", requestId);

  try {
    // Get workspaceId or create default workspace
    let workspaceId = validated.body.workspaceId;

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

    void logger.info("Creating momentum", {
      operation: "create_momentum",
      additionalData: {
        workspaceId,
        projectId: validated.body.projectId ?? null,
        title: validated.body.title.substring(0, 50), // Truncate for logs
      },
    });

    const momentum = await momentumStorage.createMomentum(userId, {
      momentumWorkspaceId: workspaceId,
      momentumProjectId: validated.body.projectId ?? null,
      parentMomentumId: validated.body.parentMomentumId ?? null,
      title: validated.body.title,
      description: validated.body.description ?? null,
      status: validated.body.status,
      priority: validated.body.priority,
      assignee: validated.body.assignee,
      source: validated.body.source,
      approvalStatus: validated.body.approvalStatus,
      taggedContacts: validated.body.taggedContacts ?? null,
      dueDate: validated.body.dueDate ? new Date(validated.body.dueDate) : null,
      estimatedMinutes: validated.body.estimatedMinutes ?? null,
      aiContext: validated.body.aiContext ?? null,
    });

    return api.success({ momentum });
  } catch (error) {
    return api.error("Failed to create momentum", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
