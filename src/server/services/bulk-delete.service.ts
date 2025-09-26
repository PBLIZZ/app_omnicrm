import { ContactsRepository } from "@repo";
import { logger } from "@/lib/observability";

export interface BulkDeleteRequest {
  ids: string[];
}

export interface BulkDeleteResponse {
  deleted: number;
  message: string;
}

export class BulkDeleteService {
  /**
   * Execute bulk deletion of contacts/clients
   *
   * @param userId - The authenticated user ID
   * @param request - Bulk delete request with IDs
   * @returns Promise<BulkDeleteResponse> - Deletion results
   */
  static async deleteContacts(
    userId: string,
    request: BulkDeleteRequest,
  ): Promise<BulkDeleteResponse> {
    const { ids } = request;

    // Execute bulk deletion via repository
    const deletedCount = await ContactsRepository.deleteContactsByIds(userId, ids);

    // Generate appropriate response message
    const message = this.generateResponseMessage(deletedCount);

    // Log successful bulk deletion operation
    await this.logBulkDeletion(userId, deletedCount, ids.length);

    return {
      deleted: deletedCount,
      message,
    };
  }

  /**
   * Generate user-friendly response message based on deletion results
   *
   * @param deletedCount - Number of items actually deleted
   * @returns string - User-friendly message
   */
  private static generateResponseMessage(deletedCount: number): string {
    if (deletedCount === 0) {
      return "No clients found to delete";
    }

    const clientWord = deletedCount === 1 ? "client" : "clients";
    return `Successfully deleted ${deletedCount} ${clientWord}`;
  }

  /**
   * Log bulk deletion operation for audit purposes
   *
   * @param userId - The user ID (anonymized for logging)
   * @param deletedCount - Number of items deleted
   * @param requestedCount - Number of items requested for deletion
   */
  private static async logBulkDeletion(
    userId: string,
    deletedCount: number,
    requestedCount: number,
  ): Promise<void> {
    await logger.info("Bulk deleted OmniClients", {
      operation: "omni_clients_bulk_delete",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        deletedCount,
        requestedIds: requestedCount,
      },
    });
  }
}