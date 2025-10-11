import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";
import { ok, err, DbResult } from "@/lib/utils/result";

// Database row types for query results
interface ContactIdentityRow {
  id: string;
  user_id: string;
  contact_id: string;
  kind: string;
  value: string;
  provider: string | null;
  created_at: string;
}

interface ContactIdRow {
  contact_id: string;
}

interface DuplicateIdentityRow {
  kind: string;
  value: string;
  provider: string | null;
  contact_ids: string[];
}

interface IdentityStatsRow {
  kind: string;
  count: string;
}

export interface ContactIdentity {
  id: string;
  userId: string;
  contactId: string;
  kind: "email" | "phone" | "handle" | "provider_id";
  value: string;
  provider?: string | null;
  createdAt: string;
}

export interface IdentityQuery {
  email?: string;
  phone?: string;
  handle?: string;
  provider?: string;
  providerId?: string;
}

export class IdentitiesRepository {
  /**
   * Add email identity for contact
   */
  async addEmail(userId: string, contactId: string, email: string): Promise<DbResult<void>> {
    return this.addIdentity(userId, contactId, "email", email.toLowerCase());
  }

  /**
   * Add phone identity for contact
   */
  async addPhone(userId: string, contactId: string, phone: string): Promise<void> {
    const normalizedPhone = this.normalizePhone(phone);
    await this.addIdentity(userId, contactId, "phone", normalizedPhone);
  }

  /**
   * Add handle identity for contact (e.g., social media handle)
   */
  async addHandle(
    userId: string,
    contactId: string,
    provider: string,
    handle: string,
  ): Promise<void> {
    await this.addIdentity(userId, contactId, "handle", handle.toLowerCase(), provider);
  }

  /**
   * Add provider-specific ID for contact
   */
  async addProviderId(
    userId: string,
    contactId: string,
    provider: string,
    providerId: string,
  ): Promise<void> {
    await this.addIdentity(userId, contactId, "provider_id", providerId, provider);
  }

