// Optimized OmniClient Repository with Query Caching and Performance Improvements
import { and, asc, desc, eq, gte, ilike, lte, or, sql, type SQL, inArray } from "drizzle-orm";
import { getDb } from "@/server/db/client";
import { contacts, notes } from "@/server/db/schema";
import { queryCache, cacheKeys, cacheInvalidation } from "@/server/lib/cache";
import { logger } from "@/lib/observability";
import { generateUniqueSlug } from "@/server/lib/utils/generate-unique-slug";
// Types moved from contacts.repo.ts
export type ContactListParams = {
  search?: string;
  sort?: "displayName" | "createdAt";
  order?: "asc" | "desc";
  page: number;
  pageSize: number;
  dateRange?: { from?: Date; to?: Date };
};

export type ContactListItem = {
  id: string;
  userId: string;
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: string | null;
  slug: string | null;
  stage: string | null;
  tags: unknown;
  confidenceScore: string | null;
  createdAt: Date;
  updatedAt: Date;
  notesCount: number;
  lastNote: string | null;
};

export type CreateContactValues = {
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: "manual" | "gmail_import" | "upload" | "calendar_import";
};

/**
 * Optimized contact listing with query result caching and improved performance
 * Addresses N+1 problems and implements intelligent caching strategies
 */
export async function listContacts(
  userId: string,
  params: ContactListParams,
): Promise<{ items: ContactListItem[]; total: number }> {
  const dbo = await getDb();

  // Generate cache key based on query parameters
  const paramsHash = Buffer.from(JSON.stringify(params)).toString("base64").slice(0, 12);
  const cacheKey = cacheKeys.contactsList(userId, paramsHash);
  const countCacheKey = cacheKeys.contactsCount(userId, params.search ?? "");

  // Use cached result if available (5 minute TTL for lists, 10 minutes for counts)
  return queryCache.get(
    cacheKey,
    async () => {
      const startTime = Date.now();

      // Build optimized WHERE clause
      let whereExpr: SQL<unknown> = eq(contacts.userId, userId);

      if (params.search) {
        const needle = `%${params.search}%`;
        // Use optimized search indexes (contacts_user_search_name_idx, contacts_user_search_email_idx)
        whereExpr = and(
          whereExpr,
          or(
            ilike(contacts.displayName, needle),
            ilike(contacts.primaryEmail, needle),
            ilike(contacts.primaryPhone, needle),
          ),
        ) as SQL<unknown>;
      }

      if (params.dateRange?.from) {
        whereExpr = and(
          whereExpr,
          gte(contacts.createdAt, params.dateRange.from as Date),
        ) as SQL<unknown>;
      }

      if (params.dateRange?.to) {
        whereExpr = and(
          whereExpr,
          lte(contacts.createdAt, params.dateRange.to as Date),
        ) as SQL<unknown>;
      }

      // Optimized ordering using composite indexes
      const sortKey = params.sort ?? "displayName";
      const sortDir = params.order === "desc" ? "desc" : "asc";

      let orderExpr;
      if (sortKey === "createdAt") {
        // Use contacts_user_created_display_idx for date sorting
        orderExpr = sortDir === "desc" ? desc(contacts.createdAt) : asc(contacts.createdAt);
      } else {
        // Use contacts_user_search_name_idx for name sorting
        orderExpr = sortDir === "desc" ? desc(contacts.displayName) : asc(contacts.displayName);
      }

      const page = params.page;
      const pageSize = Math.min(params.pageSize, 100); // Cap page size for performance

      // Execute both queries in parallel for better performance
      const [items, totalResult] = await Promise.all([
        // Main query using optimized indexes
        dbo
          .select({
            id: contacts.id,
            userId: contacts.userId,
            displayName: contacts.displayName,
            primaryEmail: contacts.primaryEmail,
            primaryPhone: contacts.primaryPhone,
            source: contacts.source,
            slug: contacts.slug,
            stage: contacts.stage,
            tags: contacts.tags,
            confidenceScore: contacts.confidenceScore,
            createdAt: contacts.createdAt,
            updatedAt: contacts.updatedAt,
            notesCount: sql<number>`COALESCE((
              SELECT COUNT(*) 
              FROM ${notes} 
              WHERE ${notes.contactId} = ${contacts.id} 
              AND ${notes.userId} = ${contacts.userId}
            ), 0)`,
            lastNote: sql<string | null>`(
              SELECT ${notes.content}
              FROM ${notes}
              WHERE ${notes.contactId} = ${contacts.id}
              AND ${notes.userId} = ${contacts.userId}
              ORDER BY ${notes.createdAt} DESC
              LIMIT 1
            )`,
          })
          .from(contacts)
          .where(whereExpr)
          .orderBy(orderExpr)
          .limit(pageSize)
          .offset((page - 1) * pageSize),

        // Count query with separate caching
        queryCache.get(
          countCacheKey,
          () =>
            dbo
              .select({ n: sql<number>`count(*)` })
              .from(contacts)
              .where(whereExpr)
              .limit(1),
          600, // 10 minute TTL for counts
        ),
      ]);

      const queryTime = Date.now() - startTime;

      // Log performance metrics
      await logger.info("Contacts list query executed", {
        operation: "db_query",
        additionalData: {
          op: "contacts.list_optimized",
          userId,
          search: !!params.search,
          pageSize,
          resultCount: items.length,
          queryTime,
          cacheHit: false,
        },
      });

      const result = {
        items: items.map((r) => ({
          id: r.id,
          userId: r.userId,
          displayName: r.displayName,
          primaryEmail: r.primaryEmail ?? null,
          primaryPhone: r.primaryPhone ?? null,
          source: r.source ?? null,
          slug: r.slug ?? null,
          stage: r.stage ?? null,
          tags: r.tags ?? null,
          confidenceScore: r.confidenceScore ?? null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          notesCount: r.notesCount ?? 0,
          lastNote: r.lastNote ?? null,
        })),
        total: Number(totalResult[0]?.n) ?? 0,
      };

      return result;
    },
    300, // 5 minute TTL for paginated results
  );
}

