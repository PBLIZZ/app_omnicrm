import { eq, and, desc } from "drizzle-orm";
import { clientConsents, contacts, tasks } from "@/server/db/schema";
import type { DbClient } from "@/server/db/client";

export type ClientConsent = typeof clientConsents.$inferSelect;
export type CreateClientConsent = typeof clientConsents.$inferInsert;

export type ConsentType = "data_processing" | "marketing" | "hipaa" | "photography";

export interface ConsentStatusItem {
  id: string;
  contactId: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  consentTextVersion: string;
}

export interface ConsentHistoryItem {
  id: string;
  consentType: ConsentType;
  granted: boolean;
  grantedAt: Date | null;
  consentTextVersion: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date | null;
}

export interface MissingConsentContact {
  contactId: string;
  displayName: string;
  primaryEmail: string | null;
  missingConsentTypes: ConsentType[];
}

/**
 * Compliance Repository
 *
 * Manages consent records for HIPAA compliance and data processing.
 * Uses DbClient constructor injection pattern.
 * Throws errors on failure - no Result wrapper.
 */
export class ComplianceRepository {
  constructor(private readonly db: DbClient) {}

  /**
   * Get consent status for a contact
   */
  async getConsentStatus(
    userId: string,
    contactId: string,
    consentType?: ConsentType,
  ): Promise<ConsentStatusItem[]> {
    const conditions = [
      eq(clientConsents.userId, userId),
      eq(clientConsents.contactId, contactId),
    ];

    if (consentType) {
      conditions.push(eq(clientConsents.consentType, consentType));
    }

    const consents = await this.db
      .select({
        id: clientConsents.id,
        contactId: clientConsents.contactId,
        consentType: clientConsents.consentType,
        granted: clientConsents.granted,
        grantedAt: clientConsents.grantedAt,
        consentTextVersion: clientConsents.consentTextVersion,
      })
      .from(clientConsents)
      .where(and(...conditions))
      .orderBy(desc(clientConsents.grantedAt));

    return consents.map((c) => ({
      id: c.id,
      contactId: c.contactId,
      consentType: c.consentType as ConsentType,
      granted: c.granted ?? true,
      grantedAt: c.grantedAt,
      consentTextVersion: c.consentTextVersion,
    }));
  }

  /**
   * Get full consent history for a contact
   */
  async getConsentHistory(userId: string, contactId: string): Promise<ConsentHistoryItem[]> {
    const consents = await this.db
      .select()
      .from(clientConsents)
      .where(and(eq(clientConsents.userId, userId), eq(clientConsents.contactId, contactId)))
      .orderBy(desc(clientConsents.grantedAt));

    return consents.map((c) => ({
      id: c.id,
      consentType: c.consentType as ConsentType,
      granted: c.granted ?? true,
      grantedAt: c.grantedAt,
      consentTextVersion: c.consentTextVersion,
      ipAddress: c.ipAddress,
      userAgent: c.userAgent,
      createdAt: c.createdAt,
    }));
  }

  /**
   * Get contacts missing required consents
   */
  async getContactsMissingConsents(
    userId: string,
    requiredTypes: ConsentType[],
  ): Promise<MissingConsentContact[]> {
    // Get all active contacts
    const allContacts = await this.db
      .select({
        id: contacts.id,
        displayName: contacts.displayName,
        primaryEmail: contacts.primaryEmail,
      })
      .from(contacts)
      .where(eq(contacts.userId, userId));

    // Get all existing consents for this user
    const existingConsents = await this.db
      .select({
        contactId: clientConsents.contactId,
        consentType: clientConsents.consentType,
        granted: clientConsents.granted,
      })
      .from(clientConsents)
      .where(eq(clientConsents.userId, userId));

    // Build map of contact → granted consent types
    const consentMap = new Map<string, Set<ConsentType>>();
    for (const consent of existingConsents) {
      if (consent.granted) {
        if (!consentMap.has(consent.contactId)) {
          consentMap.set(consent.contactId, new Set());
        }
        const consentSet = consentMap.get(consent.contactId);
        if (consentSet) {
          consentSet.add(consent.consentType as ConsentType);
        }
      }
    }

    // Find contacts missing any required consents
    const missingConsents: MissingConsentContact[] = [];
    for (const contact of allContacts) {
      const grantedConsents = consentMap.get(contact.id) ?? new Set<ConsentType>();
      const missing = requiredTypes.filter((type) => !grantedConsents.has(type));

      if (missing.length > 0) {
        missingConsents.push({
          contactId: contact.id,
          displayName: contact.displayName,
          primaryEmail: contact.primaryEmail,
          missingConsentTypes: missing,
        });
      }
    }

    return missingConsents;
  }

  /**
   * Create a task reminder to obtain consent
   */
  async createConsentReminderTask(
    userId: string,
    contactId: string,
    consentType: ConsentType,
    dueDate?: string,
  ): Promise<string> {
    // Get contact display name for task title
    const [contact] = await this.db
      .select({ displayName: contacts.displayName })
      .from(contacts)
      .where(and(eq(contacts.id, contactId), eq(contacts.userId, userId)))
      .limit(1);

    if (!contact) {
      throw new Error("Contact not found");
    }

    const taskName = `Obtain ${consentType} consent from ${contact.displayName}`;

    const [task] = await this.db
      .insert(tasks)
      .values({
        userId,
        name: taskName,
        status: "todo",
        priority: "high",
        dueDate: dueDate ?? null,
        details: {
          type: "consent_reminder",
          contactId,
          consentType,
          createdBy: "ai_compliance_tool",
        },
      })
      .returning();

    if (!task) {
      throw new Error("Failed to create task");
    }

    return task.id;
  }

  /**
   * Check HIPAA compliance for a contact
   */
  async checkHipaaCompliance(userId: string, contactId: string): Promise<{
    isCompliant: boolean;
    hasHipaaConsent: boolean;
    hasDataProcessingConsent: boolean;
    missingConsents: ConsentType[];
    issues: string[];
  }> {
    const consents = await this.getConsentStatus(userId, contactId);

    const consentMap = new Map<ConsentType, boolean>();
    for (const consent of consents) {
      // Only consider the latest consent for each type
      if (!consentMap.has(consent.consentType)) {
        consentMap.set(consent.consentType, consent.granted);
      }
    }

    const hasHipaaConsent = consentMap.get("hipaa") === true;
    const hasDataProcessingConsent = consentMap.get("data_processing") === true;

    const requiredForHipaa: ConsentType[] = ["hipaa", "data_processing"];
    const missingConsents = requiredForHipaa.filter(
      (type) => consentMap.get(type) !== true,
    );

    const issues: string[] = [];
    if (!hasHipaaConsent) {
      issues.push("Missing HIPAA consent - required for healthcare data processing");
    }
    if (!hasDataProcessingConsent) {
      issues.push("Missing data processing consent - required for storing client information");
    }

    const isCompliant = missingConsents.length === 0;

    return {
      isCompliant,
      hasHipaaConsent,
      hasDataProcessingConsent,
      missingConsents,
      issues,
    };
  }
}

/**
 * Create a ComplianceRepository instance bound to the provided DbClient.
 *
 * @returns A ComplianceRepository configured to use `db` for database operations
 */
export function createComplianceRepository(db: DbClient): ComplianceRepository {
  return new ComplianceRepository(db);
}