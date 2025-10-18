import { getDb, type DbClient } from "@/server/db/client";
import { count, eq, inArray } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import {
  contacts,
  interactions,
  threads,
  messages,
  toolInvocations,
  jobs,
  aiUsage,
  aiQuotas,
  userIntegrations,
  notes,
  projects,
  tasks,
  goals,
  dailyPulseLogs,
  inboxItems,
  taskContactTags,
  documents,
} from "@/server/db/schema";
import { logger } from "@/lib/observability";
import { deleteEmbeddingsForUserService } from "@/server/services/embeddings.service";
import { deleteDocumentsForUserService } from "@/server/services/documents.service";
import { deleteAiInsightsForUserService } from "@/server/services/ai-insights.service";
import { deleteRawEventsForUserService } from "@/server/services/raw-events.service";

export interface DeletionRequest {
  confirmation: string;
  acknowledgeIrreversible: boolean;
}

export interface DeletionResult {
  deleted: boolean;
  deletedAt: string;
  deletionResults: Record<string, number>;
  message: string;
  auditTrail: string;
  nextSteps: string[];
}

/**
 * Helper to count records in a table for a user
 */
async function countRecords(
  db: DbClient,
  table: PgTable & { userId: PgColumn },
  userId: string,
): Promise<number> {
  const rows = await db.select({ value: count() }).from(table).where(eq(table.userId, userId));

  return Number(rows[0]?.value ?? 0);
}

/**
 * Log deletion request for audit trail
 */
async function logDeletionRequest(
  userId: string,
  request: DeletionRequest,
  timestamp: Date,
): Promise<void> {
  await logger.info("Account deletion requested", {
    operation: "user_deletion_service.audit_requested",
    additionalData: {
      userId,
      confirmation: request.confirmation,
      acknowledgeIrreversible: request.acknowledgeIrreversible,
      deletionTimestamp: timestamp.toISOString(),
    },
  });
}

/**
 * Log deletion completion for audit trail
 */
async function logDeletionCompletion(userId: string, timestamp: Date): Promise<void> {
  await logger.info("Account deletion completed", {
    operation: "user_deletion_service.audit_completed",
    additionalData: {
      userId,
      deletionTimestamp: timestamp.toISOString(),
      completedAt: new Date().toISOString(),
      retentionNote: "Audit entries are retained via centralized logging per data retention policy",
    },
  });
}
/**
 * Permanently delete all user data for GDPR compliance
 */
