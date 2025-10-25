// Utility for getting contact context

import { getDb } from "@/server/db/client";
import { contacts, interactions, notes } from "@/server/db/schema";
import { eq, sql } from "drizzle-orm";
import { logger } from "@/lib/observability";
import type { InferSelectModel } from "drizzle-orm";

// Type for raw SQL query results
interface QueryResultRow {
  data_type: string;
  data: unknown;
}

interface BatchQueryResultRow {
  contact_id: string;
  contact: unknown;
  interactions: unknown;
  notes: unknown;
}

interface FetchOptions {
  includeEvents?: boolean;
  includeInteractions?: boolean;
  includeNotes?: boolean;
  limit?: number;
}

// Default fetch options - immutable constant
const DEFAULT_FETCH_OPTIONS: Readonly<FetchOptions> = {
  includeEvents: true,
  includeInteractions: true,
  includeNotes: true,
  limit: 20,
} as const;

export interface ContactWithContext {
  contact: InferSelectModel<typeof contacts> | null;
  interactions: InferSelectModel<typeof interactions>[];
  notes: InferSelectModel<typeof notes>[];
}

export interface BatchContactWithContext {
  contactId: string;
  contact: InferSelectModel<typeof contacts> | null;
  interactions: InferSelectModel<typeof interactions>[];
  notes: InferSelectModel<typeof notes>[];
}

export async function getContactData(
  userId: string,
  contactId: string,
  _options: FetchOptions = {},
): Promise<ContactWithContext> {
  // Merge provided options with defaults
  const mergedOptions = { ...DEFAULT_FETCH_OPTIONS, ..._options };
  const db = await getDb();

  const contact = await db.query.contacts.findFirst({
    where: eq(contacts.id, contactId),
  });

  if (!contact || contact.userId !== userId) {
    return { contact: null, interactions: [], notes: [] };
  }

  // OPTIMIZED: Use single query with JOINs instead of 5 separate queries
  const contactDataResult = await db.execute(sql`
    WITH contact_events AS (
      SELECT 
        ce.title,
        ce.description,
        ce.location,
        ce.start_time,
        ce.end_time,
        ce.event_type,
        ce.business_category,
        ce.attendees,
        ce.created_at
      FROM calendar_events ce
      WHERE ce.user_id = ${userId}
        AND ce.attendees IS NOT NULL
        AND (${contact.primaryEmail ? sql`ce.attendees::text LIKE ${`%${contact.primaryEmail}%`}` : sql`1=1`})
      ORDER BY ce.start_time DESC
      LIMIT ${mergedOptions.limit}
    ),
    contact_interactions AS (
      SELECT 
        i.id,
        i.contact_id,
        i.type,
        i.occurred_at,
        i.details,
        i.created_at
      FROM interactions i
      WHERE i.user_id = ${userId} AND i.contact_id = ${contactId}
      ORDER BY i.occurred_at DESC
      LIMIT ${mergedOptions.limit}
    ),
    contact_notes AS (
      SELECT 
        n.id,
        n.contact_id,
        n.content_plain,
        n.content_rich,
        n.source_type,
        n.created_at,
        n.updated_at
      FROM notes n
      WHERE n.user_id = ${userId} AND n.contact_id = ${contactId}
      ORDER BY n.created_at DESC
      LIMIT ${mergedOptions.limit}
    ),
    SELECT 
      'events' as data_type,
      json_agg(ce.*) as data
    FROM contact_events ce
    UNION ALL
    SELECT 
      'interactions' as data_type,
      json_agg(ci.*) as data
    FROM contact_interactions ci
    UNION ALL
    SELECT 
      'notes' as data_type,
      json_agg(cn.*) as data
    FROM contact_notes cn
    UNION ALL
  `);

  // Parse the results
  const rows = contactDataResult as unknown as QueryResultRow[];
  const interactionsRow = rows.find((row) => row.data_type === "interactions");
  const notesRow = rows.find((row) => row.data_type === "notes");

  const interactionsData = (interactionsRow?.data || []) as InferSelectModel<typeof interactions>[];
  const notesData = (notesRow?.data || []) as InferSelectModel<typeof notes>[];

  void logger.info("Contact data loaded with optimized query", {
    operation: "load_contact_context_optimized",
  });

  return {
    contact,
    interactions: interactionsData,
    notes: notesData,
  };
}

/**
 * Batch version of getContactData - fetches data for multiple contacts in a single query
 * This eliminates the N+1 problem when processing multiple contacts
 */
