import { createUserIntegrationsRepository } from "@repo";
import type { UserIntegrationDTO } from "@repo";
import { getDb } from "@/server/db/client";
import { getGoogleClients } from "@/server/google/client";
import { logger } from "@/lib/observability";
import { AppError } from "@/lib/errors/app-error";

export type GoogleService = "gmail" | "calendar";

export interface IntegrationTokens {
  accessToken: string;
  refreshToken?: string | null;
  expiryDate?: Date | null;
  config?: Record<string, unknown> | null;
}

export interface GoogleServiceStatus {
  connected: boolean;
  expiryDate: string | null;
}

export interface GoogleIntegrationStatus {
  gmail: GoogleServiceStatus;
  calendar: GoogleServiceStatus;
}

/**
 * Upsert Google integration tokens for a user.
 */
export async function upsertIntegrationService(
  userId: string,
  service: GoogleService,
  tokens: IntegrationTokens,
): Promise<void> {
  const db = await getDb();
  const repo = createUserIntegrationsRepository(db);

  try {
    await repo.upsertUserIntegration(userId, {
      provider: "google",
      service,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiryDate: tokens.expiryDate ?? null,
      config: tokens.config ?? null,
    });
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to upsert Google integration",
      "INTEGRATION_ERROR",
      "database",
      false,
    );
  }
}

/**
 * Retrieve Google integration status and optionally attempt token refresh if expired.
 */
export async function getStatusService(
  userId: string,
  options: { autoRefresh?: boolean } = {},
): Promise<GoogleIntegrationStatus> {
  const db = await getDb();
  const repo = createUserIntegrationsRepository(db);

  try {
    const integrations = await repo.getUserIntegrationsByProvider(
      userId,
      "google",
    );

    const now = new Date();

    const findIntegration = (service: GoogleService): UserIntegrationDTO | undefined =>
      integrations.find(integration => integration.service === service);

    const buildStatus = (service: GoogleService): GoogleServiceStatus => {
      const integration = findIntegration(service);
      
      if (!integration) {
        return {
          connected: false,
          expiryDate: null,
        };
      }

      const connected =
        !!integration.accessToken &&
        (!integration.expiryDate || integration.expiryDate > now);

      return {
        connected,
        expiryDate: integration.expiryDate?.toISOString() ?? null,
      };
    };

    const needsRefresh = (service: GoogleService): boolean => {
      const integration = findIntegration(service);
      return Boolean(
        integration?.accessToken &&
          integration.expiryDate &&
          integration.expiryDate <= now,
      );
    };

    const autoRefresh = options.autoRefresh ?? true;

    if (autoRefresh && (needsRefresh("gmail") || needsRefresh("calendar"))) {
      try {
        await getGoogleClients(userId);

        const refreshedIntegrations = await repo.getUserIntegrationsByProvider(
          userId,
          "google",
        );

        const refreshedFind = (service: GoogleService): UserIntegrationDTO | undefined =>
          refreshedIntegrations.find(integration => integration.service === service);

        const refreshedStatus = (service: GoogleService): GoogleServiceStatus => {
          const integration = refreshedFind(service);
          
          if (!integration) {
            return {
              connected: false,
              expiryDate: null,
            };
          }

          const connected =
            !!integration.accessToken &&
            (!integration.expiryDate || integration.expiryDate > new Date());

          return {
            connected,
            expiryDate: integration.expiryDate?.toISOString() ?? null,
          };
        };

        return {
          gmail: refreshedStatus("gmail"),
          calendar: refreshedStatus("calendar"),
        };
      } catch (error) {
        await logger.error(
          "Failed to refresh Google integrations during status check",
          {
            operation: "google_integration.refresh",
            additionalData: { userId },
          },
          error instanceof Error ? error : new Error(String(error)),
        );
        // fall through to return current status
      }
    }

    return {
      gmail: buildStatus("gmail"),
      calendar: buildStatus("calendar"),
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get Google integration status",
      "INTEGRATION_ERROR",
      "database",
      false,
    );
  }
}

