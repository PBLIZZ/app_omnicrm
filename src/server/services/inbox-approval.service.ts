/**
 * Inbox Approval Service for HITL (Human-in-the-Loop) Workflow
 *
 * This service manages the approval workflow for intelligently processed inbox items,
 * allowing users to review, modify, and approve AI-generated task breakdowns.
 */

import {
  createInboxRepository,
  createProductivityRepository,
  type CreateTask,
  type CreateProject,
} from "@repo";
import { logger } from "@/lib/observability";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import type { IntelligentProcessingResult } from "@/server/ai/connect/intelligent-inbox-processor";
import { z } from "zod";
import type { InboxItem } from "@repo";

// Type definitions for inbox item details
interface InboxItemDetails {
  intelligentProcessing?: IntelligentProcessingResult;
  processedAt?: string;
  status?: "pending_approval" | string;
}

// Type guard to check if details has intelligent processing
function hasIntelligentProcessing(details: unknown): details is InboxItemDetails {
  return (
    details !== null &&
    typeof details === "object" &&
    "intelligentProcessing" in details &&
    "status" in details
  );
}

// Approval workflow schemas
export const InboxApprovalRequestSchema = z.object({
  inboxItemId: z.string().uuid(),
  approvedTasks: z.array(
    z.object({
      taskId: z.string().uuid(),
      approved: z.boolean(),
      modifications: z
        .object({
          name: z.string().optional(),
          description: z.string().optional(),
          priority: z.enum(["low", "medium", "high"]).optional(),
          estimatedMinutes: z.number().optional(),
          dueDate: z.coerce.date().nullable().optional(),
          zoneUuid: z.string().uuid().optional(),
          projectId: z.string().uuid().nullable().optional(),
          parentTaskId: z.string().uuid().nullable().optional(),
        })
        .optional(),
    }),
  ),
  approvedProjects: z.array(
    z.object({
      projectId: z.string().uuid(),
      approved: z.boolean(),
      modifications: z
        .object({
          name: z.string().optional(),
          description: z.string().optional(),
          zoneId: z.number().int().optional(),
          status: z.enum(["active", "on_hold", "completed", "archived"]).optional(),
          dueDate: z.coerce.date().nullable().optional(),
        })
        .optional(),
    }),
  ),
  approvedHierarchies: z.array(
    z.object({
      parentTaskId: z.string().uuid(),
      subtaskIds: z.array(z.string().uuid()),
      relationshipType: z.enum(["task_subtask", "project_task"]),
      approved: z.boolean(),
    }),
  ),
  processingNotes: z.string().optional(),
});

export type InboxApprovalRequest = z.infer<typeof InboxApprovalRequestSchema>;

export const InboxApprovalResultSchema = z.object({
  createdTasks: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      projectId: z.string().uuid().nullable(),
      parentTaskId: z.string().uuid().nullable(),
    }),
  ),
  createdProjects: z.array(
    z.object({
      id: z.string().uuid(),
      name: z.string(),
      zoneId: z.number().int().nullable(),
    }),
  ),
  skippedTasks: z.array(z.string().uuid()),
  skippedProjects: z.array(z.string().uuid()),
  processingSummary: z.string(),
});

export type InboxApprovalResult = z.infer<typeof InboxApprovalResultSchema>;

/**
 * Store intelligent processing result for approval
 */
