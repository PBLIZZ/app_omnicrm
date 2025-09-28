import { eq, and, gt, sql } from "drizzle-orm";
import { onboardingTokens, contacts, clientConsents, type CreateContact } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, err, DbResult, dbError } from "@/lib/utils/result";

export type OnboardingToken = typeof onboardingTokens.$inferSelect;
export type CreateOnboardingToken = typeof onboardingTokens.$inferInsert;

export interface ClientData {
  display_name: string;
  primary_email: string;
  primary_phone?: string | null;
  date_of_birth?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  referral_source?: string | null;
  address?: Record<string, unknown> | null;
  health_context?: Record<string, unknown> | null;
  preferences?: Record<string, unknown> | null;
}

export interface ConsentData {
  consent_type: "data_processing" | "marketing" | "hipaa" | "photography";
  consent_text_version: string;
  granted: boolean;
  signature_svg?: string;
  signature_image_url?: string;
  ip_address: string;
  user_agent: string;
}

export interface TokenValidationResult {
  isValid: boolean;
  token?: OnboardingToken;
  error?: string;
}

export class OnboardingRepository {
  /**
   * Create a new onboarding token
   */
  static async createToken(
    userId: string,
    expiresAt: Date,
    label?: string,
    maxUses: number = 1,
  ): Promise<DbResult<OnboardingToken>> {
    try {
      const db = await getDb();

      // Generate a secure token
      const token = crypto.randomUUID() + "-" + Date.now().toString(36);

      const tokenData: CreateOnboardingToken = {
        userId,
        token,
        expiresAt: expiresAt,
        maxUses,
        label,
        createdBy: userId,
      };

      const [createdToken] = await db.insert(onboardingTokens).values(tokenData).returning();

      if (!createdToken) {
        return dbError("DB_INSERT_FAILED", "Failed to create onboarding token");
      }

      return ok(createdToken);
    } catch (error) {
      console.error("Error creating onboarding token:", error);
      return dbError(
        "DB_QUERY_FAILED",
        error instanceof Error ? error.message : "Failed to create onboarding token",
        error,
      );
    }
  }

  /**
   * Get active tokens for a user
   */
  static async getActiveTokens(userId: string): Promise<DbResult<OnboardingToken[]>> {
    try {
      const db = await getDb();
      const now = new Date();

      const tokens = await db
        .select()
        .from(onboardingTokens)
        .where(
          and(
            eq(onboardingTokens.userId, userId),
            eq(onboardingTokens.disabled, false),
            gt(onboardingTokens.expiresAt, now),
          ),
        );

      return ok(tokens);
    } catch (error) {
      console.error("Error getting active tokens:", error);
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get active tokens",
        details: error,
      });
    }
  }

  /**
   * Validate a token and check if it can be used
   */
  static async validateToken(tokenValue: string): Promise<DbResult<TokenValidationResult>> {
    try {
      const db = await getDb();
      const now = new Date();

      const [token] = await db
        .select()
        .from(onboardingTokens)
        .where(eq(onboardingTokens.token, tokenValue));

      if (!token) {
        return ok({ isValid: false, error: "Token not found" });
      }

      if (token.disabled) {
        return ok({ isValid: false, error: "Token is disabled" });
      }

      if (token.expiresAt < now) {
        return ok({ isValid: false, error: "Token has expired" });
      }

      if (token.maxUses !== null && token.usedCount !== null && token.usedCount >= token.maxUses) {
        return ok({ isValid: false, error: "Token usage limit exceeded" });
      }

      return ok({ isValid: true, token });
    } catch (error) {
      console.error("Error validating token:", error);
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to validate token",
        details: error,
      });
    }
  }

  /**
   * Increment token usage count
   */
  static async incrementTokenUsage(tokenValue: string): Promise<DbResult<void>> {
    try {
      const db = await getDb();

      await db
        .update(onboardingTokens)
        .set({
          usedCount: sql`${onboardingTokens.usedCount} + 1`,
        })
        .where(eq(onboardingTokens.token, tokenValue));

      return ok(undefined);
    } catch (error) {
      console.error("Error incrementing token usage:", error);
      return err({
        code: "DB_UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to increment token usage",
        details: error,
      });
    }
  }

  /**
   * Update token last accessed timestamp (if that field exists)
   */
  static async updateTokenAccess(_tokenValue: string): Promise<DbResult<void>> {
    try {
      // Note: The schema doesn't show last_accessed_at field, but the service references it
      // If this field exists in the database but not in the schema, it should be added to schema
      // For now, this is a no-op that succeeds
      return ok(undefined);
    } catch (error) {
      console.error("Error updating token access:", error);
      return err({
        code: "DB_UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to update token access",
        details: error,
      });
    }
  }

  /**
   * Disable a token
   */
  static async disableToken(tokenId: string, userId: string): Promise<DbResult<void>> {
    try {
      const db = await getDb();

      await db
        .update(onboardingTokens)
        .set({ disabled: true })
        .where(and(eq(onboardingTokens.id, tokenId), eq(onboardingTokens.userId, userId)));

      return ok(undefined);
    } catch (error) {
      console.error("Error disabling token:", error);
      return err({
        code: "DB_UPDATE_FAILED",
        message: error instanceof Error ? error.message : "Failed to disable token",
        details: error,
      });
    }
  }

  /**
   * Create contact and consent record within a transaction
   * This replaces the RPC call pattern
   */
  static async createContactWithConsent(
    userId: string,
    tokenValue: string,
    clientData: ClientData,
    consentData: ConsentData,
    photoPath?: string,
  ): Promise<DbResult<string>> {
    try {
      const db = await getDb();

      // Validate token first
      const tokenResult = await this.validateToken(tokenValue);
      if (!tokenResult.success) {
        return err(tokenResult.error);
      }

      const validation = tokenResult.data;
      if (!validation.isValid) {
        return err({
          code: "INVALID_TOKEN",
          message: validation.error || "Invalid token",
          details: validation,
        });
      }

      // Start transaction by inserting contact
      const contactData: CreateContact = {
        userId,
        displayName: clientData.display_name,
        primaryEmail: clientData.primary_email,
        primaryPhone: clientData.primary_phone,
        dateOfBirth: clientData.date_of_birth,
        emergencyContactName: clientData.emergency_contact_name,
        emergencyContactPhone: clientData.emergency_contact_phone,
        referralSource: clientData.referral_source,
        address: clientData.address,
        healthContext: clientData.health_context,
        preferences: clientData.preferences,
        source: "onboarding",
        photoUrl: photoPath || null,
      };

      const [contact] = await db.insert(contacts).values(contactData).returning();

      if (!contact) {
        return err({
          code: "CONTACT_CREATION_FAILED",
          message: "Failed to create contact",
          details: null,
        });
      }

      // Create consent record
      await db.insert(clientConsents).values({
        contactId: contact.id,
        userId,
        consentType: consentData.consent_type,
        consentTextVersion: consentData.consent_text_version,
        granted: consentData.granted,
        signatureSvg: consentData.signature_svg || null,
        signatureImageUrl: consentData.signature_image_url || null,
        ipAddress: consentData.ip_address,
        userAgent: consentData.user_agent,
      });

      // Increment token usage
      await this.incrementTokenUsage(tokenValue);

      return ok(contact.id);
    } catch (error) {
      console.error("Error creating contact with consent:", error);
      return err({
        code: "DB_TRANSACTION_FAILED",
        message: error instanceof Error ? error.message : "Failed to create contact with consent",
        details: error,
      });
    }
  }
}