/**
 * Create a single contact with proper slug generation
 */
export async function createContact(
  userId: string,
  values: CreateContactValues,
): Promise<ContactListItem | null> {
  const dbo = await getDb();

  // Generate unique slug for the new contact
  const slug = await generateUniqueSlug(values.displayName, userId);

  const [row] = await dbo
    .insert(contacts)
    .values({
      userId,
      displayName: values.displayName,
      primaryEmail: values.primaryEmail,
      primaryPhone: values.primaryPhone,
      source: values.source,
      slug,
    })
    .returning({
      id: contacts.id,
      userId: contacts.userId,
      displayName: contacts.displayName,
      primaryEmail: contacts.primaryEmail,
      primaryPhone: contacts.primaryPhone,
      source: contacts.source,
      slug: contacts.slug,
      stage: contacts.stage,
      tags: contacts.tags,
      confidenceScore: contacts.confidenceScore,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    });

  if (!row) return null;

  return {
    id: row.id,
    userId: row.userId,
    displayName: row.displayName,
    primaryEmail: row.primaryEmail ?? null,
    primaryPhone: row.primaryPhone ?? null,
    source: row.source ?? null,
    slug: row.slug ?? null,
    stage: row.stage ?? null,
    tags: row.tags ?? null,
    confidenceScore: row.confidenceScore ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    notesCount: 0, // New contact has no notes
    lastNote: null, // New contact has no notes
  };
}

/**
 * Bulk contact creation with optimized batch processing
 * Prevents N+1 queries and implements intelligent deduplication
 */
