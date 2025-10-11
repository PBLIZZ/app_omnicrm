import { eq, and, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { onboardingTokens, contacts, clientConsents, clientFiles } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

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

/**
 * Onboarding Repository
 *
 * Manages onboarding tokens and client registration flow.
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */

export class OnboardingRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Create a new onboarding token
   */
  async createToken(
    userId: string,
    expiresAt: Date,
    label?: string,
    maxUses: number = 1,
  ): Promise<OnboardingToken> {
    const token = crypto.randomUUID() + "-" + Date.now().toString(36);

    const [createdToken] = await this.db
      .insert(onboardingTokens)
      .values({
        userId,
        token,
        expiresAt,
        maxUses,
        label: label ?? null,
        createdBy: userId,
      })
      .returning();

    if (!createdToken) {
      throw new Error("Failed to create token");
    }

    return createdToken;
  }

  /**
   * List tokens for a user with pagination
   */
  async listTokens(userId: string, limit: number, offset: number): Promise<OnboardingToken[]> {
    const tokens = await this.db
      .select()
      .from(onboardingTokens)
      .where(eq(onboardingTokens.userId, userId))
      .orderBy(desc(onboardingTokens.createdAt))
      .limit(limit)
      .offset(offset);

    return tokens;
  }

  /**
   * Get single token by ID
   */
  async getTokenById(userId: string, tokenId: string): Promise<OnboardingToken | null> {
    const [token] = await this.db
      .select()
      .from(onboardingTokens)
      .where(and(eq(onboardingTokens.id, tokenId), eq(onboardingTokens.userId, userId)))
      .limit(1);

    return token ?? null;
  }

  /**
   * Delete token by ID
   */
  async deleteToken(userId: string, tokenId: string): Promise<boolean> {
    const result = await this.db
      .delete(onboardingTokens)
      .where(and(eq(onboardingTokens.id, tokenId), eq(onboardingTokens.userId, userId)))
      .returning();

    return result.length > 0;
  }

  /**
   * Validate token and check if it can be used
   */
  async validateToken(tokenValue: string): Promise<TokenValidationResult> {
    const now = new Date();

    const [token] = await this.db
      .select()
      .from(onboardingTokens)
      .where(eq(onboardingTokens.token, tokenValue));

    if (!token) {
      return { isValid: false, error: "Token not found" };
    }

    if (token.disabled) {
      return { isValid: false, error: "Token is disabled" };
    }

    if (token.expiresAt < now) {
      return { isValid: false, error: "Token has expired" };
    }

    if (
      token.maxUses !== null &&
      token.usedCount !== null &&
      token.usedCount >= token.maxUses
    ) {
      return { isValid: false, error: "Token usage limit exceeded" };
    }

    return { isValid: true, token };
  }

  /**
   * Create contact with consent and photo in transaction
   */
  async createContactWithConsent(
    userId: string,
    tokenValue: string,
    clientData: ClientData,
    consentData: ConsentData,
    photoPath?: string | null,
    photoSize?: number | null,
  ): Promise<string> {
    // Validate token first
    const validation = await this.validateToken(tokenValue);
    if (!validation.isValid) {
      throw new Error(validation.error || "Invalid token");
    }

    // Transaction: create contact → create file record → update contact → create consent → increment token
    const contactId = await this.db.transaction(async (trx) => {
      // 1. Create contact
      const [contact] = await trx
        .insert(contacts)
        .values({
          userId,
          displayName: clientData.display_name,
          primaryEmail: clientData.primary_email,
          primaryPhone: clientData.primary_phone || null,
          dateOfBirth:
            clientData.date_of_birth && clientData.date_of_birth.trim() !== ""
              ? clientData.date_of_birth
              : null,
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

    return contactId;
  }
}

export function createOnboardingRepository(db: DbClient): OnboardingRepository {
  return new OnboardingRepository(db);
}
