import {
  pgTable,
  foreignKey,
  pgPolicy,
  uuid,
  date,
  integer,
  index,
  text,
  numeric,
  timestamp,
  jsonb,
  vector,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const aiQuotas = pgTable(
  "ai_quotas",
  {
    userId: uuid("user_id").primaryKey().notNull(),
    periodStart: date("period_start").notNull(),
    creditsLeft: integer("credits_left").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "ai_quotas_user_id_fkey",
    }),
    pgPolicy("ai_quotas_rw_own", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
      withCheck: sql`(user_id = auth.uid())`,
    }),
  ],
);

export const aiUsage = pgTable(
  "ai_usage",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    model: text().notNull(),
    inputTokens: integer("input_tokens").default(0).notNull(),
    outputTokens: integer("output_tokens").default(0).notNull(),
    costUsd: numeric("cost_usd", { precision: 8, scale: 4 }).default("0").notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("ai_usage_created_at_idx").using(
      "btree",
      table.createdAt.desc().nullsFirst().op("timestamp_ops"),
    ),
    index("ai_usage_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "ai_usage_user_id_fkey",
    }),
    pgPolicy("ai_usage_rw_own", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
      withCheck: sql`(user_id = auth.uid())`,
    }),
  ],
);

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
  (table) => [
    index("documents_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "documents_user_id_fkey",
    }),
    pgPolicy("documents_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("documents_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("documents_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("documents_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
  ],
);

export const embeddings = pgTable(
  "embeddings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    ownerType: text("owner_type").notNull(),
    ownerId: uuid("owner_id").notNull(),
    meta: jsonb(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
    embedding: vector({ dimensions: 1536 }),
  },
  (table) => [
    index("embeddings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    index("embeddings_vec_idx").using(
      "ivfflat",
      table.embedding.asc().nullsLast().op("vector_cosine_ops"),
    ),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "embeddings_user_id_fkey",
    }),
    pgPolicy("embeddings_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
  ],
);

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
  (table) => [
    index("ai_insights_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "ai_insights_user_id_fkey",
    }),
    pgPolicy("ai_insights_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
  ],
);

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
  (table) => [
    index("interactions_contact_timeline_idx").using(
      "btree",
      table.contactId.asc().nullsLast().op("timestamp_ops"),
      table.occurredAt.desc().nullsFirst().op("timestamp_ops"),
    ),
    index("interactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.contactId],
      foreignColumns: [contacts.id],
      name: "interactions_contact_id_contacts_id_fk",
    }),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "interactions_user_id_fkey",
    }),
    pgPolicy("interactions_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("interactions_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("interactions_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("interactions_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
  ],
);

export const rawEvents = pgTable(
  "raw_events",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    provider: text().notNull(),
    payload: jsonb().notNull(),
    contactId: uuid("contact_id"),
    occurredAt: timestamp("occurred_at", { mode: "string" }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("raw_events_provider_timeline_idx").using(
      "btree",
      table.provider.asc().nullsLast().op("text_ops"),
      table.occurredAt.asc().nullsLast().op("text_ops"),
    ),
    index("raw_events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "raw_events_user_id_fkey",
    }),
    pgPolicy("raw_events_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("raw_events_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("raw_events_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("raw_events_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
  ],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    kind: text().notNull(),
    payload: jsonb().notNull(),
    status: text().default("queued").notNull(),
    attempts: integer().default(0).notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    index("jobs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "jobs_user_id_fkey",
    }),
    pgPolicy("jobs_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("jobs_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("jobs_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("jobs_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
  ],
);

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
  (table) => [
    index("contacts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "contacts_user_id_fkey",
    }),
    pgPolicy("contacts_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("contacts_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("contacts_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("contacts_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
  ],
);

export const threads = pgTable(
  "threads",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    title: text(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("threads_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "threads_user_id_fkey",
    }),
    pgPolicy("threads_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("threads_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("threads_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("threads_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
  ],
);

export const messages = pgTable(
  "messages",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    threadId: uuid("thread_id").notNull(),
    userId: uuid("user_id").notNull(),
    role: text().notNull(),
    content: jsonb().notNull(),
    createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  },
  (table) => [
    index("messages_thread_id_idx").using("btree", table.threadId.asc().nullsLast().op("uuid_ops")),
    index("messages_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [threads.id],
      name: "messages_thread_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "messages_user_id_fkey",
    }),
    pgPolicy("messages_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("messages_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("messages_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("messages_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
    check(
      "messages_role_check",
      sql`role = ANY (ARRAY['user'::text, 'assistant'::text, 'tool'::text])`,
    ),
  ],
);

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
  (table) => [
    index("tool_invocations_message_id_idx").using(
      "btree",
      table.messageId.asc().nullsLast().op("uuid_ops"),
    ),
    index("tool_invocations_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
    ),
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [messages.id],
      name: "tool_invocations_message_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "tool_invocations_user_id_fkey",
    }),
    pgPolicy("toolinv_select_own", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(user_id = auth.uid())`,
    }),
    pgPolicy("toolinv_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
    pgPolicy("toolinv_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("toolinv_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
  ],
);