export async function deleteUserDataService(
  userId: string,
  request: DeletionRequest,
): Promise<DeletionResult> {
  const deletionTimestamp = new Date();

  await logger.info("Starting account deletion process", {
    operation: "user_deletion_service.delete",
    additionalData: {
      userId,
      timestamp: deletionTimestamp.toISOString(),
    },
  });

  const db = await getDb();

  // Log deletion request to audit trail before deletion
  await logDeletionRequest(userId, request, deletionTimestamp);

  // Start transaction for atomic deletion
  const deletionResults = await db.transaction(async (tx) => {
    const txExecutor = tx as unknown as DbClient;
    const results: Record<string, number> = {};

    // Delete in reverse dependency order to avoid foreign key constraints

    // 1. Delete task contact tags (junction table - need subquery)
    const userTaskIds = await tx
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.userId, userId));
    const taskIds = userTaskIds.map((t) => t.id);
    const taskContactTagsResult =
      taskIds.length > 0
        ? await tx.delete(taskContactTags).where(inArray(taskContactTags.taskId, taskIds))
        : { length: 0 };
    results["taskContactTags"] = taskContactTagsResult.length || 0;

    // 2. Delete tasks
    const tasksResult = await tx.delete(tasks).where(eq(tasks.userId, userId));
    results["tasks"] = tasksResult.length;

    // 3. Delete projects
    const projectsResult = await tx.delete(projects).where(eq(projects.userId, userId));
    results["projects"] = projectsResult.length;

    // 4. Delete goals
    const goalsResult = await tx.delete(goals).where(eq(goals.userId, userId));
    results["goals"] = goalsResult.length;

    // 5. Delete daily pulse logs
    const dailyPulseLogsResult = await tx
      .delete(dailyPulseLogs)
      .where(eq(dailyPulseLogs.userId, userId));
    results["dailyPulseLogs"] = dailyPulseLogsResult.length;

    // 6. Delete inbox items
    const inboxItemsResult = await tx.delete(inboxItems).where(eq(inboxItems.userId, userId));
    results["inboxItems"] = inboxItemsResult.length;

    // 7. Delete notes (references contacts)
    const notesResult = await tx.delete(notes).where(eq(notes.userId, userId));
    results["notes"] = notesResult.length;

    // 8. Delete tool invocations (references messages)
    const toolInvocationResult = await tx
      .delete(toolInvocations)
      .where(eq(toolInvocations.userId, userId));
    results["toolInvocations"] = toolInvocationResult.length;

    // 9. Delete messages (references threads)
    const messagesResult = await tx.delete(messages).where(eq(messages.userId, userId));
    results["messages"] = messagesResult.length;

    // 10. Delete threads
    const threadsResult = await tx.delete(threads).where(eq(threads.userId, userId));
    results["threads"] = threadsResult.length;

    // 11. Delete embeddings (references documents/interactions)
    const embeddingsDeleted = await deleteEmbeddingsForUserService(userId, txExecutor);
    results["embeddings"] = embeddingsDeleted;

    // 12. Delete documents
    const documentsDeleted = await deleteDocumentsForUserService(userId, txExecutor);
    results["documents"] = documentsDeleted;

    // 13. Delete AI insights
    const aiInsightsDeleted = await deleteAiInsightsForUserService(userId, txExecutor);
    results["aiInsights"] = aiInsightsDeleted;

    // 14. Delete interactions
    const interactionsResult = await tx.delete(interactions).where(eq(interactions.userId, userId));
    results["interactions"] = interactionsResult.length;

    // 15. Delete contacts
    const contactsResult = await tx.delete(contacts).where(eq(contacts.userId, userId));
    results["contacts"] = contactsResult.length;

    // 16. Delete raw events
    const rawEventsDeleted = await deleteRawEventsForUserService(userId, txExecutor);
    results["rawEvents"] = rawEventsDeleted;

    // 17. Delete jobs
    const jobsResult = await tx.delete(jobs).where(eq(jobs.userId, userId));
    results["jobs"] = jobsResult.length;

    // 18. Delete AI usage and quotas
    const aiUsageResult = await tx.delete(aiUsage).where(eq(aiUsage.userId, userId));
    results["aiUsage"] = aiUsageResult.length;

    const aiQuotasResult = await tx.delete(aiQuotas).where(eq(aiQuotas.userId, userId));
    results["aiQuotas"] = aiQuotasResult.length;

    // 19. Delete user integrations (OAuth tokens)
    const integrationsResult = await tx
      .delete(userIntegrations)
      .where(eq(userIntegrations.userId, userId));
    results["integrations"] = integrationsResult.length;

    // Note: Detailed audit information is preserved via the observability pipeline
    // rather than a dedicated sync audit table in the refactored schema.

    return results;
  });

  // Log detailed deletion results
  await logger.info("Account deletion completed successfully", {
    operation: "user_deletion_service.delete",
    additionalData: {
      userId,
      deletionResults,
      completedAt: new Date().toISOString(),
    },
  });

  // Final audit log entry (will be retained for compliance)
  await logDeletionCompletion(userId, deletionTimestamp);

  return {
    deleted: true,
    deletedAt: deletionTimestamp.toISOString(),
    deletionResults,
    message: "Account and all associated data have been permanently deleted",
    auditTrail: "Deletion has been logged for compliance purposes",
    nextSteps: [
      "Your account deletion is complete and cannot be undone",
      "OAuth tokens have been revoked",
      "All personal data has been permanently removed",
      "Minimal audit logs will be retained for 30 days for legal compliance",
    ],
  };
}

/**
 * Get a preview of what data would be deleted (for confirmation UI)
 */
export async function getDeletionPreviewService(userId: string): Promise<Record<string, number>> {
  const db = await getDb();

  const [
    contactsCount,
    interactionsCount,
    notesCount,
    documentsCount,
    jobsCount,
    tasksCount,
    projectsCount,
    goalsCount,
    inboxItemsCount,
  ] = await Promise.all([
    countRecords(db, contacts, userId),
    countRecords(db, interactions, userId),
    countRecords(db, notes, userId),
    countRecords(db, documents, userId),
    countRecords(db, jobs, userId),
    countRecords(db, tasks, userId),
    countRecords(db, projects, userId),
    countRecords(db, goals, userId),
    countRecords(db, inboxItems, userId),
  ]);

  return {
    contacts: contactsCount,
    interactions: interactionsCount,
    notes: notesCount,
    documents: documentsCount,
    jobs: jobsCount,
    tasks: tasksCount,
    projects: projectsCount,
    goals: goalsCount,
    inboxItems: inboxItemsCount,
  };
}
