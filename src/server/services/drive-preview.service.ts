import { DrivePreferencesSchema } from "@/server/db/business-schema/sync";

export interface DrivePreviewRequest {
  folderId?: string;
  includeSubfolders?: boolean;
  maxSizeMB?: number;
}

export class DrivePreviewService {
  /**
   * Generate Drive sync preview (SCAFFOLD)
   *
   * @param userId - The user ID
   * @param preferencesData - Drive preferences for preview
   * @returns Promise<never> - Currently throws as Drive is not implemented
   */
  static async generateDrivePreview(
    userId: string,
    preferencesData: unknown,
  ): Promise<never> {
    // Validate preferences to ensure proper error handling
    DrivePreferencesSchema.parse(preferencesData);

    // SCAFFOLD: Drive integration not yet implemented
    throw new Error("Drive integration coming soon");
  }
}