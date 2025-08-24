// SCHEMA: canonical — keep this file in sync with the SQL in supabase/sql/
// NOTE: This file is TYPES-ONLY. Schema changes (tables, FKs, indexes, RLS) are applied via SQL in Supabase.
// Keep the shapes in here in sync with the SQL under supabase/sql/*. Drizzle is not used for migrations.
// We purposefully do NOT model FKs to auth.users here; we just use userId: uuid across tables.

import {
  pgTable,
  boolean,
  uuid,
  text,
  timestamp,
  jsonb,
  integer,
  numeric,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ---------- Helpers ----------

// vector(1536) custom type for pgvector (embeddings.embedding)
import { customType } from "drizzle-orm/pg-core";
export const vector1536 = customType<{ data: number[] | null; driverData: unknown }>({
  dataType() {
    return "vector(1536)";
  },
});

// Message role enum (user/assistant/tool) — matches check constraint in SQL
export const messageRoleEnum = pgEnum("message_role_enum", ["user", "assistant", "tool"]);
// (We still keep column as text to match the raw SQL; enum is here for typing convenience)

// ---------- Core Tables ----------

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  subjectType: text("subject_type").notNull(), // contact | segment | inbox
  subjectId: uuid("subject_id"),
  kind: text("kind").notNull(), // summary | next_step | risk | persona
  content: jsonb("content").notNull(), // structured LLM output
  model: text("model"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const aiQuotas = pgTable("ai_quotas", {
  userId: uuid("user_id").primaryKey(), // references auth.users(id) in SQL
  periodStart: timestamp("period_start", { mode: "date" }).notNull(),
  creditsLeft: integer("credits_left").notNull(),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  costUsd: numeric("cost_usd", { precision: 8, scale: 4 }).notNull().default("0"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  displayName: text("display_name").notNull(),
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),
  source: text("source"), // gmail_import | manual | upload
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  ownerContactId: uuid("owner_contact_id"),
  title: text("title"),
  mime: text("mime"),
  textContent: text("text"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const embeddings = pgTable("embeddings", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  ownerType: text("owner_type").notNull(), // interaction | document | contact
  ownerId: uuid("owner_id").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  // Optional in code (present in DB via SQL): vector(1536)
  embedding: vector1536("embedding"),
});

export const interactions = pgTable("interactions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(), // FK to user.id in SQL
  contactId: uuid("contact_id"), // FK to contacts.id in SQL; nullable
  type: text("type").notNull(), // email | call | meeting | note | web
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyRaw: jsonb("body_raw"),
  occurredAt: timestamp("occurred_at").notNull(),
  source: text("source"), // gmail | calendar | manual
  sourceId: text("source_id"),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(), // normalize | embed | insight | sync_*
  payload: jsonb("payload").notNull(),
  status: text("status").notNull().default("queued"),
  attempts: integer("attempts").notNull().default(0),
  batchId: uuid("batch_id"),
  lastError: text("last_error"), // ✅ new (nullable)
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const rawEvents = pgTable("raw_events", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(), // gmail | calendar | drive | upload
  payload: jsonb("payload").notNull(),
  contactId: uuid("contact_id"),
  occurredAt: timestamp("occurred_at").notNull(),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  sourceId: text("source_id"), // ✅ new (nullable)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Chat Trio ----------

export const threads = pgTable("threads", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  threadId: uuid("thread_id").notNull(), // FK to threads(id) in SQL
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant' | 'tool'
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const toolInvocations = pgTable("tool_invocations", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  messageId: uuid("message_id").notNull(), // FK to messages(id) in SQL
  userId: uuid("user_id").notNull(),
  tool: text("tool").notNull(),
  args: jsonb("args").notNull(),
  result: jsonb("result"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Integrations & Sync Scaffolding ----------

export const userIntegrations = pgTable(
  "user_integrations",
  {
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(), // 'google'
    service: text("service").notNull().default("auth"), // 'auth' | 'gmail' | 'calendar' | 'drive'
    accessToken: text("access_token").notNull(), // store app-encrypted
    refreshToken: text("refresh_token"),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.provider, t.service] })],
);

export const userSyncPrefs = pgTable("user_sync_prefs", {
  userId: uuid("user_id").primaryKey(),
  gmailQuery: text("gmail_query")
    .notNull()
    .default("category:primary -in:chats -in:drafts newer_than:30d"),
  gmailLabelIncludes: text("gmail_label_includes")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  gmailLabelExcludes: text("gmail_label_excludes")
    .array()
    .notNull()
    .default(sql`'{Promotions,Social,Forums,Updates}'::text[]`),
  calendarIncludeOrganizerSelf: boolean("calendar_include_organizer_self").notNull().default(true), // ✅ matches SQL default true
  calendarIncludePrivate: boolean("calendar_include_private").notNull().default(false), // ✅ matches SQL default false
  calendarTimeWindowDays: integer("calendar_time_window_days").notNull().default(60),
  driveIngestionMode: text("drive_ingestion_mode").notNull().default("none"), // none | picker | folders
  driveFolderIds: text("drive_folder_ids")
    .array()
    .notNull()
    .default(sql`'{}'::text[]`),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const syncAudit = pgTable("sync_audit", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(), // gmail | calendar | drive
  action: text("action").notNull(), // preview | approve | undo
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- Types ----------

export type AiInsight = typeof aiInsights.$inferSelect;
export type NewAiInsight = typeof aiInsights.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type Document = typeof documents.$inferSelect;
export type NewDocument = typeof documents.$inferInsert;

export type Embedding = typeof embeddings.$inferSelect;
export type NewEmbedding = typeof embeddings.$inferInsert;

export type Interaction = typeof interactions.$inferSelect;
export type NewInteraction = typeof interactions.$inferInsert;

export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;

export type RawEvent = typeof rawEvents.$inferSelect;
export type NewRawEvent = typeof rawEvents.$inferInsert;

export type Thread = typeof threads.$inferSelect;
export type NewThread = typeof threads.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type ToolInvocation = typeof toolInvocations.$inferSelect;
export type NewToolInvocation = typeof toolInvocations.$inferInsert;

export type UserIntegration = typeof userIntegrations.$inferSelect;
export type NewUserIntegration = typeof userIntegrations.$inferInsert;

export type UserSyncPrefs = typeof userSyncPrefs.$inferSelect;
export type NewUserSyncPrefs = typeof userSyncPrefs.$inferInsert;

export type SyncAudit = typeof syncAudit.$inferSelect;
export type NewSyncAudit = typeof syncAudit.$inferInsert;

export type AiQuota = typeof aiQuotas.$inferSelect;
export type NewAiQuota = typeof aiQuotas.$inferInsert;

export type AiUsage = typeof aiUsage.$inferSelect;
export type NewAiUsage = typeof aiUsage.$inferInsert;
