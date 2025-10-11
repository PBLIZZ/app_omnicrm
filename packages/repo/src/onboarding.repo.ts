// ===== packages/repo/src/onboarding.repo.ts =====
import { eq, and } from "drizzle-orm";
import { onboardingTokens, contacts, clientConsents } from "@/server/db/schema";
import { getDb } from "@/server/db/client";
import { ok, err, dbError, DbResult } from "@/lib/utils/result";
import { sql } from "drizzle-orm";

export type OnboardingToken = typeof onboardingTokens.$inferSelect;
export type CreateOnboardingToken = typeof onboardingTokens.$inferInsert;

export interface ClientData {
  display_name: string;
  primary_email: string;
  primary_phone?: string | null | undefined;
  date_of_birth?: string | null | undefined;
  emergency_contact_name?: string | null | undefined;
  emergency_contact_phone?: string | null | undefined;
  referral_source?: string | null | undefined;
  address?: Record<string, unknown> | null | undefined;
  health_context?: Record<string, unknown> | null | undefined;
  preferences?: Record<string, unknown> | null | undefined;
}

export interface ConsentData {
  consent_type: "data_processing" | "marketing" | "hipaa" | "photography";
  consent_text_version: string;
  granted: boolean;
  signature_svg?: string | null | undefined;
  signature_image_url?: string | null | undefined;
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
      const token = crypto.randomUUID() + "-" + Date.now().toString(36);

      const [createdToken] = await db
        .insert(onboardingTokens)
        .values({
          userId,
          token,
          expiresAt,
          maxUses,
          label,
          createdBy: userId,
        })
        .returning();

      if (!createdToken) {
        return dbError("DB_INSERT_FAILED", "Failed to create token");
      }

      return ok(createdToken);
    } catch (error) {
      return dbError(
        "DB_QUERY_FAILED",
        error instanceof Error ? error.message : "Failed to create token",
        error,
      );
    }
  }

  /**
   * List tokens for a user with pagination
   */
  static async listTokens(
    userId: string,
    limit: number,
    offset: number,
  ): Promise<DbResult<OnboardingToken[]>> {
    try {
      const db = await getDb();
      const tokens = await db
        .select()
        .from(onboardingTokens)
        .where(eq(onboardingTokens.userId, userId))
        .orderBy(onboardingTokens.createdAt)
        .limit(limit)
        .offset(offset);

      return ok(tokens);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to list tokens", error);
    }
  }

  /**
   * Get single token by ID
   */
  static async getTokenById(
    userId: string,
    tokenId: string,
  ): Promise<DbResult<OnboardingToken | null>> {
    try {
      const db = await getDb();
      const [token] = await db
        .select()
        .from(onboardingTokens)
        .where(and(eq(onboardingTokens.id, tokenId), eq(onboardingTokens.userId, userId)))
        .limit(1);

      return ok(token ?? null);
    } catch (error) {
      return dbError("DB_QUERY_FAILED", "Failed to get token", error);
    }
  }

  /**
   * Delete token by ID
   */
  static async deleteToken(userId: string, tokenId: string): Promise<DbResult<boolean>> {
    try {
      const db = await getDb();
      const result = await db
        .delete(onboardingTokens)
        .where(and(eq(onboardingTokens.id, tokenId), eq(onboardingTokens.userId, userId)))
        .returning();

      return ok(result.length > 0);
    } catch (error) {
      return dbError("DB_DELETE_FAILED", "Failed to delete token", error);
    }
  }

  /**
   * Validate token and check if it can be used
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
      return dbError("DB_QUERY_FAILED", "Failed to validate token", error);
    }
  }

  /**
   * Create contact with consent and photo in transaction
   */
  static async createContactWithConsent(
    userId: string,
    tokenValue: string,
    clientData: ClientData,
    consentData: ConsentData,
    photoPath?: string | null | undefined,
    photoSize?: number | null | undefined,
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
        });
      }

      // Transaction: create contact → create file record → update contact → create consent → increment token
      const contactId = await db.transaction(async (trx) => {
        // 1. Create contact
        const [contact] = await trx
          .insert(contacts)
          .values({
            userId,
            displayName: clientData.display_name,
            primaryEmail: clientData.primary_email,
            primaryPhone: clientData.primary_phone || null,
            dateOfBirth: clientData.date_of_birth && clientData.date_of_birth.trim() !== "" ? clientData.date_of_birth : null,
            emergencyContactName: clientData.emergency_contact_name || null,
            emergencyContactPhone: clientData.emergency_contact_phone || null,
            referralSource: clientData.referral_source || null,
            address: clientData.address,
            healthContext: clientData.health_context,
            preferences: clientData.preferences,
            source: "onboarding",
            photoUrl: null,
          })
          .returning();

        if (!contact) throw new Error("Failed to create contact");

        // 2. If photo, create file record and update contact
        if (photoPath) {
          const { clientFiles } = await import("@/server/db/schema");

          await trx.insert(clientFiles).values({
            contactId: contact.id,
            userId,
            filePath: photoPath,
            mimeType: "image/webp",
            fileSize: photoSize ?? null,
            fileType: "photo",
          });

          await trx
            .update(contacts)
            .set({ photoUrl: photoPath })
            .where(eq(contacts.id, contact.id));
        }

        // 3. Create consent
        await trx.insert(clientConsents).values({
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

        // 4. Increment token usage
        await trx
          .update(onboardingTokens)
          .set({ usedCount: sql`coalesce(${onboardingTokens.usedCount}, 0) + 1` })
          .where(eq(onboardingTokens.token, tokenValue));

        return contact.id;
      });

      return ok(contactId);
    } catch (error) {
      return dbError(
        "DB_TRANSACTION_FAILED",
        error instanceof Error ? error.message : "Transaction failed",
        error,
      );
    }
  }
}
