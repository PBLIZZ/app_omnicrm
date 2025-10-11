/** GET /api/user/export — Complete user data export for GDPR compliance (auth required). */
import { handleAuth } from "@/lib/api";
import { UserExportService } from "@/server/services/user-export.service";
import { UserExportRequestSchema, UserExportResponseSchema } from "@/server/db/business-schemas";

export const GET = handleAuth(
  UserExportRequestSchema,
  UserExportResponseSchema,
  async (data, userId) => {
    // Export user data using service
    const exportData = await UserExportService.exportUserData(userId);

    return exportData;
  }
);
