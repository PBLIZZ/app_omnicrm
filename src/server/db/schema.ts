import { pgTable, uuid, text, timestamp, jsonb, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// contacts
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  displayName: text("display_name").notNull(),
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),
  source: text("source"), // gmail_import|manual|upload
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// interactions (normalized events)
export const interactions = pgTable("interactions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  contactId: uuid("contact_id").references(() => contacts.id),
  type: text("type").notNull(), // email|sms|call|meeting|note|web
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyRaw: jsonb("body_raw"),   // lossless snippet or provider payload
  occurredAt: timestamp("occurred_at").notNull(),
  source: text("source"),       // gmail|calendar|manual
  sourceId: text("source_id"),  // provider message id
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// raw_events (lossless ingestion)
export const rawEvents = pgTable("raw_events", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  provider: text("provider").notNull(), // gmail|calendar|upload
  payload: jsonb("payload").notNull(),
  contactId: uuid("contact_id"),        // nullable until resolved
  occurredAt: timestamp("occurred_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// documents (extracted text)
export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerContactId: uuid("owner_contact_id"),
  title: text("title"),
  mime: text("mime"),
  text: text("text"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// embeddings (pgvector-backed)
export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerType: text("owner_type").notNull(), // interaction|document|contact
  ownerId: uuid("owner_id").notNull(),
  // vector column added via raw SQL migration; reference by name "embedding"
  // we'll create an index with IVFFlat
  // meta: chunk index, model, etc.
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ai_insights (cached AI results)
export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  subjectType: text("subject_type").notNull(), // contact|segment|inbox
  subjectId: uuid("subject_id"),
  kind: text("kind").notNull(), // summary|next_step|risk|persona
  content: jsonb("content").notNull(), // structured JSON from LLM
  model: text("model"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// jobs (simple queue)
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  kind: text("kind").notNull(), // normalize|embed|insight
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
