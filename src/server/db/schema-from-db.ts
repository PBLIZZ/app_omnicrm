import { pgTable, index, foreignKey, pgPolicy, check, uuid, text, boolean, integer, timestamp, jsonb, vector, uniqueIndex, date, numeric, unique, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const userSyncPrefs = pgTable("user_sync_prefs", {
	userId: uuid("user_id").primaryKey().notNull(),
	gmailQuery: text("gmail_query").default('category:primary -in:chats -in:drafts newer_than:30d').notNull(),
	gmailLabelIncludes: text("gmail_label_includes").array().default([""]).notNull(),
	gmailLabelExcludes: text("gmail_label_excludes").array().default(["Promotions", "Social", "Forums", "Updates"]).notNull(),
	calendarIncludeOrganizerSelf: boolean("calendar_include_organizer_self").default(true).notNull(),
	calendarIncludePrivate: boolean("calendar_include_private").default(false).notNull(),
	calendarTimeWindowDays: integer("calendar_time_window_days").default(60).notNull(),
	driveIngestionMode: text("drive_ingestion_mode").default('none').notNull(),
	driveFolderIds: text("drive_folder_ids").array().default([""]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_sync_prefs_updated_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.updatedAt.desc().nullsFirst().op("timestamp_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_sync_prefs_user_id_fkey"
		}),
	pgPolicy("user_sync_prefs_rw_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(user_id = auth.uid())`, withCheck: sql`(user_id = auth.uid())`  }),
	check("user_sync_prefs_drive_ingestion_mode_check", sql`drive_ingestion_mode = ANY (ARRAY['none'::text, 'picker'::text, 'folders'::text])`),
]);

export const syncAudit = pgTable("sync_audit", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	action: text().notNull(),
	payload: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sync_audit_user_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("sync_audit_user_created_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("sync_audit_user_provider_action_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.provider.asc().nullsLast().op("timestamp_ops"), table.action.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("sync_audit_user_provider_created_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.provider.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("sync_audit_user_recent_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "sync_audit_user_id_fkey"
		}),
	pgPolicy("sync_audit_rw_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(user_id = auth.uid())`, withCheck: sql`(user_id = auth.uid())`  }),
]);

export const contacts = pgTable("contacts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	displayName: text("display_name").notNull(),
	primaryEmail: text("primary_email"),
	primaryPhone: text("primary_phone"),
	source: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	stage: text(),
	tags: jsonb().default([]),
	confidenceScore: text("confidence_score"),
}, (table) => [
	index("contacts_user_created_display_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops"), table.displayName.asc().nullsLast().op("text_ops")),
	index("contacts_user_email_dedup_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.primaryEmail.asc().nullsLast().op("text_ops")).where(sql`((primary_email IS NOT NULL) AND (primary_email <> ''::text))`),
	index("contacts_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("contacts_user_phone_dedup_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.primaryPhone.asc().nullsLast().op("uuid_ops")).where(sql`((primary_phone IS NOT NULL) AND (primary_phone <> ''::text))`),
	index("contacts_user_search_email_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.primaryEmail.asc().nullsLast().op("uuid_ops")).where(sql`(primary_email IS NOT NULL)`),
	index("contacts_user_search_name_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.displayName.asc().nullsLast().op("text_ops")).where(sql`(display_name IS NOT NULL)`),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contacts_user_id_fkey"
		}),
	pgPolicy("contacts_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("contacts_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("contacts_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("contacts_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const documents = pgTable("documents", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	ownerContactId: uuid("owner_contact_id"),
	title: text(),
	mime: text(),
	text: text(),
	meta: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("documents_user_contact_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.ownerContactId.asc().nullsLast().op("uuid_ops")).where(sql`(owner_contact_id IS NOT NULL)`),
	index("documents_user_created_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("documents_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "documents_user_id_fkey"
		}),
	pgPolicy("documents_delete_own", { as: "permissive", for: "delete", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("documents_select_own", { as: "permissive", for: "select", to: ["authenticated"] }),
	pgPolicy("documents_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("documents_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
]);

export const aiInsights = pgTable("ai_insights", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	subjectType: text("subject_type").notNull(),
	subjectId: uuid("subject_id"),
	kind: text().notNull(),
	content: jsonb().notNull(),
	model: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ai_insights_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("ai_insights_user_kind_created_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.kind.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("ai_insights_user_recent_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("ai_insights_user_subject_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.subjectType.asc().nullsLast().op("uuid_ops"), table.subjectId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_insights_user_id_fkey"
		}),
	pgPolicy("ai_insights_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
]);

export const embeddings = pgTable("embeddings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	ownerType: text("owner_type").notNull(),
	ownerId: uuid("owner_id").notNull(),
	meta: jsonb(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	embedding: vector({ dimensions: 1536 }),
}, (table) => [
	index("embeddings_user_created_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	index("embeddings_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("embeddings_user_owner_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.ownerType.asc().nullsLast().op("text_ops"), table.ownerId.asc().nullsLast().op("uuid_ops")),
	index("embeddings_vec_idx").using("ivfflat", table.embedding.asc().nullsLast().op("vector_cosine_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "embeddings_user_id_fkey"
		}),
	pgPolicy("embeddings_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
]);

export const interactions = pgTable("interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	contactId: uuid("contact_id"),
	type: text().notNull(),
	subject: text(),
	bodyText: text("body_text"),
	bodyRaw: jsonb("body_raw"),
	occurredAt: timestamp("occurred_at", { mode: 'string' }).notNull(),
	source: text(),
	sourceId: text("source_id"),
	sourceMeta: jsonb("source_meta"),
	batchId: uuid("batch_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("interactions_contact_timeline_idx").using("btree", table.contactId.asc().nullsLast().op("timestamp_ops"), table.occurredAt.desc().nullsFirst().op("timestamp_ops")),
	index("interactions_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("interactions_user_occurred_at_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.occurredAt.desc().nullsFirst().op("uuid_ops")),
	index("interactions_user_source_batch_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.source.asc().nullsLast().op("text_ops"), table.batchId.asc().nullsLast().op("text_ops")).where(sql`(batch_id IS NOT NULL)`),
	uniqueIndex("interactions_user_source_sourceid_uidx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.source.asc().nullsLast().op("uuid_ops"), table.sourceId.asc().nullsLast().op("uuid_ops")),
	index("interactions_user_timeline_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.occurredAt.desc().nullsFirst().op("uuid_ops"), table.type.asc().nullsLast().op("uuid_ops")),
	index("interactions_user_type_recent_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.type.asc().nullsLast().op("text_ops"), table.occurredAt.desc().nullsFirst().op("uuid_ops")),
	index("interactions_user_unlinked_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.type.asc().nullsLast().op("uuid_ops"), table.contactId.asc().nullsLast().op("uuid_ops")).where(sql`(contact_id IS NULL)`),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "interactions_contact_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "interactions_contact_id_fkey"
		}),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "interactions_user_id_fkey"
		}),
	pgPolicy("interactions_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("interactions_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("interactions_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("interactions_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const rawEvents = pgTable("raw_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	payload: jsonb().notNull(),
	contactId: uuid("contact_id"),
	occurredAt: timestamp("occurred_at", { mode: 'string' }).notNull(),
	sourceMeta: jsonb("source_meta"),
	batchId: uuid("batch_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	sourceId: text("source_id"),
}, (table) => [
	index("raw_events_created_provider_idx").using("btree", table.createdAt.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops")),
	index("raw_events_provider_timeline_idx").using("btree", table.provider.asc().nullsLast().op("text_ops"), table.occurredAt.asc().nullsLast().op("text_ops")),
	index("raw_events_user_batch_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.batchId.asc().nullsLast().op("uuid_ops")).where(sql`(batch_id IS NOT NULL)`),
	index("raw_events_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("raw_events_user_provider_batch_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("text_ops"), table.batchId.asc().nullsLast().op("text_ops")),
	index("raw_events_user_provider_created_at_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.provider.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	index("raw_events_user_provider_occurred_at_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.provider.asc().nullsLast().op("uuid_ops"), table.occurredAt.desc().nullsFirst().op("timestamp_ops")),
	index("raw_events_user_provider_occurred_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.provider.asc().nullsLast().op("timestamp_ops"), table.occurredAt.desc().nullsFirst().op("text_ops")),
	index("raw_events_user_source_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.provider.asc().nullsLast().op("uuid_ops"), table.sourceId.asc().nullsLast().op("text_ops")).where(sql`(source_id IS NOT NULL)`),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "raw_events_contact_fk"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "raw_events_user_id_fkey"
		}),
	pgPolicy("raw_events_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
]);

export const jobs = pgTable("jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	kind: text().notNull(),
	payload: jsonb().notNull(),
	status: text().default('queued').notNull(),
	attempts: integer().default(0).notNull(),
	batchId: uuid("batch_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	lastError: text("last_error"),
}, (table) => [
	index("jobs_completed_status_created_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")).where(sql`(status = 'completed'::text)`),
	index("jobs_status_kind_priority_idx").using("btree", table.status.asc().nullsLast().op("text_ops"), table.kind.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")).where(sql`(status = ANY (ARRAY['queued'::text, 'running'::text]))`),
	index("jobs_user_batch_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.batchId.asc().nullsLast().op("uuid_ops")),
	index("jobs_user_batch_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.batchId.asc().nullsLast().op("uuid_ops")).where(sql`(batch_id IS NOT NULL)`),
	index("jobs_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("jobs_user_status_created_idx").using("btree", table.userId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops"), table.createdAt.asc().nullsLast().op("uuid_ops")),
	index("jobs_user_status_kind_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.status.asc().nullsLast().op("uuid_ops"), table.kind.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "jobs_user_id_fkey"
		}),
	pgPolicy("jobs_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("jobs_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("jobs_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("jobs_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const aiQuotas = pgTable("ai_quotas", {
	userId: uuid("user_id").primaryKey().notNull(),
	periodStart: date("period_start").notNull(),
	creditsLeft: integer("credits_left").notNull(),
}, (table) => [
	index("ai_quotas_period_credits_idx").using("btree", table.periodStart.asc().nullsLast().op("int4_ops"), table.creditsLeft.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_quotas_user_id_fkey"
		}),
	pgPolicy("ai_quotas_rw_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(user_id = auth.uid())`, withCheck: sql`(user_id = auth.uid())`  }),
]);

export const aiUsage = pgTable("ai_usage", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	model: text().notNull(),
	inputTokens: integer("input_tokens").default(0).notNull(),
	outputTokens: integer("output_tokens").default(0).notNull(),
	costUsd: numeric("cost_usd", { precision: 8, scale:  4 }).default('0').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("ai_usage_created_at_idx").using("btree", table.createdAt.desc().nullsFirst().op("timestamp_ops")),
	index("ai_usage_user_date_idx").using("btree", sql`user_id`, sql`((created_at)::date)`),
	index("ai_usage_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("ai_usage_user_recent_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.createdAt.desc().nullsFirst().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "ai_usage_user_id_fkey"
		}),
	pgPolicy("ai_usage_rw_own", { as: "permissive", for: "all", to: ["authenticated"], using: sql`(user_id = auth.uid())`, withCheck: sql`(user_id = auth.uid())`  }),
]);

export const threads = pgTable("threads", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	title: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("threads_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("threads_user_updated_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.updatedAt.desc().nullsFirst().op("timestamp_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "threads_user_id_fkey"
		}),
	pgPolicy("threads_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("threads_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("threads_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("threads_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	threadId: uuid("thread_id").notNull(),
	userId: uuid("user_id").notNull(),
	role: text().notNull(),
	content: jsonb().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("messages_thread_created_idx").using("btree", table.threadId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("uuid_ops")),
	index("messages_thread_id_idx").using("btree", table.threadId.asc().nullsLast().op("uuid_ops")),
	index("messages_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("messages_user_thread_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.threadId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("timestamp_ops")),
	foreignKey({
			columns: [table.threadId],
			foreignColumns: [threads.id],
			name: "messages_thread_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "messages_user_id_fkey"
		}),
	pgPolicy("messages_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("messages_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("messages_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("messages_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("messages_role_check", sql`role = ANY (ARRAY['user'::text, 'assistant'::text, 'tool'::text])`),
]);

export const toolInvocations = pgTable("tool_invocations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	messageId: uuid("message_id").notNull(),
	userId: uuid("user_id").notNull(),
	tool: text().notNull(),
	args: jsonb().notNull(),
	result: jsonb(),
	latencyMs: integer("latency_ms"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("tool_invocations_message_created_idx").using("btree", table.messageId.asc().nullsLast().op("timestamp_ops"), table.createdAt.asc().nullsLast().op("uuid_ops")),
	index("tool_invocations_message_id_idx").using("btree", table.messageId.asc().nullsLast().op("uuid_ops")),
	index("tool_invocations_user_id_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("tool_invocations_user_tool_idx").using("btree", table.userId.asc().nullsLast().op("timestamp_ops"), table.tool.asc().nullsLast().op("text_ops"), table.createdAt.desc().nullsFirst().op("text_ops")),
	foreignKey({
			columns: [table.messageId],
			foreignColumns: [messages.id],
			name: "tool_invocations_message_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tool_invocations_user_id_fkey"
		}),
	pgPolicy("toolinv_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("toolinv_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("toolinv_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("toolinv_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
]);

export const notes = pgTable("notes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	contactId: uuid("contact_id"),
	title: text(),
	content: text().notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_notes_contact_id").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	index("idx_notes_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_notes_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "notes_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "notes_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can manage their own notes", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
]);

export const calendarEvents = pgTable("calendar_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	googleEventId: text("google_event_id").notNull(),
	title: text().notNull(),
	description: text(),
	startTime: timestamp("start_time", { withTimezone: true, mode: 'string' }).notNull(),
	endTime: timestamp("end_time", { withTimezone: true, mode: 'string' }).notNull(),
	attendees: jsonb().default([]),
	location: text(),
	status: text().default('confirmed'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_calendar_events_attendees").using("gin", table.attendees.asc().nullsLast().op("jsonb_ops")),
	index("idx_calendar_events_google_id").using("btree", table.googleEventId.asc().nullsLast().op("text_ops")),
	index("idx_calendar_events_start_time").using("btree", table.startTime.asc().nullsLast().op("timestamptz_ops")),
	index("idx_calendar_events_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "calendar_events_user_id_fkey"
		}).onDelete("cascade"),
	unique("calendar_events_google_event_id_key").on(table.googleEventId),
	pgPolicy("Users can manage their own calendar events", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
]);

export const contactTimeline = pgTable("contact_timeline", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	contactId: uuid("contact_id").notNull(),
	eventType: text("event_type").notNull(),
	title: text().notNull(),
	description: text(),
	eventData: jsonb("event_data").default({}),
	occurredAt: timestamp("occurred_at", { withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_contact_timeline_contact_id").using("btree", table.contactId.asc().nullsLast().op("uuid_ops")),
	index("idx_contact_timeline_event_type").using("btree", table.eventType.asc().nullsLast().op("text_ops")),
	index("idx_contact_timeline_occurred_at").using("btree", table.occurredAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_contact_timeline_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.contactId],
			foreignColumns: [contacts.id],
			name: "contact_timeline_contact_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "contact_timeline_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can manage their own contact timeline", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
]);

export const projects = pgTable("projects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	color: text().default('#10B981'),
	status: text().default('active'),
	workspaceId: uuid("workspace_id"),
	userId: uuid("user_id").notNull(),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_projects_due_date").using("btree", table.dueDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_projects_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_projects_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_projects_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "projects_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "projects_workspace_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can manage their own projects", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
	check("projects_status_check", sql`status = ANY (ARRAY['active'::text, 'completed'::text, 'archived'::text])`),
]);

export const taskActions = pgTable("task_actions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	taskId: uuid("task_id").notNull(),
	userId: uuid("user_id").notNull(),
	action: text().notNull(),
	previousData: jsonb("previous_data").default({}),
	newData: jsonb("new_data").default({}),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_task_actions_action").using("btree", table.action.asc().nullsLast().op("text_ops")),
	index("idx_task_actions_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_task_actions_task_id").using("btree", table.taskId.asc().nullsLast().op("uuid_ops")),
	index("idx_task_actions_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.taskId],
			foreignColumns: [tasks.id],
			name: "task_actions_task_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "task_actions_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can manage their own task actions", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
	check("task_actions_action_check", sql`action = ANY (ARRAY['created'::text, 'updated'::text, 'completed'::text, 'approved'::text, 'rejected'::text, 'deleted'::text])`),
]);

export const workspaces = pgTable("workspaces", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	description: text(),
	color: text().default('#3B82F6'),
	userId: uuid("user_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isDefault: boolean("is_default").default(false).notNull(),
}, (table) => [
	index("idx_workspaces_created_at").using("btree", table.createdAt.desc().nullsFirst().op("timestamptz_ops")),
	index("idx_workspaces_is_default").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")).where(sql`(is_default = true)`),
	index("idx_workspaces_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "workspaces_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can manage their own workspaces", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
]);

export const tasks = pgTable("tasks", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: text().notNull(),
	description: text(),
	status: text().default('todo'),
	priority: text().default('medium'),
	color: text().default('#8B5CF6'),
	workspaceId: uuid("workspace_id"),
	projectId: uuid("project_id"),
	userId: uuid("user_id").notNull(),
	assignee: text(),
	dueDate: timestamp("due_date", { withTimezone: true, mode: 'string' }),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	parentTaskId: uuid("parent_task_id"),
	source: text().default('user').notNull(),
	approvalStatus: text("approval_status").default('approved').notNull(),
	taggedContacts: jsonb("tagged_contacts"),
	estimatedMinutes: integer("estimated_minutes"),
	actualMinutes: integer("actual_minutes"),
	aiContext: jsonb("ai_context"),
}, (table) => [
	index("idx_tasks_approval_status").using("btree", table.approvalStatus.asc().nullsLast().op("text_ops")),
	index("idx_tasks_assignee").using("btree", table.assignee.asc().nullsLast().op("text_ops")),
	index("idx_tasks_due_date").using("btree", table.dueDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_tasks_parent_task_id").using("btree", table.parentTaskId.asc().nullsLast().op("uuid_ops")),
	index("idx_tasks_priority").using("btree", table.priority.asc().nullsLast().op("text_ops")),
	index("idx_tasks_project_id").using("btree", table.projectId.asc().nullsLast().op("uuid_ops")),
	index("idx_tasks_source").using("btree", table.source.asc().nullsLast().op("text_ops")),
	index("idx_tasks_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_tasks_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("idx_tasks_workspace_id").using("btree", table.workspaceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.parentTaskId],
			foreignColumns: [table.id],
			name: "tasks_parent_task_id_fkey"
		}),
	foreignKey({
			columns: [table.projectId],
			foreignColumns: [projects.id],
			name: "tasks_project_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "tasks_user_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.workspaceId],
			foreignColumns: [workspaces.id],
			name: "tasks_workspace_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Users can manage their own tasks", { as: "permissive", for: "all", to: ["public"], using: sql`(user_id = auth.uid())` }),
	check("tasks_priority_check", sql`priority = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text, 'urgent'::text])`),
	check("tasks_status_check", sql`status = ANY (ARRAY['todo'::text, 'in_progress'::text, 'waiting'::text, 'done'::text, 'cancelled'::text])`),
]);

export const userIntegrations = pgTable("user_integrations", {
	userId: uuid("user_id").notNull(),
	provider: text().notNull(),
	accessToken: text("access_token").notNull(),
	refreshToken: text("refresh_token"),
	expiryDate: timestamp("expiry_date", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	service: text().default('auth').notNull(),
}, (table) => [
	index("idx_user_integrations_user_id").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	index("user_integrations_expiry_cleanup_idx").using("btree", table.expiryDate.asc().nullsLast().op("timestamptz_ops")).where(sql`(expiry_date IS NOT NULL)`),
	index("user_integrations_user_provider_service_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops"), table.provider.asc().nullsLast().op("text_ops"), table.service.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_integrations_user_id_fkey"
		}),
	primaryKey({ columns: [table.userId, table.provider, table.service], name: "user_integrations_pkey"}),
	pgPolicy("user_integrations_select_own", { as: "permissive", for: "select", to: ["authenticated"], using: sql`(user_id = auth.uid())` }),
	pgPolicy("user_integrations_insert_own", { as: "permissive", for: "insert", to: ["authenticated"] }),
	pgPolicy("user_integrations_update_own", { as: "permissive", for: "update", to: ["authenticated"] }),
	pgPolicy("user_integrations_delete_own", { as: "permissive", for: "delete", to: ["authenticated"] }),
	check("user_integrations_service_check", sql`service = ANY (ARRAY['auth'::text, 'gmail'::text, 'calendar'::text, 'drive'::text])`),
]);