export async function createContactsBatch(
  userId: string,
  contactsData: Array<{
    displayName: string;
    primaryEmail?: string | null;
    primaryPhone?: string | null;
    source: "gmail_import" | "manual" | "upload";
  }>,
): Promise<{ created: ContactListItem[]; duplicates: number; errors: number }> {
  const dbo = await getDb();
  const startTime = Date.now();

  // Extract emails and phones for bulk deduplication check
  const emails = contactsData
    .map((c) => c.primaryEmail)
    .filter((email): email is string => !!email);

  const phones = contactsData
    .map((c) => c.primaryPhone)
    .filter((phone): phone is string => !!phone);

  // Bulk check for existing contacts using optimized indexes
  const [existingByEmail, existingByPhone] = await Promise.all([
    emails.length > 0
      ? dbo
          .select({ primaryEmail: contacts.primaryEmail, id: contacts.id })
          .from(contacts)
          .where(and(eq(contacts.userId, userId), inArray(contacts.primaryEmail, emails)))
      : [],

    phones.length > 0
      ? dbo
          .select({ primaryPhone: contacts.primaryPhone, id: contacts.id })
          .from(contacts)
          .where(and(eq(contacts.userId, userId), inArray(contacts.primaryPhone, phones)))
      : [],
  ]);

  // Create lookup sets for fast deduplication
  const existingEmails = new Set(existingByEmail.map((c) => c.primaryEmail));
  const existingPhones = new Set(existingByPhone.map((c) => c.primaryPhone));

  // Filter out duplicates
  const toCreate = contactsData.filter((contact) => {
    if (contact.primaryEmail && existingEmails.has(contact.primaryEmail)) return false;
    if (contact.primaryPhone && existingPhones.has(contact.primaryPhone)) return false;
    return true;
  });

  const duplicates = contactsData.length - toCreate.length;
  const created: ContactListItem[] = [];
  let errors = 0;

  // Batch insert in chunks for optimal performance
  const chunkSize = 100;
  for (let i = 0; i < toCreate.length; i += chunkSize) {
    const chunk = toCreate.slice(i, i + chunkSize);

    try {
      const insertResult = await dbo
        .insert(contacts)
        .values(
          chunk.map((contact) => ({
            userId,
            displayName: contact.displayName,
            primaryEmail: contact.primaryEmail,
            primaryPhone: contact.primaryPhone,
            source: contact.source,
          })),
        )
        .returning({
          id: contacts.id,
          userId: contacts.userId,
          displayName: contacts.displayName,
          primaryEmail: contacts.primaryEmail,
          primaryPhone: contacts.primaryPhone,
          source: contacts.source,
          slug: contacts.slug,
          stage: contacts.stage,
          tags: contacts.tags,
          confidenceScore: contacts.confidenceScore,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
        });

      // Map created contacts to proper ContactListItem objects
      const mappedContacts: ContactListItem[] = insertResult.map((row) => ({
        id: row.id,
        userId: row.userId,
        displayName: row.displayName,
        primaryEmail: row.primaryEmail ?? null,
        primaryPhone: row.primaryPhone ?? null,
        source: row.source ?? null,
        slug: row.slug ?? null,
        stage: row.stage ?? null,
        tags: row.tags ?? null,
        confidenceScore: row.confidenceScore ?? null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        notesCount: 0, // New contacts have 0 notes
        lastNote: null, // New contacts have no last note
      }));
      created.push(...mappedContacts);
    } catch (error) {
      await logger.error(
        "Batch contact creation failed",
        {
          operation: "db_query",
          additionalData: {
            op: "contacts.batch_create_error",
            userId,
            chunkSize: chunk.length,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        error instanceof Error ? error : undefined,
      );

      errors += chunk.length;
    }
  }

  // Invalidate related caches
  cacheInvalidation.invalidateContacts(userId);

  const duration = Date.now() - startTime;

  await logger.info("Batch contact creation completed", {
    operation: "db_query",
    additionalData: {
      op: "contacts.batch_create",
      userId,
      requested: contactsData.length,
      created: created.length,
      duplicates,
      errors,
      duration,
    },
  });

  return { created, duplicates, errors };
}

/**
 * Optimized contact search with fuzzy matching and ranking
 * Uses full-text search capabilities for better performance
 */
export async function searchContactsOptimized(
  userId: string,
  query: string,
  limit: number = 25,
): Promise<ContactListItem[]> {
  const dbo = await getDb();
  const cacheKey = `contact_search:${userId}:${Buffer.from(query).toString("base64").slice(0, 16)}`;

  return queryCache.get(
    cacheKey,
    async () => {
      const startTime = Date.now();

      // Use optimized search with ranking
      const searchQuery = `%${query.trim()}%`;

      const results = await dbo
        .select({
          id: contacts.id,
          userId: contacts.userId,
          displayName: contacts.displayName,
          primaryEmail: contacts.primaryEmail,
          primaryPhone: contacts.primaryPhone,
          source: contacts.source,
          slug: contacts.slug,
          stage: contacts.stage,
          tags: contacts.tags,
          confidenceScore: contacts.confidenceScore,
          createdAt: contacts.createdAt,
          updatedAt: contacts.updatedAt,
          notesCount: sql<number>`COALESCE((
            SELECT COUNT(*) 
            FROM ${notes} 
            WHERE ${notes.contactId} = ${contacts.id} 
            AND ${notes.userId} = ${contacts.userId}
          ), 0)`,
          lastNote: sql<string | null>`(
            SELECT ${notes.content}
            FROM ${notes}
            WHERE ${notes.contactId} = ${contacts.id}
            AND ${notes.userId} = ${contacts.userId}
            ORDER BY ${notes.createdAt} DESC
            LIMIT 1
          )`,
          // Add relevance ranking
          relevance: sql<number>`
            CASE 
              WHEN ${contacts.displayName} ILIKE ${query + "%"} THEN 1
              WHEN ${contacts.primaryEmail} ILIKE ${query + "%"} THEN 2  
              WHEN ${contacts.displayName} ILIKE ${searchQuery} THEN 3
              WHEN ${contacts.primaryEmail} ILIKE ${searchQuery} THEN 4
              ELSE 5
            END
          `.as("relevance"),
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.userId, userId),
            or(
              ilike(contacts.displayName, searchQuery),
              ilike(contacts.primaryEmail, searchQuery),
              ilike(contacts.primaryPhone, searchQuery),
            ),
          ),
        )
        .orderBy(sql`relevance`, desc(contacts.updatedAt))
        .limit(limit);

      const queryTime = Date.now() - startTime;

      await logger.info("Contact search executed", {
        operation: "db_query",
        additionalData: {
          op: "contacts.search_optimized",
          userId,
          query: query.slice(0, 50), // Log first 50 chars
          resultCount: results.length,
          queryTime,
        },
      });

      return results.map((r) => ({
        id: r.id,
        userId: r.userId,
        displayName: r.displayName,
        primaryEmail: r.primaryEmail ?? null,
        primaryPhone: r.primaryPhone ?? null,
        source: r.source ?? null,
        slug: r.slug ?? null,
        stage: r.stage ?? null,
        tags: r.tags ?? null,
        confidenceScore: r.confidenceScore ?? null,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        notesCount: r.notesCount ?? 0,
        lastNote: r.lastNote ?? null,
      }));
    },
    180, // 3 minute TTL for search results
  );
}

/**
 * Get contact statistics with caching
 */
export async function getContactStatsOptimized(userId: string): Promise<{
  total: number;
  bySource: Record<string, number>;
  recentlyAdded: number; // Last 7 days
  withEmail: number;
  withPhone: number;
}> {
  const cacheKey = `contact_stats:${userId}`;

  return queryCache.get(
    cacheKey,
    async () => {
      const dbo = await getDb();
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

      // Execute all stat queries in parallel
      const [totalResult, bySourceResult, recentResult, withEmailResult, withPhoneResult] =
        await Promise.all([
          dbo
            .select({ count: sql<number>`count(*)` })
            .from(contacts)
            .where(eq(contacts.userId, userId)),

          dbo
            .select({
              source: contacts.source,
              count: sql<number>`count(*)`,
            })
            .from(contacts)
            .where(eq(contacts.userId, userId))
            .groupBy(contacts.source),

          dbo
            .select({ count: sql<number>`count(*)` })
            .from(contacts)
            .where(and(eq(contacts.userId, userId), gte(contacts.createdAt, sevenDaysAgo))),

          dbo
            .select({ count: sql<number>`count(*)` })
            .from(contacts)
            .where(
              and(
                eq(contacts.userId, userId),
                sql`${contacts.primaryEmail} IS NOT NULL AND ${contacts.primaryEmail} != ''`,
              ),
            ),

          dbo
            .select({ count: sql<number>`count(*)` })
            .from(contacts)
            .where(
              and(
                eq(contacts.userId, userId),
                sql`${contacts.primaryPhone} IS NOT NULL AND ${contacts.primaryPhone} != ''`,
              ),
            ),
        ]);

      const bySource: Record<string, number> = {};
      bySourceResult.forEach((row) => {
        bySource[row.source ?? "unknown"] = Number(row.count);
      });

      return {
        total: Number(totalResult[0]?.count ?? 0),
        bySource,
        recentlyAdded: Number(recentResult[0]?.count ?? 0),
        withEmail: Number(withEmailResult[0]?.count ?? 0),
        withPhone: Number(withPhoneResult[0]?.count ?? 0),
      };
    },
    600, // 10 minute TTL for stats
  );
}
