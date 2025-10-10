// Generated Drizzle schema based on Supabase database structure
// Synced with database.types.ts for complete accuracy

import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  boolean,
  integer,
  date,
  inet,
  pgEnum,
  numeric,
  primaryKey,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums from database
export const consentTypeEnum = pgEnum("consent_type", [
  "data_processing",
  "marketing",
  "hipaa",
  "photography",
]);
export const fileTypeEnum = pgEnum("file_type", ["photo", "document", "form"]);
export const providerTypeEnum = pgEnum("provider_type", ["gmail", "calendar", "drive", "upload"]);
export const goalStatusEnum = pgEnum("goal_status", [
  "on_track",
  "at_risk",
  "achieved",
  "abandoned",
]);
export const goalTypeEnum = pgEnum("goal_type", [
  "practitioner_business",
  "practitioner_personal",
  "client_wellness",
]);
export const noteSourceTypeEnum = pgEnum("note_source_type", ["typed", "voice", "upload"]);
export const inboxItemStatusEnum = pgEnum("inbox_item_status", [
  "unprocessed",
  "processed",
  "archived",
]);
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "on_hold",
  "completed",
  "archived",
]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done", "canceled"]);

// ============================================================================
// CRM - Customer Relationship Management
// ============================================================================

// Client Tables
export const clientConsents = pgTable("client_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  userId: uuid("user_id").notNull(),
  consentType: consentTypeEnum("consent_type").notNull(),
  consentTextVersion: text("consent_text_version").notNull(),
  granted: boolean("granted").default(true),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  signatureSvg: text("signature_svg"),
  signatureImageUrl: text("signature_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const clientFiles = pgTable("client_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  userId: uuid("user_id").notNull(),
  fileType: fileTypeEnum("file_type").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Contact Tables
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  displayName: text("display_name").notNull(),
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),
  photoUrl: text("photo_url"),
  source: text("source"),
  lifecycleStage: text("lifecycle_stage"),
  clientStatus: text("client_status"),
  referralSource: text("referral_source"),
  confidenceScore: text("confidence_score"),
  dateOfBirth: date("date_of_birth"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  address: jsonb("address"),
  healthContext: jsonb("health_context"),
  preferences: jsonb("preferences"),
  tags: jsonb("tags"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  contentRich: jsonb("content_rich").notNull().default({}),
  contentPlain: text("content_plain").notNull().default(""),
  piiEntities: jsonb("pii_entities").notNull().default([]),
  tags: text("tags").array().notNull().default([]),
  sourceType: noteSourceTypeEnum("source_type").notNull().default("typed"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const photoAccessAudit = pgTable("photo_access_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  photoPath: text("photo_path").notNull(),
  accessedAt: timestamp("accessed_at", { withTimezone: true }).defaultNow(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const onboardingTokens = pgTable("onboarding_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  token: text("token").notNull().unique(),
  label: text("label"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  maxUses: integer("max_uses").default(1).notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  createdBy: uuid("created_by").notNull(),
  disabled: boolean("disabled").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// PRODUCTIVITY SUITE - Tasks, Goals, Projects
// ============================================================================

// Core Tables
export const dailyPulseLogs = pgTable("daily_pulse_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  logDate: date("log_date").notNull(),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const noteGoals = pgTable(
  "note_goals",
  {
    noteId: uuid("note_id")
      .notNull()
      .references(() => notes.id, { onDelete: "cascade" }),
    goalId: uuid("goal_id")
      .notNull()
      .references(() => goals.id, { onDelete: "cascade" }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.noteId, table.goalId] }),
  }),
);

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id").references(() => contacts.id),
  name: text("name").notNull(),
  goalType: goalTypeEnum("goal_type").notNull(),
  status: goalStatusEnum("status").default("on_track").notNull(),
  targetDate: date("target_date"),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const inboxItems = pgTable("inbox_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  rawText: text("raw_text").notNull(),
  status: inboxItemStatusEnum("status").default("unprocessed").notNull(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdTaskId: uuid("created_task_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  status: projectStatusEnum("status").default("active").notNull(),
  dueDate: date("due_date"),
  details: jsonb("details"),
  zoneId: integer("zone_id").references(() => zones.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// Self-referential table: tasks can have parent tasks
// TypeScript can't infer the type correctly due to circular reference
// @ts-expect-error - TS7022: Self-referential table definition
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  // @ts-expect-error - TS7024: Self-referential foreign key
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
  parentTaskId: uuid("parent_task_id").references(() => tasks.id),
  name: text("name").notNull(),
  status: taskStatusEnum("status").default("todo").notNull(),
  priority: taskPriorityEnum("priority").default("medium").notNull(),
  dueDate: date("due_date"),
  details: jsonb("details"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const taskContactTags = pgTable(
  "task_contact_tags",
  {
    taskId: uuid("task_id")
      .notNull()
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      .references(() => tasks.id),
    contactId: uuid("contact_id")
      .notNull()
      .references(() => contacts.id),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.taskId, t.contactId] }),
  }),
);

export const zones = pgTable("zones", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  color: text("color"),
  iconName: text("icon_name"),
});

// ============================================================================
// DATA INTELLIGENCE - Raw Events, Interactions, AI Insights
// ============================================================================

export const aiInsights = pgTable("ai_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  subjectType: text("subject_type").notNull(),
  subjectId: uuid("subject_id"),
  kind: text("kind").notNull(),
  content: jsonb("content").notNull(),
  model: text("model"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  fingerprint: text("fingerprint"),
});

export const contactIdentities = pgTable("contact_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  provider: text("provider"),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  ownerType: text("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  embedding: text("embedding"),
  embeddingV: text("embedding_v"),
  contentHash: text("content_hash"),
  chunkIndex: integer("chunk_index"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  ownerContactId: uuid("owner_contact_id"),
  title: text("title"),
  text: text("text"),
  mime: text("mime"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const ignoredIdentifiers = pgTable("ignored_identifiers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  value: text("value").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id")
    .notNull()
    .references(() => contacts.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  subject: text("subject"),
  bodyText: text("body_text"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  source: text("source"),
  sourceId: text("source_id").notNull(),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const rawEvents = pgTable("raw_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: providerTypeEnum("provider").notNull(),
  payload: jsonb("payload").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  sourceId: text("source_id").notNull(),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  // Processing state columns (added in migration 40)
  processingStatus: text("processing_status").default("pending"),
  processingAttempts: integer("processing_attempts").default(0),
  processingError: text("processing_error"),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  // Contact extraction workflow (added in migration 46, enhanced in 50)
  contactExtractionStatus: text("contact_extraction_status"),
  extractedAt: timestamp("extracted_at", { withTimezone: true }),
});

// ============================================================================
// ADMIN - User Management, Jobs, Quotas
// ============================================================================

// User Tables
export const userIntegrations = pgTable(
  "user_integrations",
  {
    userId: uuid("user_id").notNull(),
    provider: text("provider").notNull(),
    service: text("service").notNull(),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token"),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),
    config: jsonb("config"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.provider, t.service] }),
  }),
);

export const aiQuotas = pgTable("ai_quotas", {
  userId: uuid("user_id").primaryKey().notNull(),
  creditsLeft: integer("credits_left").notNull(),
  periodStart: timestamp("period_start", { withTimezone: true }).notNull(),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  costUsd: numeric("cost_usd").default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload"),
  status: text("status").default("queued").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  result: jsonb("result"),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// ============================================================================
// AI CHAT - Threads, Messages, Tool Invocations
// ============================================================================

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  threadId: uuid("thread_id")
    .notNull()
    .references(() => threads.id),
  role: text("role").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const toolInvocations = pgTable("tool_invocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => messages.id),
  tool: text("tool").notNull(),
  args: jsonb("args").notNull(),
  result: jsonb("result"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// ============================================================================
// RELATIONS - Inferred from Foreign Keys
// ============================================================================

export const clientConsentsRelations = relations(clientConsents, ({ one }) => ({
  contact: one(contacts, {
    fields: [clientConsents.contactId],
    references: [contacts.id],
  }),
}));

export const clientFilesRelations = relations(clientFiles, ({ one }) => ({
  contact: one(contacts, {
    fields: [clientFiles.contactId],
    references: [contacts.id],
  }),
}));

export const contactIdentitiesRelations = relations(contactIdentities, ({ one }) => ({
  contact: one(contacts, {
    fields: [contactIdentities.contactId],
    references: [contacts.id],
  }),
}));

export const goalsRelations = relations(goals, ({ one }) => ({
  contact: one(contacts, {
    fields: [goals.contactId],
    references: [contacts.id],
  }),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  contact: one(contacts, {
    fields: [interactions.contactId],
    references: [contacts.id],
  }),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  thread: one(threads, {
    fields: [messages.threadId],
    references: [threads.id],
  }),
}));

export const notesRelations = relations(notes, ({ one, many }) => ({
  contact: one(contacts, {
    fields: [notes.contactId],
    references: [contacts.id],
  }),
  noteGoals: many(noteGoals),
}));

export const noteGoalsRelations = relations(noteGoals, ({ one }) => ({
  note: one(notes, {
    fields: [noteGoals.noteId],
    references: [notes.id],
  }),
  goal: one(goals, {
    fields: [noteGoals.goalId],
    references: [goals.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  zone: one(zones, {
    fields: [projects.zoneId],
    references: [zones.id],
  }),
}));

// Raw events no longer have direct contact relations - contact linking happens in interactions table

export const taskContactTagsRelations = relations(taskContactTags, ({ one }) => ({
  task: one(tasks, {
    fields: [taskContactTags.taskId],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    references: [tasks.id],
  }),
  contact: one(contacts, {
    fields: [taskContactTags.contactId],
    references: [contacts.id],
  }),
}));

export const tasksRelations = relations(tasks, ({ one }) => ({
  project: one(projects, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    fields: [tasks.projectId],
    references: [projects.id],
  }),
  parentTask: one(tasks, {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    fields: [tasks.parentTaskId],
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    references: [tasks.id],
  }),
}));

export const toolInvocationsRelations = relations(toolInvocations, ({ one }) => ({
  message: one(messages, {
    fields: [toolInvocations.messageId],
    references: [messages.id],
  }),
}));

// ============================================================================
// TYPE EXPORTS - Inferred from Drizzle Schema
// ============================================================================

// Core entity types inferred from Drizzle schema
export type Contact = typeof contacts.$inferSelect;
export type CreateContact = typeof contacts.$inferInsert;
export type UpdateContact = Partial<CreateContact>;

export type Note = typeof notes.$inferSelect;
export type CreateNote = typeof notes.$inferInsert;
export type UpdateNote = Partial<CreateNote>;

export type NoteGoal = typeof noteGoals.$inferSelect;
export type CreateNoteGoal = typeof noteGoals.$inferInsert;

export type Interaction = typeof interactions.$inferSelect;
export type CreateInteraction = typeof interactions.$inferInsert;
export type UpdateInteraction = Partial<CreateInteraction>;

export type Task = typeof tasks.$inferSelect;
export type CreateTask = typeof tasks.$inferInsert;
export type UpdateTask = Partial<CreateTask>;

export type Project = typeof projects.$inferSelect;
export type CreateProject = typeof projects.$inferInsert;
export type UpdateProject = Partial<CreateProject>;

export type Zone = typeof zones.$inferSelect;
export type CreateZone = typeof zones.$inferInsert;
export type UpdateZone = Partial<CreateZone>;

export type AiInsight = typeof aiInsights.$inferSelect;
export type CreateAiInsight = typeof aiInsights.$inferInsert;
export type UpdateAiInsight = Partial<CreateAiInsight>;

export type Job = typeof jobs.$inferSelect;
export type CreateJob = typeof jobs.$inferInsert;

export type UserIntegration = typeof userIntegrations.$inferSelect;
export type CreateUserIntegration = typeof userIntegrations.$inferInsert;

export type InboxItem = typeof inboxItems.$inferSelect;
export type CreateInboxItem = typeof inboxItems.$inferInsert;
export type UpdateInboxItem = Partial<CreateInboxItem>;

export type Goal = typeof goals.$inferSelect;
export type CreateGoal = typeof goals.$inferInsert;

export type DailyPulseLog = typeof dailyPulseLogs.$inferSelect;
export type CreateDailyPulseLog = typeof dailyPulseLogs.$inferInsert;

export type RawEvent = typeof rawEvents.$inferSelect;
export type CreateRawEvent = typeof rawEvents.$inferInsert;
export type UpdateRawEvent = Partial<CreateRawEvent>;

export type IgnoredIdentifier = typeof ignoredIdentifiers.$inferSelect;
export type CreateIgnoredIdentifier = typeof ignoredIdentifiers.$inferInsert;
export type UpdateIgnoredIdentifier = Partial<CreateIgnoredIdentifier>;

export type ContactIdentity = typeof contactIdentities.$inferSelect;
export type CreateContactIdentity = typeof contactIdentities.$inferInsert;
export type UpdateContactIdentity = Partial<CreateContactIdentity>;

export type Embedding = typeof embeddings.$inferSelect;
export type CreateEmbedding = typeof embeddings.$inferInsert;
export type UpdateEmbedding = Partial<CreateEmbedding>;

export type IntelligenceDocument = typeof documents.$inferSelect;
export type CreateIntelligenceDocument = typeof documents.$inferInsert;
export type UpdateIntelligenceDocument = Partial<CreateIntelligenceDocument>;

export type Thread = typeof threads.$inferSelect;
export type CreateThread = typeof threads.$inferInsert;
export type UpdateThread = Partial<CreateThread>;

export type Message = typeof messages.$inferSelect;
export type CreateMessage = typeof messages.$inferInsert;
export type UpdateMessage = Partial<CreateMessage>;

export type ToolInvocation = typeof toolInvocations.$inferSelect;
export type CreateToolInvocation = typeof toolInvocations.$inferInsert;
export type UpdateToolInvocation = Partial<CreateToolInvocation>;

// Extended types for common patterns
export type ContactWithNotes = Contact & { notes: Note[] };
export type ThreadWithMessages = Thread & { messages: Message[] };
export type MessageWithTools = Message & { toolInvocations: ToolInvocation[] };
