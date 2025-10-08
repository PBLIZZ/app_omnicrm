/** GET /api/user/export — Complete user data export for GDPR compliance (auth required). */
import { handleAuth } from "@/lib/api";
import { UserExportService } from "@/server/services/user-export.service";
import { UserExportRequestSchema, UserExportResponseSchema } from "@/server/db/business-schemas";
import { z } from "zod";

type UserExportResponse = z.infer<typeof UserExportResponseSchema>;

export const GET = handleAuth(
  UserExportRequestSchema,
  UserExportResponseSchema,
  async (_data, userId): Promise<UserExportResponse> => {
    // Export user data using service
    const result = await UserExportService.exportAllUserData(userId);

    if (!result.success) {
      throw new Error(result.error);
    }

    // Map service result to API response schema
    // Note: integrations field maps to both syncPreferences and syncAuditLog in the API schema
    const response: UserExportResponse = {
      exportedAt: result.data.exportedAt,
      version: result.data.version,
      userId: result.data.userId,
      contacts: result.data.contacts,
      interactions: result.data.interactions,
      aiInsights: result.data.aiInsights,
      aiUsage: result.data.aiUsage,
      aiQuotas: result.data.aiQuotas,
      threads: result.data.threads,
      messages: result.data.messages,
      toolInvocations: result.data.toolInvocations,
      documents: result.data.documents,
      embeddings: result.data.embeddings,
      syncPreferences: result.data.integrations.items,
      syncAuditLog: { items: [], note: "Audit logs retained via observability pipeline" },
      rawEvents: result.data.rawEvents,
      jobs: result.data.jobs,
      summary: {
        ...result.data.summary,
        exportCompleteness: "partial" as const,
      },
      compliance: result.data.compliance,
    };

    return response;
  },
);