  /**
   * Resolve contact ID from identity query
   */
  async resolve(userId: string, query: IdentityQuery): Promise<DbResult<string | null>> {
    try {
      if (query.email) {
        const contactId = await this.findByEmail(userId, query.email);
        if (contactId) return ok(contactId);
      }

      if (query.phone) {
        const contactId = await this.findByPhone(userId, query.phone);
        if (contactId) return ok(contactId);
      }

      if (query.handle && query.provider) {
        const contactId = await this.findByHandle(userId, query.provider, query.handle);
        if (contactId) return ok(contactId);
      }

      if (query.providerId && query.provider) {
        const contactId = await this.findByProviderId(userId, query.provider, query.providerId);
        if (contactId) return ok(contactId);
      }

      return ok(null);
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to resolve identity",
        details: error,
      });
    }
  }

  /**
   * Get all identities for a contact
   */
  async getContactIdentities(
    userId: string,
    contactId: string,
  ): Promise<DbResult<ContactIdentity[]>> {
    try {
      const db = await getDb();

      const result = await db.execute(sql`
        SELECT id, user_id, contact_id, kind, value, provider, created_at
        FROM contact_identities
        WHERE user_id = ${userId} AND contact_id = ${contactId}
        ORDER BY created_at ASC
      `);

      return ok((result as unknown as ContactIdentityRow[]).map(this.mapToContactIdentity));
    } catch (error) {
      return err({
        code: "DB_QUERY_FAILED",
        message: error instanceof Error ? error.message : "Failed to get contact identities",
        details: error,
      });
    }
  }

  /**
   * Get all contacts for an identity value
   */
  async findContactsByIdentity(
    userId: string,
    kind: ContactIdentity["kind"],
    value: string,
    provider?: string,
  ): Promise<string[]> {
    const db = await getDb();

    const normalizedValue =
      kind === "email" || kind === "handle"
        ? value.toLowerCase()
        : kind === "phone"
          ? this.normalizePhone(value)
          : value;

    const result = await db.execute(sql`
      SELECT DISTINCT contact_id
      FROM contact_identities
      WHERE user_id = ${userId}
        AND kind = ${kind}
        AND value = ${normalizedValue}
        ${provider ? sql`AND provider = ${provider}` : sql`AND provider IS NULL`}
    `);

    return (result as unknown as ContactIdRow[]).map((row) => row.contact_id);
  }

  /**
   * Remove identity
   */
  async removeIdentity(userId: string, identityId: string): Promise<void> {
    const db = await getDb();

    await db.execute(sql`
      DELETE FROM contact_identities
      WHERE id = ${identityId} AND user_id = ${userId}
    `);
  }

  /**
   * Remove all identities for a contact
   */
  async removeContactIdentities(userId: string, contactId: string): Promise<void> {
    const db = await getDb();

    await db.execute(sql`
      DELETE FROM contact_identities
      WHERE user_id = ${userId} AND contact_id = ${contactId}
    `);
  }

  /**
   * Find duplicate identities (same value, different contacts)
   */
  async findDuplicateIdentities(userId: string): Promise<
    Array<{
      kind: string;
      value: string;
      provider?: string;
      contactIds: string[];
    }>
  > {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT kind, value, provider, array_agg(contact_id) as contact_ids
      FROM contact_identities
      WHERE user_id = ${userId}
      GROUP BY kind, value, provider
      HAVING count(DISTINCT contact_id) > 1
    `);

    return (result as unknown as DuplicateIdentityRow[]).map((row) => {
      const mapped: {
        kind: string;
        value: string;
        provider?: string;
        contactIds: string[];
      } = {
        kind: row.kind,
        value: row.value,
        contactIds: row.contact_ids,
      };

      if (row.provider) {
        mapped.provider = row.provider;
      }

      return mapped;
    });
  }

  /**
   * Merge identities from one contact to another
   */
  async mergeIdentities(userId: string, fromContactId: string, toContactId: string): Promise<void> {
    const db = await getDb();

    // Update identities to new contact (ignoring conflicts)
    await db.execute(sql`
      UPDATE contact_identities
      SET contact_id = ${toContactId}
      WHERE user_id = ${userId} AND contact_id = ${fromContactId}
      ON CONFLICT (user_id, kind, value, coalesce(provider, ''))
      DO NOTHING
    `);

    // Remove any remaining duplicates
    await db.execute(sql`
      DELETE FROM contact_identities
      WHERE user_id = ${userId} AND contact_id = ${fromContactId}
    `);
  }

  /**
   * Get identity statistics for user
   */
  async getIdentityStats(userId: string): Promise<Record<string, number>> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT kind, count(*) as count
      FROM contact_identities
      WHERE user_id = ${userId}
      GROUP BY kind
    `);

    const stats: Record<string, number> = {};
    for (const row of result as unknown as IdentityStatsRow[]) {
      stats[row.kind] = parseInt(row.count, 10);
    }

    return stats;
  }

  private async addIdentity(
    userId: string,
    contactId: string,
    kind: ContactIdentity["kind"],
    value: string,
    provider?: string,
  ): Promise<DbResult<void>> {
    try {
      const db = await getDb();

      await db.execute(sql`
        INSERT INTO contact_identities (user_id, contact_id, kind, value, provider, created_at)
        VALUES (${userId}, ${contactId}, ${kind}, ${value}, ${provider ?? null}, ${new Date()})
        ON CONFLICT (user_id, kind, value, coalesce(provider, ''))
        DO UPDATE SET contact_id = EXCLUDED.contact_id
      `);

      return ok(undefined);
    } catch (error) {
      return err({
        code: "DB_INSERT_FAILED",
        message: error instanceof Error ? error.message : "Failed to add identity",
        details: error,
      });
    }
  }

  private async findByEmail(userId: string, email: string): Promise<string | null> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT contact_id
      FROM contact_identities
      WHERE user_id = ${userId}
        AND kind = 'email'
        AND value = ${email.toLowerCase()}
      LIMIT 1
    `);

    return result.length > 0 ? (result[0] as unknown as ContactIdRow).contact_id : null;
  }

  private async findByPhone(userId: string, phone: string): Promise<string | null> {
    const db = await getDb();
    const normalizedPhone = this.normalizePhone(phone);

    const result = await db.execute(sql`
      SELECT contact_id
      FROM contact_identities
      WHERE user_id = ${userId}
        AND kind = 'phone'
        AND value = ${normalizedPhone}
      LIMIT 1
    `);

    return result.length > 0 ? (result[0] as unknown as ContactIdRow).contact_id : null;
  }

  private async findByHandle(
    userId: string,
    provider: string,
    handle: string,
  ): Promise<string | null> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT contact_id
      FROM contact_identities
      WHERE user_id = ${userId}
        AND kind = 'handle'
        AND value = ${handle.toLowerCase()}
        AND provider = ${provider}
      LIMIT 1
    `);

    return result.length > 0 ? (result[0] as unknown as ContactIdRow).contact_id : null;
  }

  private async findByProviderId(
    userId: string,
    provider: string,
    providerId: string,
  ): Promise<string | null> {
    const db = await getDb();

    const result = await db.execute(sql`
      SELECT contact_id
      FROM contact_identities
      WHERE user_id = ${userId}
        AND kind = 'provider_id'
        AND value = ${providerId}
        AND provider = ${provider}
      LIMIT 1
    `);

    return result.length > 0 ? (result[0] as unknown as ContactIdRow).contact_id : null;
  }

  private normalizePhone(phone: string): string {
    // Basic phone normalization - remove non-digits
    // TODO: Implement proper E.164 formatting
    return phone.replace(/\D/g, "");
  }

  private mapToContactIdentity(row: ContactIdentityRow): ContactIdentity {
    return {
      id: row.id,
      userId: row.user_id,
      contactId: row.contact_id,
      kind: row.kind as ContactIdentity["kind"],
      value: row.value,
      provider: row.provider,
      createdAt: row.created_at,
    };
  }
}
