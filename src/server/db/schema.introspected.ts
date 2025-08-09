import {
  pgSchema,
  pgTable,
  uuid,
  text,
  jsonb,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";

// --- Reference to auth.users (read-only representation for FKs) ---
const auth = pgSchema("auth");
export const usersInAuth = auth.table("users", {
  id: uuid("id").primaryKey().notNull(),
});

// --- ai_insights ---
export const aiInsights = pgTable(
  "ai_insights",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id"),
    kind: text().notNull(),
    content: jsonb().notNull(),
    model: text(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [index("ai_insights_user_id_idx").on(t.userId)],
);

// --- contacts ---
export const contacts = pgTable(
  "contacts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    displayName: text("display_name").notNull(),
    primaryEmail: text("primary_email"),
    primaryPhone: text("primary_phone"),
    source: text(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [index("contacts_user_id_idx").on(t.userId)],
);

// --- documents ---
export const documents = pgTable(
  "documents",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ownerContactId: uuid("owner_contact_id"),
    title: text(),
    mime: text(),
    text: text(),
    meta: jsonb(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [index("documents_user_id_idx").on(t.userId)],
);

// --- embeddings ---
// NOTE: embedding (vector) is intentionally NOT modeled in Drizzle. We manage it via SQL.
export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ownerType: text("owner_type").notNull(), // interaction|document|contact
    ownerId: uuid("owner_id").notNull(),
    meta: jsonb(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [index("embeddings_user_id_idx").on(t.userId)],
);

// --- interactions ---
export const interactions = pgTable(
  "interactions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    contactId: uuid("contact_id"),
    type: text().notNull(),
    subject: text(),
    bodyText: text("body_text"),
    bodyRaw: jsonb("body_raw"),
    occurredAt: timestamp("occurred_at", { mode: "string" }).notNull(),
    source: text(),
    sourceId: text("source_id"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [
    index("interactions_contact_timeline_idx").on(t.contactId, desc(t.occurredAt)),
    index("interactions_user_id_idx").on(t.userId),
  ],
);

// --- jobs ---
export const jobs = pgTable(
  "jobs",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    kind: text().notNull(), // normalize|embed|insight|gmail_sync|calendar_sync...
    payload: jsonb().notNull(),
    status: text().default("queued").notNull(),
    attempts: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [index("jobs_user_id_idx").on(t.userId)],
);

// --- raw_events ---
export const rawEvents = pgTable(
  "raw_events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    provider: text().notNull(), // gmail|calendar|upload
    payload: jsonb().notNull(),
    contactId: uuid("contact_id"),
    occurredAt: timestamp("occurred_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (t) => [
    index("raw_events_provider_timeline_idx").on(t.provider, t.occurredAt),
    index("raw_events_user_id_idx").on(t.userId),
  ],
);

// --- threads ---
export const threads = pgTable(
  "threads",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    title: text(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [index("threads_user_id_idx").on(t.userId)],
);

// --- messages ---
export const messages = pgTable(
  "messages",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    threadId: uuid("thread_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text().notNull(), // user|assistant|tool
    content: jsonb().notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("messages_thread_id_idx").on(t.threadId),
    index("messages_user_id_idx").on(t.userId),
  ],
);

// --- tool_invocations ---
export const toolInvocations = pgTable(
  "tool_invocations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    messageId: uuid("message_id").notNull(),
    userId: uuid("user_id").notNull(),
    tool: text().notNull(),
    args: jsonb().notNull(),
    result: jsonb(),
    latencyMs: integer("latency_ms"),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (t) => [
    index("tool_invocations_message_id_idx").on(t.messageId),
    index("tool_invocations_user_id_idx").on(t.userId),
  ],
);
