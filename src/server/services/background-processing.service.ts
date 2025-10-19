/**
 * Background Processing Service for Intelligent Inbox
 *
 * This service handles batch processing of inbox items with intelligent AI processing.
 * Runs on a schedule (daily) to process all queued items.
 */

import {
  createInboxRepository,
  createZonesRepository,
  createProductivityRepository,
  type CreateProject,
  type CreateTask,
} from "@repo";
import { logger } from "@/lib/observability";
import { AppError } from "@/lib/errors/app-error";
import { getDb } from "@/server/db/client";
import { processIntelligentInboxItem } from "@/server/ai/connect/intelligent-inbox-processor";
import type { InboxProcessingContext } from "@/server/db/business-schemas";
import { assertOpenRouterConfigured } from "@/server/ai/providers/openrouter";

interface ProcessingStats {
  totalProcessed: number;
  successfulTasks: number;
  successfulProjects: number;
  failedItems: number;
  averageConfidence: number;
  processingTime: number;
}

interface ProcessingResult {
  inboxItemId: string;
  userId: string;
  success: boolean;
  tasksCreated: number;
  projectsCreated: number;
  confidence: number;
  error?: string;
}

/**
 * Process a single inbox item with intelligent processing
 */
async function processInboxItemIntelligently(
  userId: string,
  inboxItemId: string,
  rawText: string,
  processingContext: InboxProcessingContext,
): Promise<ProcessingResult> {
  const db = await getDb();
  const productivityRepo = createProductivityRepository(db);
  const inboxRepo = createInboxRepository(db);

  try {
    // Process with AI
    const aiResult = await processIntelligentInboxItem(userId, rawText, processingContext);

    let tasksCreated = 0;
    let projectsCreated = 0;

    // Create projects first
    const projectIdMap = new Map<string, string>();
    for (const suggestedProject of aiResult.suggestedProjects) {
      if (aiResult.overallConfidence >= 0.6) {
        // Only create high-confidence projects
        const dueDate: string | null = suggestedProject.dueDate
          ? (suggestedProject.dueDate.toISOString().split("T")[0] as string)
          : null;
        const projectData: Omit<CreateProject, "userId"> = {
          name: suggestedProject.name,
          status: suggestedProject.status,
          dueDate,
          zoneId: suggestedProject.zoneId,
          details: {
            createdFromInbox: true,
            originalProjectId: suggestedProject.id,
            confidence: suggestedProject.confidence,
            reasoning: suggestedProject.reasoning,
            description: suggestedProject.description,
          },
        };

        const createdProject = await productivityRepo.createProject(userId, projectData);
        projectIdMap.set(suggestedProject.id, createdProject.id);
        projectsCreated++;
      }
    }

    // Create tasks
    for (const suggestedTask of aiResult.extractedTasks) {
      if (aiResult.overallConfidence >= 0.5) {
        // Create tasks with medium+ confidence
        // Resolve project ID if it was created
        let resolvedProjectId = suggestedTask.projectId;
        if (suggestedTask.projectId && projectIdMap.has(suggestedTask.projectId)) {
          resolvedProjectId = projectIdMap.get(suggestedTask.projectId)!;
        }

        const taskDueDate: string | null = suggestedTask.dueDate
          ? (suggestedTask.dueDate.toISOString().split("T")[0] as string)
          : null;
        const taskData: Omit<CreateTask, "userId"> = {
          name: suggestedTask.name,
          priority: suggestedTask.priority,
          dueDate: taskDueDate,
          completedAt: null,
          projectId: resolvedProjectId,
          parentTaskId: suggestedTask.parentTaskId,
          status: "todo",
          details: {
            createdFromInbox: true,
            originalTaskId: suggestedTask.id,
            confidence: suggestedTask.confidence,
            reasoning: suggestedTask.reasoning,
            tags: suggestedTask.tags,
            description: suggestedTask.description,
            estimatedMinutes: suggestedTask.estimatedMinutes,
          },
        };

        await productivityRepo.createTask(userId, taskData);
        tasksCreated++;
      }
    }

    // Mark inbox item as processed
    await inboxRepo.markAsProcessed(userId, inboxItemId);

    await logger.info("Intelligent processing completed for inbox item", {
      operation: "background_intelligent_processing",
      additionalData: {
        userId,
        inboxItemId,
        tasksCreated,
        projectsCreated,
        confidence: aiResult.overallConfidence,
      },
    });

    return {
      inboxItemId,
      userId,
      success: true,
      tasksCreated,
      projectsCreated,
      confidence: aiResult.overallConfidence,
    };
  } catch (error) {
    await logger.error("Failed to process inbox item intelligently", {
      operation: "background_intelligent_processing",
      additionalData: { userId, inboxItemId, error },
    });

    return {
      inboxItemId,
      userId,
      success: false,
      tasksCreated: 0,
      projectsCreated: 0,
      confidence: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Process all unprocessed inbox items for a user
 */
export async function processUserInboxItems(userId: string): Promise<ProcessingStats> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);
  const zonesRepo = createZonesRepository(db);

  const startTime = Date.now();

  try {
    // Check if AI processing is available
    try {
      assertOpenRouterConfigured();
    } catch (error) {
      await logger.warn("AI processing not available for background processing", {
        operation: "background_processing",
        additionalData: { userId, error: error instanceof Error ? error.message : "Unknown error" },
      });
      return {
        totalProcessed: 0,
        successfulTasks: 0,
        successfulProjects: 0,
        failedItems: 0,
        averageConfidence: 0,
        processingTime: Date.now() - startTime,
      };
    }

    // Get unprocessed inbox items
    const unprocessedItems = await inboxRepo.getUnprocessedItems(userId, 100); // Process up to 100 items at once

    if (unprocessedItems.length === 0) {
      await logger.info("No unprocessed items found for user", {
        operation: "background_processing",
        additionalData: { userId },
      });
      return {
        totalProcessed: 0,
        successfulTasks: 0,
        successfulProjects: 0,
        failedItems: 0,
        averageConfidence: 0,
        processingTime: Date.now() - startTime,
      };
    }

    // Get zones for processing context
    const zones = await zonesRepo.listZones();
    const processingContext: InboxProcessingContext = { zones };

    // Process each item
    const results: ProcessingResult[] = [];
    let totalConfidence = 0;
    let successfulItems = 0;

    for (const item of unprocessedItems) {
      const result = await processInboxItemIntelligently(
        userId,
        item.id,
        item.rawText,
        processingContext,
      );

      results.push(result);

      if (result.success) {
        successfulItems++;
        totalConfidence += result.confidence;
      }
    }

    const stats: ProcessingStats = {
      totalProcessed: results.length,
      successfulTasks: results.reduce((sum, r) => sum + r.tasksCreated, 0),
      successfulProjects: results.reduce((sum, r) => sum + r.projectsCreated, 0),
      failedItems: results.filter((r) => !r.success).length,
      averageConfidence: successfulItems > 0 ? totalConfidence / successfulItems : 0,
      processingTime: Date.now() - startTime,
    };

    await logger.info("Background processing completed for user", {
      operation: "background_processing",
      additionalData: {
        userId,
        ...stats,
      },
    });

    return stats;
  } catch (error) {
    await logger.error("Background processing failed for user", {
      operation: "background_processing",
      additionalData: { userId, error },
    });

    throw new AppError(
      error instanceof Error ? error.message : "Background processing failed",
      "PROCESSING_ERROR",
      "system",
      false,
    );
  }
}

/**
 * Process all users' inbox items (for batch processing)
 */
export async function processAllUsersInboxItems(): Promise<{
  totalUsers: number;
  totalProcessed: number;
  totalTasks: number;
  totalProjects: number;
  failedUsers: number;
  processingTime: number;
}> {
  const db = await getDb();
  const inboxRepo = createInboxRepository(db);

  const startTime = Date.now();

  try {
    // Get all users who have unprocessed items
    const allItems = await inboxRepo.listInboxItems("", { status: ["unprocessed"] });
    const userIds = [...new Set(allItems.items.map((item) => item.userId))];

    let totalProcessed = 0;
    let totalTasks = 0;
    let totalProjects = 0;
    let failedUsers = 0;

    for (const userId of userIds) {
      try {
        const stats = await processUserInboxItems(userId);
        totalProcessed += stats.totalProcessed;
        totalTasks += stats.successfulTasks;
        totalProjects += stats.successfulProjects;
      } catch (error) {
        failedUsers++;
        await logger.error("Failed to process user inbox items", {
          operation: "batch_processing",
          additionalData: { userId, error },
        });
      }
    }

    const result = {
      totalUsers: userIds.length,
      totalProcessed,
      totalTasks,
      totalProjects,
      failedUsers,
      processingTime: Date.now() - startTime,
    };

    await logger.info("Batch processing completed for all users", {
      operation: "batch_processing",
      additionalData: result,
    });

    return result;
  } catch (error) {
    await logger.error("Batch processing failed", {
      operation: "batch_processing",
      additionalData: { error },
    });

    throw new AppError(
      error instanceof Error ? error.message : "Batch processing failed",
      "PROCESSING_ERROR",
      "system",
      false,
    );
  }
}
