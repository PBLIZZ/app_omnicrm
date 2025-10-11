/** GET /api/user/export — Complete user data export for GDPR compliance (auth required). */
import { handleAuth } from "@/lib/api";
import {
  exportAllUserDataService,
  generateExportFilename,
  getExportHeaders,
} from "@/server/services/user-export.service";
import { UserExportRequestSchema, UserExportResponseSchema } from "@/server/db/business-schemas";
import { z } from "zod";

type UserExportResponse = z.infer<typeof UserExportResponseSchema>;

export const GET = handleAuth(
  UserExportRequestSchema,
  UserExportResponseSchema,
  async (_data, userId): Promise<UserExportResponse> => {
    try {
      // Export user data using service
      const exportData = await exportAllUserDataService(userId);

      // Map service result to API response schema
      // Note: integrations field maps to both syncPreferences and syncAuditLog in the API schema
      const response: UserExportResponse = {
        exportedAt: exportData.exportedAt,
        version: exportData.version,
        userId: exportData.userId,
        contacts: exportData.contacts,
        interactions: exportData.interactions,
        aiInsights: exportData.aiInsights,
        aiUsage: exportData.aiUsage,
        aiQuotas: exportData.aiQuotas,
        threads: exportData.threads,
        messages: exportData.messages,
        toolInvocations: exportData.toolInvocations,
        documents: exportData.documents,
        embeddings: exportData.embeddings,
        syncPreferences: exportData.integrations.items,
        syncAuditLog: { items: [], note: "Audit logs retained via observability pipeline" },
        rawEvents: exportData.rawEvents,
        jobs: exportData.jobs,
        summary: {
          ...exportData.summary,
          exportCompleteness: "partial" as const,
        },
        compliance: exportData.compliance,
      };

      return response;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Failed to export user data");
    }
  },
);
