import "@/lib/validation/zod-error-map";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { MomentumStorage } from "@/server/storage/momentum.storage";
import { getDb } from "@/server/db/client";
import { momentumWorkspaces } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { logger } from "@/lib/observability/unified-logger";
import { ensureError } from "@/lib/utils/error-handler";

const momentumStorage = new MomentumStorage();

const CreateTaskSchema = z.object({
  title: z.string().min(1, "Task title is required"),
  description: z.string().optional(),
  projectId: z.string().uuid().optional(), // Optional - tasks can exist in inbox without project
  workspaceId: z.string().uuid().optional(), // Optional - for zone filtering only
  parentTaskId: z.string().uuid().optional(),
  status: z.enum(["todo", "in_progress", "waiting", "done", "cancelled"]).default("todo"),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  assignee: z.enum(["user", "ai"]).default("user"),
  source: z.enum(["user", "ai_generated"]).default("user"),
  approvalStatus: z.enum(["pending_approval", "approved", "rejected"]).default("approved"),
  taggedContacts: z.array(z.string().uuid()).optional(),
  dueDate: z.string().datetime().optional(),
  estimatedMinutes: z.number().int().min(0).optional(),
  aiContext: z.record(z.string(), z.unknown()).optional(),
});

const taskFiltersSchema = z.object({
  workspaceId: z.string().uuid().optional(),
  projectId: z.string().uuid().optional(),
  status: z.string().optional(),
  assignee: z.string().optional(),
  approvalStatus: z.string().optional(),
  parentTaskId: z.string().uuid().nullable().optional(),
  withContacts: z.boolean().default(false),
});

export const GET = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_list" },
  validation: {
    query: taskFiltersSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("tasks.list", requestId);

  const { withContacts, parentTaskId, ...filters } = validated.query;

  // Transform parentTaskId to parentMomentumId for the storage layer
  const storageFilters = Object.fromEntries(
    Object.entries({ ...filters, parentMomentumId: parentTaskId }).filter(
      ([, value]) => value !== undefined,
    ),
  );

  try {
    let tasks;
    if (withContacts) {
      tasks = await momentumStorage.getMomentumsWithContacts(userId);
    } else {
      tasks = await momentumStorage.getMomentums(userId, storageFilters);
    }
    return api.success({ tasks });
  } catch (error) {
    await logger.error(
      "Error fetching tasks",
      {
        operation: "tasks.list",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          filters,
        },
      },
      ensureError(error),
    );
    return api.error("Internal server error", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "tasks_create" },
  validation: {
    body: CreateTaskSchema,
  },
})(async ({ userId, validated, requestId }) => {
  const api = new ApiResponseBuilder("tasks.create", requestId);

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
            description: "Auto-created workspace for tasks",
            isDefault: true,
          })
          .returning();
        defaultWorkspace = newWorkspace[0];
      }

      workspaceId = defaultWorkspace?.id;
    }

    void logger.info("Creating task", {
      operation: "create_task",
      additionalData: {
        workspaceId,
        projectId: validated.body.projectId ?? null,
        title: validated.body.title.substring(0, 50), // Truncate for logs
      },
    });

    const task = await momentumStorage.createMomentum(userId, {
      momentumWorkspaceId: workspaceId,
      momentumProjectId: validated.body.projectId ?? null,
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
    return api.success({ task });
  } catch (error) {
    await logger.error(
      "Error creating task",
      {
        operation: "tasks.create",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          title: validated.body?.title?.substring(0, 50) ?? "unknown",
        },
      },
      ensureError(error),
    );
    return api.error("Internal server error", "INTERNAL_ERROR", undefined, ensureError(error));
  }
});
