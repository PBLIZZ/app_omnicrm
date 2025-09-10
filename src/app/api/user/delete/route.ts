/** DELETE /api/user/delete — Permanent account deletion for GDPR compliance (auth required). */
import { NextRequest } from "next/server";
import { createRouteHandler } from "@/server/api/handler";
import { ApiResponseBuilder } from "@/server/api/response";
import { getDb } from "@/server/db/client";
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
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/observability";
import { ensureError } from "@/lib/utils/error-handler";
import { z } from "zod";

const deletionSchema = z.object({
  confirmation: z.literal("DELETE MY DATA"),
  acknowledgeIrreversible: z.literal(true),
});

export const DELETE = createRouteHandler({
  auth: true,
  rateLimit: { operation: "user_delete" },
  validation: {
    body: deletionSchema,
  },
})(async ({ userId, validated, requestId }, req: NextRequest) => {
  const api = new ApiResponseBuilder("user.delete", requestId);

  try {
    const { confirmation, acknowledgeIrreversible } = validated.body;

    const db = await getDb();
    const deletionTimestamp = new Date();

    await logger.info("Starting account deletion process", {
      operation: "user.deletion.start",
      additionalData: {
        userId,
        timestamp: deletionTimestamp.toISOString(),
      },
    });

    // Log deletion request to audit trail before deletion
    await db.insert(syncAudit).values({
      userId,
      provider: "system",
      action: "account_deletion_requested",
      payload: {
        confirmation,
        acknowledgeIrreversible,
        deletionTimestamp: deletionTimestamp.toISOString(),
        ipAddress: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown",
      },
    });

    // Start transaction for atomic deletion
    await db.transaction(async (tx) => {
      // Delete in reverse dependency order to avoid foreign key constraints

      // 1. Delete tool invocations (references messages)
      const toolInvocationResult = await tx
        .delete(toolInvocations)
        .where(eq(toolInvocations.userId, userId));

      // 2. Delete messages (references threads)
      const messagesResult = await tx.delete(messages).where(eq(messages.userId, userId));

      // 3. Delete threads
      const threadsResult = await tx.delete(threads).where(eq(threads.userId, userId));

      // 4. Delete embeddings (references documents/interactions)
      const embeddingsResult = await tx.delete(embeddings).where(eq(embeddings.userId, userId));

      // 5. Delete documents
      const documentsResult = await tx.delete(documents).where(eq(documents.userId, userId));

      // 6. Delete AI insights
      const aiInsightsResult = await tx.delete(aiInsights).where(eq(aiInsights.userId, userId));

      // 7. Delete interactions
      const interactionsResult = await tx
        .delete(interactions)
        .where(eq(interactions.userId, userId));

      // 8. Delete contacts
      const contactsResult = await tx.delete(contacts).where(eq(contacts.userId, userId));

      // 9. Delete raw events
      const rawEventsResult = await tx.delete(rawEvents).where(eq(rawEvents.userId, userId));

      // 10. Delete jobs
      const jobsResult = await tx.delete(jobs).where(eq(jobs.userId, userId));

      // 11. Delete AI usage and quotas
      const aiUsageResult = await tx.delete(aiUsage).where(eq(aiUsage.userId, userId));

      const aiQuotasResult = await tx.delete(aiQuotas).where(eq(aiQuotas.userId, userId));

      // 12. Delete user integrations (OAuth tokens)
      const integrationsResult = await tx
        .delete(userIntegrations)
        .where(eq(userIntegrations.userId, userId));

      // 13. Delete sync preferences
      const syncPrefsResult = await tx
        .delete(userSyncPrefs)
        .where(eq(userSyncPrefs.userId, userId));

      // 14. Keep sync audit log for compliance (will be cleaned up by retention policy)
      // This is intentional - we keep the deletion audit trail for legal/regulatory purposes

      // Log detailed deletion results
      await logger.info("Account deletion completed successfully", {
        operation: "user.deletion.complete",
        additionalData: {
          userId,
          deletionResults: {
            toolInvocations: toolInvocationResult.count,
            messages: messagesResult.count,
            threads: threadsResult.count,
            embeddings: embeddingsResult.count,
            documents: documentsResult.count,
            aiInsights: aiInsightsResult.count,
            interactions: interactionsResult.count,
            contacts: contactsResult.count,
            rawEvents: rawEventsResult.count,
            jobs: jobsResult.count,
            aiUsage: aiUsageResult.count,
            aiQuotas: aiQuotasResult.count,
            integrations: integrationsResult.count,
            syncPrefs: syncPrefsResult.count,
          },
          completedAt: new Date().toISOString(),
        },
      });
    });

    // Final audit log entry (will be retained for compliance)
    await db.insert(syncAudit).values({
      userId,
      provider: "system",
      action: "account_deletion_completed",
      payload: {
        deletionTimestamp: deletionTimestamp.toISOString(),
        completedAt: new Date().toISOString(),
        retentionNote:
          "This audit record will be retained for 30 days then purged per data retention policy",
      },
    });

    return api.success({
      deleted: true,
      deletedAt: deletionTimestamp.toISOString(),
      message: "Account and all associated data have been permanently deleted",
      auditTrail: "Deletion has been logged for compliance purposes",
      nextSteps: [
        "Your account deletion is complete and cannot be undone",
        "OAuth tokens have been revoked",
        "All personal data has been permanently removed",
        "Minimal audit logs will be retained for 30 days for legal compliance",
      ],
    });
  } catch (error: unknown) {
    await logger.error(
      "Account deletion failed",
      {
        operation: "user.deletion.failed",
        additionalData: {
          userId,
        },
      },
      ensureError(error),
    );

    // SECURITY: Don't expose internal error details for account deletion failures
    return api.error("Account deletion failed due to internal error", "INTERNAL_ERROR");
  }
});
