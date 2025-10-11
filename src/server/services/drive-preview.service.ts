import type { DrivePreferences } from "@/server/db/business-schemas";

export class DrivePreviewService {
  /**
   * Generate Drive sync preview (SCAFFOLD)
   *
   * @param _userId - The user ID (unused until Drive integration is implemented)
   * @param preferences - Validated Drive preferences (validated by route layer)
   * @returns Promise<never> - Currently throws as Drive is not implemented
   */
  static async generateDrivePreview(_userId: string, _preferences: DrivePreferences): Promise<never> {
    // No validation - route layer already validated with DrivePreferencesSchema
    // Service layer receives typed, validated data
    
    // SCAFFOLD: Drive integration not yet implemented
    throw new Error("Drive integration coming soon");
  }
}
