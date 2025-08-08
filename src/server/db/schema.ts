import { pgTable, uuid, text, timestamp, jsonb, integer, index } from "drizzle-orm/pg-core";
import { sql, desc } from "drizzle-orm";

// contacts
export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    displayName: text("display_name").notNull(),
    primaryEmail: text("primary_email"),
    primaryPhone: text("primary_phone"),
    source: text("source"), // gmail_import|manual|upload
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("contacts_user_id_idx").on(t.userId),
  }),
);

// interactions (normalized events)
export const interactions = pgTable(
  "interactions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    contactId: uuid("contact_id").references(() => contacts.id),
    type: text("type").notNull(), // email|sms|call|meeting|note|web
    subject: text("subject"),
    bodyText: text("body_text"),
    bodyRaw: jsonb("body_raw"),
    occurredAt: timestamp("occurred_at").notNull(),
    source: text("source"),
    sourceId: text("source_id"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("interactions_contact_timeline_idx").on(t.contactId, desc(t.occurredAt)),
    index("interactions_user_id_idx").on(t.userId),
  ],
);

// raw_events (lossless ingestion)
export const rawEvents = pgTable(
  "raw_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(), // gmail|calendar|upload
    payload: jsonb("payload").notNull(),
    contactId: uuid("contact_id"), // nullable until resolved
    occurredAt: timestamp("occurred_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    providerTimelineIdx: index("raw_events_provider_timeline_idx").on(t.provider, t.occurredAt),
    userIdIdx: index("raw_events_user_id_idx").on(t.userId),
  }),
);

// documents (extracted text)
export const documents = pgTable(
  "documents",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    ownerContactId: uuid("owner_contact_id"),
    title: text("title"),
    mime: text("mime"),
    text: text("text"),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("documents_user_id_idx").on(t.userId),
  }),
);

// embeddings (pgvector-backed)
export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    ownerType: text("owner_type").notNull(), // interaction|document|contact
    ownerId: uuid("owner_id").notNull(),
    // vector column added via raw SQL migration; reference by name "embedding"
    // we'll create an index with IVFFlat
    // meta: chunk index, model, etc.
    meta: jsonb("meta"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("embeddings_user_id_idx").on(t.userId),
  }),
);

// ai_insights (cached AI results)
export const aiInsights = pgTable(
  "ai_insights",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    subjectType: text("subject_type").notNull(), // contact|segment|inbox
    subjectId: uuid("subject_id"),
    kind: text("kind").notNull(), // summary|next_step|risk|persona
    content: jsonb("content").notNull(), // structured JSON from LLM
    model: text("model"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("ai_insights_user_id_idx").on(t.userId),
  }),
);

// jobs (simple queue)
export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    kind: text("kind").notNull(), // normalize|embed|insight
    payload: jsonb("payload").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index("jobs_user_id_idx").on(t.userId),
  }),
);
