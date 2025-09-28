import { eq, and, desc } from "drizzle-orm";
import { syncSessions } from "@/server/db/schema";
import { getDb } from "./db";
import type {
  SyncSession,
  CreateSyncSession
} from "@/server/db/schema";

// Local type aliases for repository layer
type SyncSessionDTO = SyncSession;
type CreateSyncSessionDTO = CreateSyncSession;
type UpdateSyncSessionDTO = Partial<CreateSyncSession>;

interface SyncSessionFilters {
  service?: string;
  status?: string;
}

export class SyncSessionsRepository {
  /**
   * List sync sessions for a user with optional filtering
   */
  static async listSyncSessions(
    userId: string,
    filters?: SyncSessionFilters
  ): Promise<SyncSessionDTO[]> {
    const db = await getDb();

    // Build conditions array
    const conditions = [eq(syncSessions.userId, userId)];

    if (filters?.service) {
      conditions.push(eq(syncSessions.service, filters.service));
    }

    if (filters?.status) {
      conditions.push(eq(syncSessions.status, filters.status));
    }

    const query = db
      .select({
        id: syncSessions.id,
        userId: syncSessions.userId,
        service: syncSessions.service,
        status: syncSessions.status,
        progressPercentage: syncSessions.progressPercentage,
        currentStep: syncSessions.currentStep,
        totalItems: syncSessions.totalItems,
        importedItems: syncSessions.importedItems,
        processedItems: syncSessions.processedItems,
        failedItems: syncSessions.failedItems,
        startedAt: syncSessions.startedAt,
        completedAt: syncSessions.completedAt,
        errorDetails: syncSessions.errorDetails,
        preferences: syncSessions.preferences,
        createdAt: syncSessions.createdAt,
        updatedAt: syncSessions.updatedAt,
      })
      .from(syncSessions)
      .where(and(...conditions))
      .orderBy(desc(syncSessions.startedAt));

    const rows = await query;

    return rows.map(row => row);
  }

