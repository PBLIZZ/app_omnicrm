import { eq, and } from "drizzle-orm";
import { userIntegrations } from "./schema";
import { getDb } from "./db";
import type {
  UserIntegrationDTO,
  CreateUserIntegrationDTO,
  UpdateUserIntegrationDTO
} from "@omnicrm/contracts";
import { UserIntegrationDTOSchema } from "@omnicrm/contracts";

export class UserIntegrationsRepository {
  /**
   * List integrations for a user
   */
  static async listUserIntegrations(userId: string): Promise<UserIntegrationDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        provider: userIntegrations.provider,
        service: userIntegrations.service,
        expiryDate: userIntegrations.expiryDate,
        createdAt: userIntegrations.createdAt,
        updatedAt: userIntegrations.updatedAt,
      })
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, userId));

    // Map to DTO format with derived hasValidToken field
    return rows.map(row => ({
      provider: row.provider as "google",
      service: row.service as "auth" | "gmail" | "calendar" | "drive",
      expiryDate: row.expiryDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      hasValidToken: row.expiryDate ? new Date() < new Date(row.expiryDate) : true,
    }));
  }

  /**
   * Get integration by user, provider, and service
   */
  static async getUserIntegration(
    userId: string,
    provider: string,
    service: string
  ): Promise<UserIntegrationDTO | null> {
    const db = await getDb();

    const rows = await db
      .select({
        provider: userIntegrations.provider,
        service: userIntegrations.service,
        expiryDate: userIntegrations.expiryDate,
        createdAt: userIntegrations.createdAt,
        updatedAt: userIntegrations.updatedAt,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service)
        )
      )
      .limit(1);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0]!; // Non-null assertion since we checked length above
    return {
      provider: row.provider as "google",
      service: row.service as "auth" | "gmail" | "calendar" | "drive",
      expiryDate: row.expiryDate,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      hasValidToken: row.expiryDate ? new Date() < new Date(row.expiryDate) : true,
    };
  }

  /**
   * Get all integrations for a specific provider
   */
  static async getUserIntegrationsByProvider(
    userId: string,
    provider: string
  ): Promise<UserIntegrationDTO[]> {
    const db = await getDb();

    const rows = await db
      .select({
        userId: userIntegrations.userId,
        provider: userIntegrations.provider,
        service: userIntegrations.service,
        accessToken: userIntegrations.accessToken,
        refreshToken: userIntegrations.refreshToken,
        expiryDate: userIntegrations.expiryDate,
        createdAt: userIntegrations.createdAt,
        updatedAt: userIntegrations.updatedAt,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider)
        )
      );

    return rows.map(row => UserIntegrationDTOSchema.parse(row));
  }

  /**
   * Create or update user integration (upsert)
   */
  static async upsertUserIntegration(userId: string, data: CreateUserIntegrationDTO): Promise<UserIntegrationDTO> {
    const db = await getDb();

    const [result] = await db
      .insert(userIntegrations)
      .values({
        userId: userId,
        provider: data.provider,
        service: data.service,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        expiryDate: data.expiryDate ?? null,
      })
      .onConflictDoUpdate({
        target: [userIntegrations.userId, userIntegrations.provider, userIntegrations.service],
        set: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? null,
          expiryDate: data.expiryDate ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({
        userId: userIntegrations.userId,
        provider: userIntegrations.provider,
        service: userIntegrations.service,
        accessToken: userIntegrations.accessToken,
        refreshToken: userIntegrations.refreshToken,
        expiryDate: userIntegrations.expiryDate,
        createdAt: userIntegrations.createdAt,
        updatedAt: userIntegrations.updatedAt,
      });

    return UserIntegrationDTOSchema.parse(result);
  }

  /**
   * Update user integration
   */
  static async updateUserIntegration(
    userId: string,
    provider: string,
    service: string,
    data: UpdateUserIntegrationDTO
  ): Promise<UserIntegrationDTO | null> {
    const db = await getDb();

    // Convert undefined to null for database nullable fields with exactOptionalPropertyTypes
    const updateValues = {
      updatedAt: new Date(),
      ...(data.provider !== undefined && { provider: data.provider }),
      ...(data.service !== undefined && { service: data.service }),
      ...(data.accessToken !== undefined && { accessToken: data.accessToken }),
      ...(data.refreshToken !== undefined && { refreshToken: data.refreshToken ?? null }),
      ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate ?? null }),
    };

    const [updatedIntegration] = await db
      .update(userIntegrations)
      .set(updateValues)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service)
        )
      )
      .returning({
        userId: userIntegrations.userId,
        provider: userIntegrations.provider,
        service: userIntegrations.service,
        accessToken: userIntegrations.accessToken,
        refreshToken: userIntegrations.refreshToken,
        expiryDate: userIntegrations.expiryDate,
        createdAt: userIntegrations.createdAt,
        updatedAt: userIntegrations.updatedAt,
      });

    if (!updatedIntegration) {
      return null;
    }

    return UserIntegrationDTOSchema.parse(updatedIntegration);
  }

  /**
   * Delete user integration
   */
  static async deleteUserIntegration(
    userId: string,
    provider: string,
    service: string
  ): Promise<boolean> {
    const db = await getDb();

    const result = await db
      .delete(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service)
        )
      );

    return result.length > 0;
  }

  /**
   * Delete all integrations for a user and provider
   */
  static async deleteUserIntegrationsByProvider(
    userId: string,
    provider: string
  ): Promise<number> {
    const db = await getDb();

    const result = await db
      .delete(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider)
        )
      );

    return result.length;
  }

  /**
   * Check if user has active integration for provider/service
   */
  static async hasActiveIntegration(
    userId: string,
    provider: string,
    service: string
  ): Promise<boolean> {
    const integration = await this.getUserIntegration(userId, provider, service);

    if (!integration) {
      return false;
    }

    // Check if token is not expired (if expiryDate exists)
    if (integration.expiryDate) {
      return new Date() < integration.expiryDate;
    }

    // If no expiry date, assume it's active
    return true;
  }

  /**
   * Get integrations that are expiring soon (within next hour)
   */
  static async getExpiringIntegrations(userId: string): Promise<UserIntegrationDTO[]> {
    const db = await getDb();
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    const rows = await db
      .select({
        userId: userIntegrations.userId,
        provider: userIntegrations.provider,
        service: userIntegrations.service,
        accessToken: userIntegrations.accessToken,
        refreshToken: userIntegrations.refreshToken,
        expiryDate: userIntegrations.expiryDate,
        createdAt: userIntegrations.createdAt,
        updatedAt: userIntegrations.updatedAt,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          // Token expires within the next hour
          eq(userIntegrations.expiryDate, oneHourFromNow)
        )
      );

    return rows.map(row => UserIntegrationDTOSchema.parse(row));
  }

  /**
   * INTERNAL: Get raw integration data with sensitive tokens for Google client
   * This method exposes sensitive data and should only be used by the Google client layer
   */
  static async getRawIntegrationData(userId: string, provider: string): Promise<Array<{
    userId: string;
    provider: string;
    service: string;
    accessToken: string;
    refreshToken: string | null;
    expiryDate: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const db = await getDb();

    const rows = await db
      .select()
      .from(userIntegrations)
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, provider)));

    return rows;
  }

  /**
   * INTERNAL: Update raw integration tokens for Google client
   * This method handles sensitive data and should only be used by the Google client layer
   */
  static async updateRawTokens(
    userId: string,
    provider: string,
    service: string,
    updates: {
      accessToken?: string;
      refreshToken?: string | null;
      expiryDate?: Date | null;
    }
  ): Promise<void> {
    const db = await getDb();

    await db
      .update(userIntegrations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service)
        )
      );
  }
}