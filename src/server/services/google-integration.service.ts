import { UserIntegrationsRepository } from "@repo";
import type { UserIntegrationDTO } from "@repo";
import { getDb } from "@/server/db/client";
import { getGoogleClients } from "@/server/google/client";
import { logger } from "@/lib/observability";

type GoogleService = "gmail" | "calendar";

interface IntegrationTokens {
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

export class GoogleIntegrationService {
  /**
   * Upsert Google integration tokens for a user.
   */
  static async upsertIntegration(
    userId: string,
    service: GoogleService,
    tokens: IntegrationTokens,
  ): Promise<void> {
    const db = await getDb();

    await UserIntegrationsRepository.upsertUserIntegration(db, userId, {
      provider: "google",
      service,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? null,
      expiryDate: tokens.expiryDate ?? null,
      config: tokens.config ?? null,
    });
  }

  /**
   * Retrieve Google integration status and optionally attempt token refresh if expired.
   */
  static async getStatus(
    userId: string,
    options: { autoRefresh?: boolean } = {},
  ): Promise<GoogleIntegrationStatus> {
    const db = await getDb();
    const integrations = await UserIntegrationsRepository.getUserIntegrationsByProvider(
      db,
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

        const refreshedIntegrations = await UserIntegrationsRepository.getUserIntegrationsByProvider(
          db,
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
  }
}