export async function storeIntelligentProcessingResult(
  userId: string,
  inboxItemId: string,
  result: IntelligentProcessingResult,
): Promise<void> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    // Store the processing result in the inbox item's details
    await inboxRepo.updateInboxItem(userId, inboxItemId, {
      details: {
        intelligentProcessing: result,
        processedAt: new Date().toISOString(),
        status: "pending_approval",
      },
    });

    await logger.info("Stored intelligent processing result for approval", {
      operation: "store_intelligent_processing",
      additionalData: {
        userId,
        inboxItemId,
        tasksCount: result.extractedTasks.length,
        projectsCount: result.suggestedProjects.length,
        requiresApproval: result.requiresApproval,
      },
    });
  } catch (error) {
    await logger.error("Failed to store intelligent processing result", {
      operation: "store_intelligent_processing",
      additionalData: { userId, inboxItemId, error },
    });
    throw new AppError(
      "Failed to store processing result for approval",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Get pending approval items for a user
 */
export async function getPendingApprovalItems(userId: string): Promise<
  Array<{
    inboxItem: InboxItem;
    processingResult: IntelligentProcessingResult;
  }>
> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    // Get inbox items with pending approval status
    const items = await inboxRepo.listInboxItems(userId, {
      status: ["unprocessed"], // We'll filter by details.status in the service
    });

    const pendingItems = items.items
      .filter(
        (item) =>
          hasIntelligentProcessing(item.details) && item.details.status === "pending_approval",
      )
      .map((item) => {
        // TypeScript knows details is InboxItemDetails here due to filter
        const details = item.details as InboxItemDetails;
        if (!details.intelligentProcessing) {
          throw new AppError(
            "Intelligent processing data missing",
            "MISSING_PROCESSING_DATA",
            "validation",
            false,
          );
        }
        return {
          inboxItem: item,
          processingResult: details.intelligentProcessing,
        };
      });

    return pendingItems;
  } catch (error) {
    await logger.error("Failed to get pending approval items", {
      operation: "get_pending_approval_items",
      additionalData: { userId, error },
    });
    throw new AppError("Failed to retrieve pending approval items", "DB_ERROR", "database", false);
  }
}

/**
 * Process approved tasks and projects
 */