export async function getBatchContactData(
  userId: string,
  contactIds: string[],
  _options: FetchOptions = {},
): Promise<BatchContactWithContext[]> {
  if (contactIds.length === 0) {
    return [];
  }

  const db = await getDb();

  // OPTIMIZED: Single query for all contacts using CTEs and JSON aggregation
  const batchResult = await db.execute(sql`
    WITH contact_data AS (
      SELECT 
        c.id as contact_id,
        c.*
      FROM contacts c
      WHERE c.id = ANY(${contactIds}) AND c.user_id = ${userId}
    ),
    contact_events AS (
      SELECT 
        cd.contact_id,
        ce.title,
        ce.description,
        ce.location,
        ce.start_time,
        ce.end_time,
        ce.event_type,
        ce.business_category,
        ce.attendees,
        ce.created_at
      FROM contact_data cd
      LEFT JOIN calendar_events ce ON (
        ce.user_id = ${userId}
        AND ce.attendees IS NOT NULL
        AND (cd.primary_email IS NULL OR ce.attendees::text LIKE '%' || cd.primary_email || '%')
      )
      ORDER BY cd.contact_id, ce.start_time DESC
    ),
    contact_interactions AS (
      SELECT 
        cd.contact_id,
        i.id,
        i.contact_id as interaction_contact_id,
        i.type,
        i.occurred_at,
        i.details,
        i.created_at
      FROM contact_data cd
      LEFT JOIN interactions i ON (i.user_id = ${userId} AND i.contact_id = cd.contact_id)
      ORDER BY cd.contact_id, i.occurred_at DESC
    ),
    contact_notes AS (
      SELECT 
        cd.contact_id,
        n.id,
        n.contact_id as note_contact_id,
        n.content_plain,
        n.content_rich,
        n.source_type,
        n.created_at,
        n.updated_at
      FROM contact_data cd
      LEFT JOIN notes n ON (n.user_id = ${userId} AND n.contact_id = cd.contact_id)
      ORDER BY cd.contact_id, n.created_at DESC
    ),
    SELECT 
      cd.contact_id,
      json_build_object(
        'id', cd.id,
        'user_id', cd.user_id,
        'display_name', cd.display_name,
        'primary_email', cd.primary_email,
        'primary_phone', cd.primary_phone,
        'photo_url', cd.photo_url,
        'source', cd.source,
        'lifecycle_stage', cd.lifecycle_stage,
        'confidence_score', cd.confidence_score,
        'date_of_birth', cd.date_of_birth,
        'emergency_contact_name', cd.emergency_contact_name,
        'emergency_contact_phone', cd.emergency_contact_phone,
        'client_status', cd.client_status,
        'referral_source', cd.referral_source,
        'address', cd.address,
        'health_context', cd.health_context,
        'preferences', cd.preferences,
        'created_at', cd.created_at,
        'updated_at', cd.updated_at
      ) as contact,
      COALESCE(
        json_agg(
          CASE WHEN ce.contact_id IS NOT NULL THEN
            json_build_object(
              'title', ce.title,
              'description', ce.description,
              'location', ce.location,
              'start_time', ce.start_time,
              'end_time', ce.end_time,
              'event_type', ce.event_type,
              'business_category', ce.business_category,
              'attendees', ce.attendees,
              'created_at', ce.created_at
            )
          END
        ) FILTER (WHERE ce.contact_id IS NOT NULL),
        '[]'::json
      ) as calendar_events,
      COALESCE(
        json_agg(
          CASE WHEN ci.contact_id IS NOT NULL THEN
            json_build_object(
              'id', ci.id,
              'contact_id', ci.interaction_contact_id,
              'type', ci.type,
              'occurred_at', ci.occurred_at,
              'details', ci.details,
              'created_at', ci.created_at
            )
          END
        ) FILTER (WHERE ci.contact_id IS NOT NULL),
        '[]'::json
      ) as interactions,
      COALESCE(
        json_agg(
          CASE WHEN cn.contact_id IS NOT NULL THEN
            json_build_object(
              'id', cn.id,
              'contact_id', cn.note_contact_id,
              'content_plain', cn.content_plain,
              'content_rich', cn.content_rich,
              'source_type', cn.source_type,
              'created_at', cn.created_at,
              'updated_at', cn.updated_at
            )
          END
        ) FILTER (WHERE cn.contact_id IS NOT NULL),
        '[]'::json
      ) as notes,
      COALESCE(
        json_agg(
          CASE WHEN ct.contact_id IS NOT NULL THEN
            json_build_object(
              'id', ct.id,
              'contact_id', cd.contact_id,
              'contact_id', cd.contact_id,
              'content_plain', cd.content_plain,
              'content_rich', cd.content_rich,
              'source_type', cd.source_type,
              'created_at', cd.created_at,
              'updated_at', cd.updated_at
            )
          END
        ) FILTER (WHERE cn.contact_id IS NOT NULL),
        '[]'::json
      ) as notes
  `);

  void logger.info("Batch contact data loaded with optimized query", {
    operation: "load_batch_contact_context_optimized",
  });

  const rows = batchResult as unknown as BatchQueryResultRow[];
  return rows.map((row) => ({
    contactId: row.contact_id,
    contact: row.contact as InferSelectModel<typeof contacts> | null,
    interactions: (row.interactions || []) as InferSelectModel<typeof interactions>[],
    notes: (row.notes || []) as InferSelectModel<typeof notes>[],
  }));
}
