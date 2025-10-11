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
  uniqueIndex,
  numeric,
} from "drizzle-orm/pg-core";

// Enums from database
export const consentTypeEnum = pgEnum("consent_type", [
  "data_processing",
  "marketing",
  "hipaa",
  "photography",
]);
export const fileTypeEnum = pgEnum("file_type", ["photo", "document", "form"]);
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

// AI Tables
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

export const aiQuotas = pgTable("ai_quotas", {
  userId: uuid("user_id").notNull().primaryKey(),
  creditsLeft: integer("credits_left").notNull(),
  periodStart: timestamp("period_start").notNull(),
});

export const aiUsage = pgTable("ai_usage", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  model: text("model").notNull(),
  inputTokens: integer("input_tokens").default(0),
  outputTokens: integer("output_tokens").default(0),
  costUsd: numeric("cost_usd").default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar Tables
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    isAllDay: boolean("is_all_day"),
    timeZone: text("time_zone"),
    location: text("location"),
    status: text("status"),
    visibility: text("visibility"),
    eventType: text("event_type"),
    businessCategory: text("business_category"),
    googleEventId: text("google_event_id").notNull(),
    googleUpdated: timestamp("google_updated", { withTimezone: true }),
    lastSynced: timestamp("last_synced", { withTimezone: true }),
    attendees: jsonb("attendees"),
    keywords: jsonb("keywords"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  },
  (table) => ({
    userGoogleEventUidx: uniqueIndex("calendar_events_user_google_event_uidx").on(
      table.userId,
      table.googleEventId,
    ),
  }),
);

// Client Tables
export const clientConsents = pgTable("client_consents", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  userId: uuid("user_id").notNull(),
  granted: boolean("granted").default(true),
  consentTextVersion: text("consent_text_version").notNull(),
  grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  signatureSvg: text("signature_svg"),
  signatureImageUrl: text("signature_image_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  consentType: consentTypeEnum("consent_type").notNull(),
});

export const clientFiles = pgTable("client_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  userId: uuid("user_id").notNull(),
  filePath: text("file_path").notNull(),
  mimeType: text("mime_type"),
  fileSize: integer("file_size"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  fileType: fileTypeEnum("file_type").default("photo"),
});

// Contact Tables
export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  displayName: text("display_name").notNull(),
  primaryEmail: text("primary_email"),
  primaryPhone: text("primary_phone"),
  source: text("source"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lifecycleStage: text("lifecycle_stage"),
  tags: jsonb("tags"),
  confidenceScore: text("confidence_score"),
  dateOfBirth: date("date_of_birth"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  clientStatus: text("client_status"),
  referralSource: text("referral_source"),
  address: jsonb("address"),
  healthContext: jsonb("health_context"),
  preferences: jsonb("preferences"),
  photoUrl: text("photo_url"),
});

