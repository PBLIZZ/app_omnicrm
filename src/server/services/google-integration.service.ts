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
  autoRefreshed?: boolean;
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

    const autoRefresh = options.autoRefresh ?? true;

    // If autoRefresh is enabled, call getGoogleClients which will
    // proactively refresh any expired tokens before returning
    if (autoRefresh) {
      try {
        // This call will refresh expired tokens automatically
        await getGoogleClients(userId);

        // Re-fetch integrations to get the refreshed tokens
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
              autoRefreshed: false,
            };
          }

          const currentNow = new Date();
          const connected =
            !!integration.accessToken &&
            (!integration.expiryDate || integration.expiryDate > currentNow);

          return {
            connected,
            expiryDate: integration.expiryDate?.toISOString() ?? null,
            autoRefreshed: true, // We attempted refresh via getGoogleClients
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
        // Fall through to return current status without refresh
      }
    }

    return {
      gmail: { ...buildStatus("gmail"), autoRefreshed: false },
      calendar: { ...buildStatus("calendar"), autoRefreshed: false },
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

