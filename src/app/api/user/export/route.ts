/** GET /api/user/export — Complete user data export for GDPR compliance (auth required). */
import { handleAuth } from "@/lib/api";
import { UserExportService } from "@/server/services/user-export.service";
import { 
  UserExportRequestSchema, 
  UserExportResponseSchema,
  type UserExportResponse 
} from "@/server/db/business-schemas";

export const GET = handleAuth(
  UserExportRequestSchema,
  UserExportResponseSchema,
  async (_data, userId): Promise<UserExportResponse> => {
    // Export user data using service
    const exportData = await UserExportService.exportAllUserData(userId);

    return exportData;
  }
);