export async function processApprovedItems(
  userId: string,
  approvalRequest: InboxApprovalRequest,
): Promise<InboxApprovalResult> {
  const db = await getDb();
  const productivityRepo = createProductivityRepository(db);
  const inboxRepo = createInboxRepository(db);

  try {
    const createdTasks: Array<{
      id: string;
      name: string;
      projectId: string | null;
      parentTaskId: string | null;
    }> = [];
    const createdProjects: Array<{ id: string; name: string; zoneId: number | null }> = [];
    const skippedTasks: string[] = [];
    const skippedProjects: string[] = [];

    // Get the original processing result
    const inboxItem = await inboxRepo.getInboxItem(userId, approvalRequest.inboxItemId);
    if (!inboxItem || !hasIntelligentProcessing(inboxItem.details)) {
      throw new AppError(
        "Inbox item or processing result not found",
        "NOT_FOUND",
        "database",
        false,
        404,
      );
    }

    const details = inboxItem.details as InboxItemDetails;
    const processingResult = details.intelligentProcessing;
    if (!processingResult) {
      throw new AppError("Processing result not found", "NOT_FOUND", "database", false, 404);
    }

    // Create approved projects first
    const projectIdMap = new Map<string, string>();
    for (const projectApproval of approvalRequest.approvedProjects) {
      if (!projectApproval.approved) {
        skippedProjects.push(projectApproval.projectId);
        continue;
      }

      const originalProject = processingResult.suggestedProjects.find(
        (p) => p.id === projectApproval.projectId,
      );
      if (!originalProject) {
        skippedProjects.push(projectApproval.projectId);
        continue;
      }

      const projectDueDate: Date | null =
        projectApproval.modifications?.dueDate || originalProject.dueDate;
      const projectData: Omit<CreateProject, "userId"> = {
        name: projectApproval.modifications?.name || originalProject.name,
        status: projectApproval.modifications?.status || originalProject.status,
        dueDate: projectDueDate?.toISOString().split("T")[0] ?? null,
        zoneUuid: projectApproval.modifications?.zoneUuid || originalProject.zoneUuid,
        details: {
          createdFromInbox: true,
          originalProjectId: originalProject.id,
          confidence: originalProject.confidence,
          reasoning: originalProject.reasoning,
          description: projectApproval.modifications?.description || originalProject.description,
        },
      };

      const createdProject = await productivityRepo.createProject(userId, projectData);
      projectIdMap.set(originalProject.id, createdProject.id);
      createdProjects.push({
        id: createdProject.id,
        name: createdProject.name,
        zoneUuid: createdProject.zoneUuid,
      });
    }

    // Create approved tasks
    const taskIdMap = new Map<string, string>();
    for (const taskApproval of approvalRequest.approvedTasks) {
      if (!taskApproval.approved) {
        skippedTasks.push(taskApproval.taskId);
        continue;
      }

      const originalTask = processingResult.extractedTasks.find(
        (t) => t.id === taskApproval.taskId,
      );
      if (!originalTask) {
        skippedTasks.push(taskApproval.taskId);
        continue;
      }

      // Resolve project ID if it was created
      let resolvedProjectId = originalTask.projectId;
      if (originalTask.projectId && projectIdMap.has(originalTask.projectId)) {
        const mappedProjectId = projectIdMap.get(originalTask.projectId);
        if (mappedProjectId) {
          resolvedProjectId = mappedProjectId;
        }
      }

      const dueDate = taskApproval.modifications?.dueDate || originalTask.dueDate;

      // Normalize priority: "urgent" was deprecated, map to "high"
      const rawPriority = taskApproval.modifications?.priority || originalTask.priority;
      const priority: "low" | "medium" | "high" = rawPriority === "urgent" ? "high" : (rawPriority as "low" | "medium" | "high");

      const taskData: Omit<CreateTask, "userId"> = {
        name: taskApproval.modifications?.name || originalTask.name,
        priority,
        dueDate: dueDate?.toISOString().split("T")[0] ?? null,
        projectId:
          taskApproval.modifications?.projectId !== undefined
            ? taskApproval.modifications.projectId
            : resolvedProjectId,
        zoneUuid: taskApproval.modifications?.zoneUuid ?? null,
        status: "todo" as const,
        completedAt: null,
        details: {
          createdFromInbox: true,
          originalTaskId: originalTask.id,
          confidence: originalTask.confidence,
          reasoning: originalTask.reasoning,
          description: taskApproval.modifications?.description || originalTask.description,
          estimatedMinutes:
            taskApproval.modifications?.estimatedMinutes || originalTask.estimatedMinutes,
        },
      };

      const createdTask = await productivityRepo.createTask(userId, taskData);
      taskIdMap.set(originalTask.id, createdTask.id);
      createdTasks.push({
        id: createdTask.id,
        name: createdTask.name,
        projectId: createdTask.projectId,
        parentTaskId: createdTask.parentTaskId,
      });
    }

    // Mark inbox item as processed
    await inboxRepo.markAsProcessed(userId, approvalRequest.inboxItemId);

    const result: InboxApprovalResult = {
      createdTasks,
      createdProjects,
      skippedTasks,
      skippedProjects,
      processingSummary: `Created ${createdTasks.length} tasks and ${createdProjects.length} projects. Skipped ${skippedTasks.length} tasks and ${skippedProjects.length} projects.`,
    };

    await logger.info("Processed approved inbox items", {
      operation: "process_approved_items",
      additionalData: {
        userId,
        inboxItemId: approvalRequest.inboxItemId,
        createdTasks: createdTasks.length,
        createdProjects: createdProjects.length,
        skippedTasks: skippedTasks.length,
        skippedProjects: skippedProjects.length,
      },
    });

    return result;
  } catch (error) {
    await logger.error("Failed to process approved items", {
      operation: "process_approved_items",
      additionalData: { userId, inboxItemId: approvalRequest.inboxItemId, error },
    });
    throw new AppError(
      error instanceof Error ? error.message : "Failed to process approved items",
      "DB_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Reject intelligent processing and fall back to manual processing
 */
export async function rejectIntelligentProcessing(
  userId: string,
  inboxItemId: string,
): Promise<void> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  try {
    // Clear the intelligent processing result and mark as unprocessed
    await inboxRepo.updateInboxItem(userId, inboxItemId, {
      details: null,
    });

    await logger.info("Rejected intelligent processing, reverted to manual", {
      operation: "reject_intelligent_processing",
      additionalData: { userId, inboxItemId },
    });
  } catch (error) {
    await logger.error("Failed to reject intelligent processing", {
      operation: "reject_intelligent_processing",
      additionalData: { userId, inboxItemId, error },
    });
    throw new AppError("Failed to reject intelligent processing", "DB_ERROR", "database", false);
  }
}
