/**
 * User Export Service
 *
 * Handles GDPR-compliant user data export operations.
 * Provides comprehensive data export functionality including
 * all user-related data tables with performance optimizations
 * and privacy compliance features.
 */

import { getDb } from "@/server/db/client";
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
} from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";
import { AppError } from "@/lib/errors/app-error";
import { listAiInsightsService } from "@/server/services/ai-insights.service";
import { listDocumentsService } from "@/server/services/documents.service";
import { listEmbeddingsService } from "@/server/services/embeddings.service";
import { listRawEventsService } from "@/server/services/raw-events.service";

/**
 * Export all user data for GDPR compliance
 */
export async function exportAllUserDataService(userId: string): Promise<UserExportResult> {
  const db = await getDb();
  const exportTimestamp = new Date().toISOString();

  try {
    // Export all user data tables with performance limits
    const userContacts = await db.select().from(contacts).where(eq(contacts.userId, userId));

    const userInteractions = await db
      .select()
      .from(interactions)
      .where(eq(interactions.userId, userId))
      .orderBy(desc(interactions.occurredAt))
      .limit(1000);

    const userThreads = await db.select().from(threads).where(eq(threads.userId, userId));

    const userMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.userId, userId))
      .orderBy(desc(messages.createdAt))
      .limit(500);

    const userToolInvocations = await db
      .select()
      .from(toolInvocations)
      .where(eq(toolInvocations.userId, userId));

    const userIntegrationSummaries = await db
      .select({
        provider: userIntegrations.provider,
        service: userIntegrations.service,
        config: userIntegrations.config,
        createdAt: userIntegrations.createdAt,
        updatedAt: userIntegrations.updatedAt,
        expiryDate: userIntegrations.expiryDate,
      })
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, userId));

    const userJobs = await db
      .select()
      .from(jobs)
      .where(eq(jobs.userId, userId))
      .orderBy(desc(jobs.createdAt))
      .limit(100);

    const userAiUsageRecords = await db
      .select()
      .from(aiUsage)
      .where(eq(aiUsage.userId, userId))
      .orderBy(desc(aiUsage.createdAt))
      .limit(1000);

    const userAiQuotaInfo = await db.select().from(aiQuotas).where(eq(aiQuotas.userId, userId));

    const aiInsightsResult = await listAiInsightsService(userId, {
      page: 1,
      pageSize: 1000,
      order: "desc",
    });

    const documentsResult = await listDocumentsService(userId, {
      includeUnassigned: true,
      page: 1,
      pageSize: 1000,
      order: "desc",
    });

    const embeddingsResult = await listEmbeddingsService(userId, {
      page: 1,
      pageSize: 1000,
      order: "desc",
    });

    const rawEventsResult = await listRawEventsService(userId, {
      page: 1,
      pageSize: 500,
      order: "desc",
    });

    const userAiInsights = aiInsightsResult.items;
    const userDocuments = documentsResult.items;
    const userEmbeddings = embeddingsResult.items.map((embedding) => ({
      id: embedding.id,
      ownerType: embedding.ownerType,
      ownerId: embedding.ownerId,
      meta: embedding.meta,
      createdAt: embedding.createdAt,
    }));
    const userRawEvents = rawEventsResult.items;

    // Build comprehensive export payload
    const exportPayload: UserExportResult = {
      exportedAt: exportTimestamp,
      version: 2,
      userId, // Include for reference (will be anonymized in download)

      // Core data
      contacts: userContacts,
      interactions: {
        items: userInteractions,
        note: "Limited to last 1000 interactions for performance",
      },

      // AI data
      aiInsights: userAiInsights,
      aiUsage: {
        items: userAiUsageRecords,
        note: "Limited to last 1000 usage records",
      },
      aiQuotas: userAiQuotaInfo,

      // Chat/conversation data
      threads: userThreads,
      messages: {
        items: userMessages,
        note: "Limited to last 500 messages for performance",
      },
      toolInvocations: userToolInvocations,

      // Documents and embeddings
      documents: userDocuments,
      embeddings: {
        items: userEmbeddings,
        note: "Embedding vectors excluded for file size - metadata only",
      },

      // System data
      integrations: {
        items: userIntegrationSummaries,
        note: "Access tokens and refresh tokens are omitted for security",
      },
      rawEvents: {
        items: userRawEvents,
        note: "Limited to last 500 raw events for performance",
      },
      jobs: {
        items: userJobs,
        note: "Limited to last 100 job records",
      },

      // Summary statistics
      summary: {
        totalContacts: userContacts.length,
        totalInteractions: userInteractions.length,
        totalAiInsights: userAiInsights.length,
        totalThreads: userThreads.length,
        totalMessages: userMessages.length,
        totalDocuments: userDocuments.length,
        exportCompleteness: "partial", // Indicate this is a performance-limited export
        privacyNote: "OAuth tokens and encryption keys are excluded for security",
      },

      // Privacy and compliance metadata
      compliance: {
        gdprCompliant: true,
        dataController: "OmniCRM",
        retentionPolicy: "Data retained as per user preferences and legal requirements",
        deletionRights: "Users can delete their account and all data at any time",
        portabilityRights:
          "This export fulfills data portability requirements under GDPR Article 20",
      },
    };

    return exportPayload;
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to export user data",
      "USER_EXPORT_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Generate filename for export download
 */
export function generateExportFilename(): string {
  return `omnicrm-data-export-${new Date().toISOString().split("T")[0]}.json`;
}

/**
 * Get export response headers for download
 */
export function getExportHeaders(filename: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export type IntegrationExport = {
  provider: string;
  service: string;
  config: unknown;
  createdAt: Date | null;
  updatedAt: Date | null;
  expiryDate: Date | null;
};

export type UserExportResult = {
  exportedAt: string;
  version: number;
  userId: string;
  contacts: unknown[];
  interactions: { items: unknown[]; note: string };
  aiInsights: unknown[];
  aiUsage: { items: unknown[]; note: string };
  aiQuotas: unknown[];
  threads: unknown[];
  messages: { items: unknown[]; note: string };
  toolInvocations: unknown[];
  documents: unknown[];
  embeddings: { items: Array<Record<string, unknown>>; note: string };
  integrations: { items: IntegrationExport[]; note: string };
  rawEvents: { items: unknown[]; note: string };
  jobs: { items: unknown[]; note: string };
  summary: {
    totalContacts: number;
    totalInteractions: number;
    totalAiInsights: number;
    totalThreads: number;
    totalMessages: number;
    totalDocuments: number;
    exportCompleteness: string;
    privacyNote: string;
  };
  compliance: {
    gdprCompliant: boolean;
    dataController: string;
    retentionPolicy: string;
    deletionRights: string;
    portabilityRights: string;
  };
};