export const contactIdentities = pgTable("contact_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  provider: text("provider"),
  value: text("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const contactTimeline = pgTable("contact_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Core Tables
export const dailyPulseLogs = pgTable("daily_pulse_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  logDate: date("log_date").notNull(),
  details: jsonb("details").default("'{}'::jsonb"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const documents = pgTable("documents", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  ownerContactId: uuid("owner_contact_id"),
  title: text("title"),
  mime: text("mime"),
  text: text("text"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  ownerType: text("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  contentHash: text("content_hash"),
  chunkIndex: integer("chunk_index"),
  embedding: text("embedding"),
  embeddingV: text("embedding_v"),
});

export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id"),
  goalType: goalTypeEnum("goal_type").notNull(),
  name: text("name").notNull(),
  status: goalStatusEnum("status").default("on_track"),
  targetDate: timestamp("target_date", { withTimezone: true }),
  details: jsonb("details").default("'{}'::jsonb"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const inboxItems = pgTable("inbox_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  rawText: text("raw_text").notNull(),
  status: inboxItemStatusEnum("status").default("unprocessed"),
  processedAt: timestamp("processed_at"),
  createdTaskId: uuid("created_task_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const interactions = pgTable("interactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id"),
  type: text("type").notNull(),
  subject: text("subject"),
  bodyText: text("body_text"),
  bodyRaw: jsonb("body_raw"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  source: text("source"),
  sourceId: text("source_id"),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").default("queued"),
  attempts: integer("attempts").default(0),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastError: text("last_error"),
});

// Chat/Message Tables
export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  threadId: uuid("thread_id").notNull(),
  role: text("role").notNull(),
  content: jsonb("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const threads = pgTable("threads", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const toolInvocations = pgTable("tool_invocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  messageId: uuid("message_id").notNull(),
  tool: text("tool").notNull(),
  args: jsonb("args").notNull(),
  result: jsonb("result"),
  latencyMs: integer("latency_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notes = pgTable("notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id"),
  title: text("title"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const onboardingTokens = pgTable("onboarding_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").default(0),
  createdBy: uuid("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  disabled: boolean("disabled").default(false),
  label: text("label"),
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  zoneId: integer("zone_id"), // Changed to integer to match database
  name: text("name").notNull(),
  status: projectStatusEnum("status").default("active"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  details: jsonb("details"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const rawEventErrors = pgTable("raw_event_errors", {
  id: uuid("id").primaryKey().defaultRandom(),
  rawEventId: uuid("raw_event_id"),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  errorAt: timestamp("error_at").defaultNow(),
  stage: text("stage").notNull(),
  error: text("error").notNull(),
  context: jsonb("context"),
});

export const rawEvents = pgTable("raw_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  payload: jsonb("payload").notNull(),
  contactId: uuid("contact_id"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  sourceId: text("source_id"),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

// Sync Tables
export const syncAudit = pgTable("sync_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  action: text("action").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const syncSessions = pgTable("sync_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  service: text("service").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  currentStep: text("current_step"),
  totalItems: integer("total_items"),
  processedItems: integer("processed_items"),
  importedItems: integer("imported_items"),
  failedItems: integer("failed_items"),
  progressPercentage: integer("progress_percentage"),
  preferences: jsonb("preferences"),
  errorDetails: jsonb("error_details"),
});

export const taskContactTags = pgTable("task_contact_tags", {
  taskId: uuid("task_id").notNull(),
  contactId: uuid("contact_id").notNull(),
});

export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id"),
  parentTaskId: uuid("parent_task_id"),
  name: text("name").notNull(),
  status: taskStatusEnum("status").default("todo"),
  priority: taskPriorityEnum("priority").default("medium"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  details: jsonb("details"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// User Tables
export const userIntegrations = pgTable("user_integrations", {
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  service: text("service").default("gmail"),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiryDate: timestamp("expiry_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const userSyncPrefs = pgTable("user_sync_prefs", {
  userId: uuid("user_id").primaryKey().notNull(),
  initialSyncCompleted: boolean("initial_sync_completed").default(false),
  initialSyncDate: timestamp("initial_sync_date"),
  calendarTimeWindowDays: integer("calendar_time_window_days").default(30),
  calendarFutureDays: integer("calendar_future_days"),
  calendarIds: text("calendar_ids").array(),
  calendarIncludePrivate: boolean("calendar_include_private").default(false),
  calendarIncludeOrganizerSelf: boolean("calendar_include_organizer_self").default(true),
  gmailTimeRangeDays: integer("gmail_time_range_days"),
  driveFolderIds: text("drive_folder_ids").array().default([]),
  driveIngestionMode: text("drive_ingestion_mode").default("all"),
  driveMaxSizeMb: integer("drive_max_size_mb"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const zones = pgTable("zones", {
  id: integer("id").primaryKey(), // Changed to integer serial to match database
  name: text("name").notNull(),
  color: text("color"),
  iconName: text("icon_name"),
});

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

export type Interaction = typeof interactions.$inferSelect;
export type CreateInteraction = typeof interactions.$inferInsert;
export type UpdateInteraction = Partial<CreateInteraction>;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type CreateCalendarEvent = typeof calendarEvents.$inferInsert;
export type UpdateCalendarEvent = Partial<CreateCalendarEvent>;

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
export type UpdateJob = Partial<CreateJob>;

export type SyncSession = typeof syncSessions.$inferSelect;
export type CreateSyncSession = typeof syncSessions.$inferInsert;
export type UpdateSyncSession = Partial<CreateSyncSession>;

export type UserIntegration = typeof userIntegrations.$inferSelect;
export type CreateUserIntegration = typeof userIntegrations.$inferInsert;
export type UpdateUserIntegration = Partial<CreateUserIntegration>;

export type InboxItem = typeof inboxItems.$inferSelect;
export type CreateInboxItem = typeof inboxItems.$inferInsert;
export type UpdateInboxItem = Partial<CreateInboxItem>;

export type Goal = typeof goals.$inferSelect;
export type CreateGoal = typeof goals.$inferInsert;
export type UpdateGoal = Partial<CreateGoal>;

export type DailyPulseLog = typeof dailyPulseLogs.$inferSelect;
export type CreateDailyPulseLog = typeof dailyPulseLogs.$inferInsert;
export type UpdateDailyPulseLog = Partial<CreateDailyPulseLog>;

export type RawEvent = typeof rawEvents.$inferSelect;
export type CreateRawEvent = typeof rawEvents.$inferInsert;
export type UpdateRawEvent = Partial<CreateRawEvent>;

export type RawEventError = typeof rawEventErrors.$inferSelect;
export type CreateRawEventError = typeof rawEventErrors.$inferInsert;
export type UpdateRawEventError = Partial<CreateRawEventError>;

// Extended types for common patterns
export type ContactWithNotes = Contact & { notes: Note[] };
