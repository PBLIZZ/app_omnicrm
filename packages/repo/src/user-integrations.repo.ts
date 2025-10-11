import { and, eq, gt, lte, type InferSelectModel } from "drizzle-orm";

import { userIntegrations, type CreateUserIntegration } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

type IntegrationRow = InferSelectModel<typeof userIntegrations>;
export type UserIntegrationDTO = IntegrationRow & { hasValidToken: boolean };
type CreateUserIntegrationDTO = Omit<CreateUserIntegration, "userId">;
type UpdateUserIntegrationDTO = Partial<Omit<CreateUserIntegration, "userId">>;

function toDto(row: IntegrationRow): UserIntegrationDTO {
  const hasValidToken =
    row.expiryDate == null ? true : Date.now() < new Date(row.expiryDate).getTime();

  return {
    ...row,
    hasValidToken,
  };
}

export class UserIntegrationsRepository {
  constructor(private readonly db: DbClient) {}

  async listUserIntegrations(userId: string): Promise<UserIntegrationDTO[]> {
    const rows = (await this.db
      .select()
      .from(userIntegrations)
      .where(eq(userIntegrations.userId, userId))) as IntegrationRow[];

    return rows.map(toDto);
  }

  async getUserIntegration(
    userId: string,
    provider: string,
    service: string,
  ): Promise<UserIntegrationDTO | null> {
    const rows = (await this.db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service),
        ),
      )
      .limit(1)) as IntegrationRow[];

    const row = rows[0];
    return row ? toDto(row) : null;
  }

  async getUserIntegrationsByProvider(
    userId: string,
    provider: string,
  ): Promise<UserIntegrationDTO[]> {
    const rows = (await this.db
      .select()
      .from(userIntegrations)
      .where(
        and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, provider)),
      )) as IntegrationRow[];

    return rows.map(toDto);
  }

  async upsertUserIntegration(
    userId: string,
    data: CreateUserIntegrationDTO,
  ): Promise<UserIntegrationDTO> {
    const [row] = (await this.db
      .insert(userIntegrations)
      .values({
        userId,
        provider: data.provider,
        service: data.service,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken ?? null,
        expiryDate: data.expiryDate ?? null,
        config: data.config ?? null,
      })
      .onConflictDoUpdate({
        target: [userIntegrations.userId, userIntegrations.provider, userIntegrations.service],
        set: {
          accessToken: data.accessToken,
          refreshToken: data.refreshToken ?? null,
          expiryDate: data.expiryDate ?? null,
          config: data.config ?? null,
          updatedAt: new Date(),
        },
      })
      .returning()) as IntegrationRow[];

    if (!row) {
      throw new Error("Failed to upsert user integration");
    }

    return toDto(row);
  }

  async updateUserIntegration(
    userId: string,
    provider: string,
    service: string,
    data: UpdateUserIntegrationDTO,
  ): Promise<UserIntegrationDTO | null> {
    if (Object.keys(data).length === 0) {
      throw new Error("No integration fields provided for update");
    }

    const updatePayload: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.provider !== undefined) updatePayload["provider"] = data.provider;
    if (data.service !== undefined) updatePayload["service"] = data.service;
    if (data.accessToken !== undefined) updatePayload["accessToken"] = data.accessToken;
    if (data.refreshToken !== undefined) updatePayload["refreshToken"] = data.refreshToken ?? null;
    if (data.expiryDate !== undefined) updatePayload["expiryDate"] = data.expiryDate ?? null;
    if (data.config !== undefined) updatePayload["config"] = data.config ?? null;

    const [updated] = (await this.db
      .update(userIntegrations)
      .set(updatePayload)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service),
        ),
      )
      .returning()) as IntegrationRow[];

    return updated ? toDto(updated) : null;
  }

  async deleteUserIntegration(userId: string, provider: string, service: string): Promise<boolean> {
    const deleted = (await this.db
      .delete(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service),
        ),
      )
      .returning({ id: userIntegrations.userId })) as Array<{ id: string }>;

    return deleted.length > 0;
  }

  async deleteUserIntegrationsByProvider(userId: string, provider: string): Promise<number> {
    const deleted = (await this.db
      .delete(userIntegrations)
      .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, provider)))
      .returning({ id: userIntegrations.userId })) as Array<{ id: string }>;

    return deleted.length;
  }

  async hasActiveIntegration(userId: string, provider: string, service: string): Promise<boolean> {
    const integration = await this.getUserIntegration(userId, provider, service);
    if (!integration) {
      return false;
    }

    return integration.expiryDate == null
      ? true
      : Date.now() < new Date(integration.expiryDate).getTime();
  }

  async getExpiringIntegrations(userId: string): Promise<UserIntegrationDTO[]> {
    const now = new Date();
    const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

    const rows = (await this.db
      .select()
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          gt(userIntegrations.expiryDate, now),
          lte(userIntegrations.expiryDate, oneHourFromNow),
        ),
      )) as IntegrationRow[];

    return rows.map(toDto);
  }

  async getRawIntegrationData(
    userId: string,
    provider: string,
  ): Promise<
    Array<{
      userId: string;
      provider: string;
      service: string | null;
      accessToken: string;
      refreshToken: string | null;
      expiryDate: Date | null;
      createdAt: Date | null;
      updatedAt: Date | null;
    }>
  > {
    const rows = (await this.db
      .select()
      .from(userIntegrations)
      .where(
        and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, provider)),
      )) as IntegrationRow[];

    return rows;
  }

  async updateRawTokens(
    userId: string,
    provider: string,
    service: string,
    updates: {
      accessToken?: string;
      refreshToken?: string | null;
      expiryDate?: Date | null;
    },
  ): Promise<void> {
    if (
      updates.accessToken === undefined &&
      updates.refreshToken === undefined &&
      updates.expiryDate === undefined
    ) {
      return;
    }

    await this.db
      .update(userIntegrations)
      .set({
        ...(updates.accessToken !== undefined ? { accessToken: updates.accessToken } : {}),
        ...(updates.refreshToken !== undefined
          ? { refreshToken: updates.refreshToken ?? null }
          : {}),
        ...(updates.expiryDate !== undefined ? { expiryDate: updates.expiryDate ?? null } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, provider),
          eq(userIntegrations.service, service),
        ),
      );
  }
}

export function createUserIntegrationsRepository(db: DbClient): UserIntegrationsRepository {
  return new UserIntegrationsRepository(db);
}