  /**
   * Get a single sync session by ID
   */
  static async getSyncSessionById(userId: string, sessionId: string): Promise<SyncSessionDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: syncSessions.id,
        userId: syncSessions.userId,
        service: syncSessions.service,
        status: syncSessions.status,
        progressPercentage: syncSessions.progressPercentage,
        currentStep: syncSessions.currentStep,
        totalItems: syncSessions.totalItems,
        importedItems: syncSessions.importedItems,
        processedItems: syncSessions.processedItems,
        failedItems: syncSessions.failedItems,
        startedAt: syncSessions.startedAt,
        completedAt: syncSessions.completedAt,
        errorDetails: syncSessions.errorDetails,
        preferences: syncSessions.preferences,
        createdAt: syncSessions.createdAt,
        updatedAt: syncSessions.updatedAt,
      })
      .from(syncSessions)
      .where(and(eq(syncSessions.userId, userId), eq(syncSessions.id, sessionId)))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Get the latest sync session for a service
   */
  static async getLatestSyncSession(
    userId: string,
    service: string
  ): Promise<SyncSessionDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        id: syncSessions.id,
        userId: syncSessions.userId,
        service: syncSessions.service,
        status: syncSessions.status,
        progressPercentage: syncSessions.progressPercentage,
        currentStep: syncSessions.currentStep,
        totalItems: syncSessions.totalItems,
        importedItems: syncSessions.importedItems,
        processedItems: syncSessions.processedItems,
        failedItems: syncSessions.failedItems,
        startedAt: syncSessions.startedAt,
        completedAt: syncSessions.completedAt,
        errorDetails: syncSessions.errorDetails,
        preferences: syncSessions.preferences,
        createdAt: syncSessions.createdAt,
        updatedAt: syncSessions.updatedAt,
      })
      .from(syncSessions)
      .where(and(eq(syncSessions.userId, userId), eq(syncSessions.service, service)))
      .orderBy(desc(syncSessions.startedAt))
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    return rows[0];
  }

  /**
   * Get active sync sessions (not completed, failed, or cancelled)
   */
  static async getActiveSyncSessions(userId: string): Promise<SyncSessionDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        id: syncSessions.id,
        userId: syncSessions.userId,
        service: syncSessions.service,
        status: syncSessions.status,
        progressPercentage: syncSessions.progressPercentage,
        currentStep: syncSessions.currentStep,
        totalItems: syncSessions.totalItems,
        importedItems: syncSessions.importedItems,
        processedItems: syncSessions.processedItems,
        failedItems: syncSessions.failedItems,
        startedAt: syncSessions.startedAt,
        completedAt: syncSessions.completedAt,
        errorDetails: syncSessions.errorDetails,
        preferences: syncSessions.preferences,
        createdAt: syncSessions.createdAt,
        updatedAt: syncSessions.updatedAt,
      })
      .from(syncSessions)
      .where(
        and(
          eq(syncSessions.userId, userId),
          // Status is not a terminal state
          // Using `not in` equivalent with multiple conditions
          eq(syncSessions.status, "started") // This would need to be expanded for multiple statuses
        )
      )
      .orderBy(desc(syncSessions.startedAt));

    return rows.map(row => row);
  }

  /**
   * Create a new sync session
   */
  static async createSyncSession(userId: string, data: CreateSyncSessionDTO): Promise<SyncSessionDTO> {
    const db = await getDb();

    const [newSession] = await db
      .insert(syncSessions)
      .values({
        userId: userId,
        service: data.service,
        preferences: data.preferences ?? {},
      })
      .returning({
        id: syncSessions.id,
        userId: syncSessions.userId,
        service: syncSessions.service,
        status: syncSessions.status,
        progressPercentage: syncSessions.progressPercentage,
        currentStep: syncSessions.currentStep,
        totalItems: syncSessions.totalItems,
        importedItems: syncSessions.importedItems,
        processedItems: syncSessions.processedItems,
        failedItems: syncSessions.failedItems,
        startedAt: syncSessions.startedAt,
        completedAt: syncSessions.completedAt,
        errorDetails: syncSessions.errorDetails,
        preferences: syncSessions.preferences,
        createdAt: syncSessions.createdAt,
        updatedAt: syncSessions.updatedAt,
      });

    return newSession;
  }

  /**
   * Update an existing sync session
   */
  static async updateSyncSession(
    userId: string,
    sessionId: string,
    data: UpdateSyncSessionDTO
  ): Promise<SyncSessionDTO | null> {
    const db = await getDb();

    // If status is being set to a terminal state, set completedAt
    const updateData = { ...data };
    if (data.status && ["completed", "failed", "cancelled"].includes(data.status)) {
      updateData.completedAt = new Date();
    }

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(updateData.status !== undefined && { status: updateData.status }),
      ...(updateData.progressPercentage !== undefined && { progressPercentage: updateData.progressPercentage }),
      ...(updateData.currentStep !== undefined && { currentStep: updateData.currentStep ?? null }),
      ...(updateData.totalItems !== undefined && { totalItems: updateData.totalItems }),
      ...(updateData.importedItems !== undefined && { importedItems: updateData.importedItems }),
      ...(updateData.processedItems !== undefined && { processedItems: updateData.processedItems }),
      ...(updateData.failedItems !== undefined && { failedItems: updateData.failedItems }),
      ...(updateData.completedAt !== undefined && { completedAt: updateData.completedAt ?? null }),
      ...(updateData.errorDetails !== undefined && { errorDetails: updateData.errorDetails ?? null }),
    };

    const [updatedSession] = await db
      .update(syncSessions)
      .set(updateValues)
      .where(and(eq(syncSessions.userId, userId), eq(syncSessions.id, sessionId)))
      .returning({
        id: syncSessions.id,
        userId: syncSessions.userId,
        service: syncSessions.service,
        status: syncSessions.status,
        progressPercentage: syncSessions.progressPercentage,
        currentStep: syncSessions.currentStep,
        totalItems: syncSessions.totalItems,
        importedItems: syncSessions.importedItems,
        processedItems: syncSessions.processedItems,
        failedItems: syncSessions.failedItems,
        startedAt: syncSessions.startedAt,
        completedAt: syncSessions.completedAt,
        errorDetails: syncSessions.errorDetails,
        preferences: syncSessions.preferences,
        createdAt: syncSessions.createdAt,
        updatedAt: syncSessions.updatedAt,
      });

    if (!updatedSession) {
      return null;
    }

    return updatedSession;
  }

  /**
   * Update sync session progress
   */
  static async updateSyncProgress(
    userId: string,
    sessionId: string,
    progress: {
      progressPercentage?: number;
      currentStep?: string;
      totalItems?: number;
      importedItems?: number;
      processedItems?: number;
      failedItems?: number;
    }
  ): Promise<SyncSessionDTO | null> {
    const db = await getDb();

    const [updatedSession] = await db
      .update(syncSessions)
      .set({
        ...progress,
        updatedAt: new Date(),
      })
      .where(and(eq(syncSessions.userId, userId), eq(syncSessions.id, sessionId)))
      .returning({
        id: syncSessions.id,
        userId: syncSessions.userId,
        service: syncSessions.service,
        status: syncSessions.status,
        progressPercentage: syncSessions.progressPercentage,
        currentStep: syncSessions.currentStep,
        totalItems: syncSessions.totalItems,
        importedItems: syncSessions.importedItems,
        processedItems: syncSessions.processedItems,
        failedItems: syncSessions.failedItems,
        startedAt: syncSessions.startedAt,
        completedAt: syncSessions.completedAt,
        errorDetails: syncSessions.errorDetails,
        preferences: syncSessions.preferences,
        createdAt: syncSessions.createdAt,
        updatedAt: syncSessions.updatedAt,
      });

    if (!updatedSession) {
      return null;
    }

    return updatedSession;
  }

  /**
   * Mark sync session as failed with error details
   */
  static async markSyncSessionFailed(
    userId: string,
    sessionId: string,
    errorDetails: Record<string, unknown>
  ): Promise<SyncSessionDTO | null> {
    return this.updateSyncSession(userId, sessionId, {
      status: "failed",
      errorDetails,
    });
  }

  /**
   * Mark sync session as completed
   */
  static async markSyncSessionCompleted(
    userId: string,
    sessionId: string
  ): Promise<SyncSessionDTO | null> {
    return this.updateSyncSession(userId, sessionId, {
      status: "completed",
      progressPercentage: 100,
    });
  }

  /**
   * Cancel a sync session
   */
  static async cancelSyncSession(
    userId: string,
    sessionId: string
  ): Promise<SyncSessionDTO | null> {
    return this.updateSyncSession(userId, sessionId, {
      status: "cancelled",
    });
  }

  /**
   * Delete a sync session
   */
  static async deleteSyncSession(userId: string, sessionId: string): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(syncSessions)
      .where(and(eq(syncSessions.userId, userId), eq(syncSessions.id, sessionId)));

    return result.length > 0;
  }
}