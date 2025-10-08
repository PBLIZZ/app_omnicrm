import { DrivePreferencesSchema } from "@/server/db/business-schemas";

export class DrivePreviewService {
  /**
   * Generate Drive sync preview (SCAFFOLD)
   *
   * @param _userId - The user ID (unused until Drive integration is implemented)
   * @param preferencesData - Drive preferences for preview
   * @returns Promise<never> - Currently throws as Drive is not implemented
   */
  static async generateDrivePreview(_userId: string, preferencesData: unknown): Promise<never> {
    // Validate preferences to ensure proper error handling
    DrivePreferencesSchema.parse(preferencesData);

    // SCAFFOLD: Drive integration not yet implemented
    throw new Error("Drive integration coming soon");
  }
}
