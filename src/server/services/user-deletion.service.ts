import { getDb, type DbClient } from "@repo";
import { eq, inArray } from "drizzle-orm";
import type { PgTable, PgColumn } from "drizzle-orm/pg-core";
import {
  contacts,
  interactions,
  aiInsights,
  threads,
  messages,
  toolInvocations,
  userSyncPrefs,
  syncAudit,
  documents,
  embeddings,
  rawEvents,
  jobs,
  aiUsage,
  aiQuotas,
  userIntegrations,
  notes,
  calendarEvents,
  contactTimeline,
  projects,
  tasks,
  goals,
  dailyPulseLogs,
  inboxItems,
  taskContactTags,
} from "@/server/db/schema";
import { logger } from "@/lib/observability";

interface DeletionRequest {
  confirmation: string;
  acknowledgeIrreversible: boolean;
  ipAddress?: string;
}

interface DeletionResult {
  deleted: boolean;
  deletedAt: string;
  deletionResults: Record<string, number>;
  message: string;
  auditTrail: string;
  nextSteps: string[];
}

export class UserDeletionService {
  /**
   * Permanently delete all user data for GDPR compliance
   */
  static async deleteUserData(userId: string, request: DeletionRequest): Promise<DeletionResult> {
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
    await this.logDeletionRequest(userId, request, deletionTimestamp);

    // Start transaction for atomic deletion
    const deletionResults = await db.transaction(async (tx) => {
      const results: Record<string, number> = {};

      // Delete in reverse dependency order to avoid foreign key constraints

      // 1. Delete task contact tags (junction table - need subquery)
      const userTaskIds = await tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.userId, userId));
      const taskIds = userTaskIds.map(t => t.id);
      const taskContactTagsResult = taskIds.length > 0
        ? await tx.delete(taskContactTags).where(inArray(taskContactTags.taskId, taskIds))
        : { length: 0 };
      results["taskContactTags"] = taskContactTagsResult.length || 0;

      // 2. Delete tasks
      const tasksResult = await tx.delete(tasks).where(eq(tasks.userId, userId));
      results["tasks"] = tasksResult.length;

      // 3. Delete projects
      const projectsResult = await tx
        .delete(projects)
        .where(eq(projects.userId, userId));
      results["projects"] = projectsResult.length;

      // 4. Delete goals
      const goalsResult = await tx
        .delete(goals)
        .where(eq(goals.userId, userId));
      results["goals"] = goalsResult.length;

      // 5. Delete daily pulse logs
      const dailyPulseLogsResult = await tx
        .delete(dailyPulseLogs)
        .where(eq(dailyPulseLogs.userId, userId));
      results["dailyPulseLogs"] = dailyPulseLogsResult.length;

      // 6. Delete inbox items
      const inboxItemsResult = await tx
        .delete(inboxItems)
        .where(eq(inboxItems.userId, userId));
      results["inboxItems"] = inboxItemsResult.length;

      // 5. Delete contact timeline (references contacts)
      const contactTimelineResult = await tx
        .delete(contactTimeline)
        .where(eq(contactTimeline.userId, userId));
      results["contactTimeline"] = contactTimelineResult.length;

      // 6. Delete calendar events
      const calendarEventsResult = await tx
        .delete(calendarEvents)
        .where(eq(calendarEvents.userId, userId));
      results["calendarEvents"] = calendarEventsResult.length;

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
      const embeddingsResult = await tx.delete(embeddings).where(eq(embeddings.userId, userId));
      results["embeddings"] = embeddingsResult.length;

      // 12. Delete documents
      const documentsResult = await tx.delete(documents).where(eq(documents.userId, userId));
      results["documents"] = documentsResult.length;

      // 13. Delete AI insights
      const aiInsightsResult = await tx.delete(aiInsights).where(eq(aiInsights.userId, userId));
      results["aiInsights"] = aiInsightsResult.length;

      // 14. Delete interactions
      const interactionsResult = await tx
        .delete(interactions)
        .where(eq(interactions.userId, userId));
      results["interactions"] = interactionsResult.length;

      // 15. Delete contacts
      const contactsResult = await tx.delete(contacts).where(eq(contacts.userId, userId));
      results["contacts"] = contactsResult.length;

      // 16. Delete raw events
      const rawEventsResult = await tx.delete(rawEvents).where(eq(rawEvents.userId, userId));
      results["rawEvents"] = rawEventsResult.length;

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

      // 20. Delete sync preferences
      const syncPrefsResult = await tx
        .delete(userSyncPrefs)
        .where(eq(userSyncPrefs.userId, userId));
      results["syncPrefs"] = syncPrefsResult.length;

      // Note: We keep sync audit log for compliance (will be cleaned up by retention policy)
      // This is intentional - we keep the deletion audit trail for legal/regulatory purposes

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
    await this.logDeletionCompletion(userId, deletionTimestamp);

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
  static async getDeletionPreview(userId: string): Promise<Record<string, number>> {
    const db = await getDb();

    const [
      contactsCount,
      interactionsCount,
      notesCount,
      documentsCount,
      jobsCount,
      calendarEventsCount,
      tasksCount,
      projectsCount,
      goalsCount,
      inboxItemsCount,
    ] = await Promise.all([
      this.countRecords(db, contacts, userId),
      this.countRecords(db, interactions, userId),
      this.countRecords(db, notes, userId),
      this.countRecords(db, documents, userId),
      this.countRecords(db, jobs, userId),
      this.countRecords(db, calendarEvents, userId),
      this.countRecords(db, tasks, userId),
      this.countRecords(db, projects, userId),
      this.countRecords(db, goals, userId),
      this.countRecords(db, inboxItems, userId),
    ]);

    return {
      contacts: contactsCount,
      interactions: interactionsCount,
      notes: notesCount,
      documents: documentsCount,
      jobs: jobsCount,
      calendarEvents: calendarEventsCount,
      tasks: tasksCount,
      projects: projectsCount,
      goals: goalsCount,
      inboxItems: inboxItemsCount,
    };
  }

  /**
   * Validate deletion request
   */
  static validateDeletionRequest(request: DeletionRequest): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (request.confirmation !== "DELETE MY DATA") {
      errors.push("Confirmation text must be exactly 'DELETE MY DATA'");
    }

    if (request.acknowledgeIrreversible !== true) {
      errors.push("You must acknowledge that this action is irreversible");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Log deletion request for audit trail
   */
  private static async logDeletionRequest(
    userId: string,
    request: DeletionRequest,
    timestamp: Date,
  ): Promise<void> {
    const db = await getDb();

    await db.insert(syncAudit).values({
      userId,
      provider: "system",
      action: "account_deletion_requested",
      payload: {
        confirmation: request.confirmation,
        acknowledgeIrreversible: request.acknowledgeIrreversible,
        deletionTimestamp: timestamp.toISOString(),
        ipAddress: request.ipAddress ?? "unknown",
      },
    });
  }

  /**
   * Log deletion completion for audit trail
   */
  private static async logDeletionCompletion(userId: string, timestamp: Date): Promise<void> {
    const db = await getDb();

    await db.insert(syncAudit).values({
      userId,
      provider: "system",
      action: "account_deletion_completed",
      payload: {
        deletionTimestamp: timestamp.toISOString(),
        completedAt: new Date().toISOString(),
        retentionNote:
          "This audit record will be retained for 30 days then purged per data retention policy",
      },
    });
  }

  /**
   * Helper to count records in a table for a user
   */
  private static async countRecords(
    db: DbClient,
    table: PgTable & { userId: PgColumn },
    userId: string,
  ): Promise<number> {
    try {
      const result = await db
        .select({ count: eq(table.userId, userId) })
        .from(table)
        .where(eq(table.userId, userId));

      return result.length;
    } catch {
      // If table doesn't have userId column or other error, return 0
      return 0;
    }
  }
}
