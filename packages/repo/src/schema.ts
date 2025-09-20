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
  uniqueIndex,
  index,
  serial,
  date,
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
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  fingerprint: text("fingerprint"),
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
  source: text("source"), // gmail_import | manual | upload | calendar_import
  // notes column removed - use dedicated notes table instead
  stage: text("stage"), // Prospect | New Client | Core Client | Referring Client | VIP Client | Lost Client | At Risk Client
  tags: jsonb("tags"), // Wellness segmentation tags array
  confidenceScore: text("confidence_score"), // AI insight confidence stored as text
  slug: text("slug").unique(), // SEO-friendly URL slug
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const contactIdentities = pgTable("contact_identities", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id").notNull(),
  kind: text("kind").notNull(), // email | phone | social | etc
  value: text("value").notNull(), // the actual email/phone/username value
  provider: text("provider"), // optional provider (google, etc)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  ownerType: text("owner_type").notNull(), // interaction | document | contact | calendar_event
  ownerId: uuid("owner_id").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  // Optional in code (present in DB via SQL): vector(1536)
  embedding: vector1536("embedding"),
  embeddingV: vector1536("embedding_v"),
  contentHash: text("content_hash"),
  chunkIndex: integer("chunk_index"),
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
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  source: text("source"), // gmail | calendar | manual
  sourceId: text("source_id"),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  sourceMeta: jsonb("source_meta"),
  batchId: uuid("batch_id"),
  sourceId: text("source_id"), // Added in migration 11_db_perf_optimizations.sql
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rawEventErrors = pgTable("raw_event_errors", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  rawEventId: uuid("raw_event_id"),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(), // gmail | calendar | drive
  errorAt: timestamp("error_at", { withTimezone: true }).notNull(),
  stage: text("stage").notNull(), // ingestion | normalization | processing
  error: text("error").notNull(), // error message
  context: jsonb("context"), // additional context about the error
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
  // Phase 3 Enhanced Preferences System
  gmailTimeRangeDays: integer("gmail_time_range_days").default(365).notNull(),
  calendarIds: text("calendar_ids").array().default(sql`'{}'::text[]`).notNull(),
  calendarFutureDays: integer("calendar_future_days").default(90).notNull(),
  driveMaxSizeMB: integer("drive_max_size_mb").default(5).notNull(),
  initialSyncCompleted: boolean("initial_sync_completed").default(false).notNull(),
  initialSyncDate: timestamp("initial_sync_date", { withTimezone: true }),
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

export const syncSessions = pgTable("sync_sessions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  service: text("service").notNull(), // gmail | calendar
  status: text("status").notNull().default("started"), // started | importing | processing | completed | failed | cancelled
  progressPercentage: integer("progress_percentage").default(0),
  currentStep: text("current_step"),
  totalItems: integer("total_items").default(0),
  importedItems: integer("imported_items").default(0),
  processedItems: integer("processed_items").default(0),
  failedItems: integer("failed_items").default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorDetails: jsonb("error_details").default(sql`'{}'::jsonb`),
  preferences: jsonb("preferences").default(sql`'{}'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const notes = pgTable("notes", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id"), // FK to contacts(id) in SQL; nullable
  title: text("title"),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Calendar Events for business intelligence and timeline building
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: uuid("user_id").notNull(),
    googleEventId: text("google_event_id").notNull(), // Google Calendar event ID
    title: text("title").notNull(),
    description: text("description"),
    startTime: timestamp("start_time", { withTimezone: true }).notNull(),
    endTime: timestamp("end_time", { withTimezone: true }).notNull(),
    attendees: jsonb("attendees"), // Store attendee emails/info
    location: text("location"),
    status: text("status"), // confirmed, cancelled, tentative
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    timeZone: text("time_zone"),
    isAllDay: boolean("is_all_day"),
    visibility: text("visibility"),
    eventType: text("event_type"),
    businessCategory: text("business_category"),
    keywords: jsonb("keywords"), // Stored as jsonb in database
    googleUpdated: timestamp("google_updated", { withTimezone: true }),
    lastSynced: timestamp("last_synced", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("cal_ev_user_googleid_uidx").on(table.userId, table.googleEventId),
    index("cal_ev_user_start_idx").on(table.userId, table.startTime.desc()),
  ],
);

// Contact timeline events (auto-generated from calendar data)
export const contactTimeline = pgTable("contact_timeline", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id")
    .references(() => contacts.id)
    .notNull(),
  eventType: text("event_type").notNull(), // class_attended, workshop_booked, appointment_scheduled
  title: text("title").notNull(),
  description: text("description"),
  eventData: jsonb("event_data").default({}), // Soft schema - contains eventId, eventTitle, location, duration, etc.
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Momentum Management ----------

export const momentumWorkspaces = pgTable("momentum_workspaces", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1"), // Hex color for UI
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const momentumProjects = pgTable("momentum_projects", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  momentumWorkspaceId: uuid("momentum_workspace_id")
    .references(() => momentumWorkspaces.id)
    .notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#10b981"), // Hex color for UI
  status: text("status").default("active").notNull(), // active, completed, on_hold, cancelled
  dueDate: timestamp("due_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const momentums = pgTable("momentums", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  momentumWorkspaceId: uuid("momentum_workspace_id").references(() => momentumWorkspaces.id), // nullable - momentums can exist without workspaces
  momentumProjectId: uuid("momentum_project_id").references(() => momentumProjects.id), // nullable - momentums can exist without projects
  parentMomentumId: uuid("parent_momentum_id"), // for sub-momentums - FK defined in SQL
  title: text("title").notNull(),
  description: text("description"),
  status: text("status").default("todo").notNull(), // todo, in_progress, waiting, done, cancelled
  priority: text("priority").default("medium").notNull(), // low, medium, high, urgent
  assignee: text("assignee").default("user").notNull(), // user, ai
  source: text("source").default("user").notNull(), // user, ai_generated
  approvalStatus: text("approval_status").default("approved").notNull(), // pending_approval, approved, rejected
  taggedContacts: jsonb("tagged_contacts"), // array of contact IDs
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  estimatedMinutes: integer("estimated_minutes"),
  actualMinutes: integer("actual_minutes"),
  aiContext: jsonb("ai_context"), // AI reasoning/context when generated
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const momentumActions = pgTable("momentum_actions", {
  id: uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  momentumId: uuid("momentum_id").notNull(), // FK to momentums.id - defined in SQL
  action: text("action").notNull(), // approved, rejected, edited, completed, deleted
  previousData: jsonb("previous_data"), // momentum state before action
  newData: jsonb("new_data"), // momentum state after action
  notes: text("notes"), // user notes about the action
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ---------- OmniMomentum Management ----------

// Table: zones (Lookup Table for Life-Business Zones)
export const zones = pgTable("zones", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  color: text("color"),
  iconName: text("icon_name"),
});

// Table: inbox_items (The AI Quick Capture "Dump Everything" Zone)
export const inboxItems = pgTable("inbox_items", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  rawText: text("raw_text").notNull(),
  status: text("status", { enum: ["unprocessed", "processed", "archived"] }).notNull().default("unprocessed"),
  createdTaskId: uuid("created_task_id"), // Nullable, will be populated after processing
  processedAt: timestamp("processed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Table: projects (The "Pathways" top-level containers)
export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  zoneId: integer("zone_id"), // References zones.id but FK defined in SQL
  name: text("name").notNull(),
  status: text("status", { enum: ["active", "on_hold", "completed", "archived"] }).notNull().default("active"),
  dueDate: date("due_date"),
  details: jsonb("details").default(sql`'{}'::jsonb`), // For description, icon, metadata
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Table: tasks (Core table for tasks and subtasks via self-reference)
export const tasks = pgTable("tasks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  projectId: uuid("project_id"), // References projects.id but FK defined in SQL
  parentTaskId: uuid("parent_task_id"), // References tasks.id but FK defined in SQL
  name: text("name").notNull(),
  status: text("status", { enum: ["todo", "in_progress", "done", "canceled"] }).notNull().default("todo"),
  priority: text("priority", { enum: ["low", "medium", "high", "urgent"] }).notNull().default("medium"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  details: jsonb("details").default(sql`'{}'::jsonb`), // For description, steps, blockers
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Table: task_contact_tags (Many-to-Many Join Table)
export const taskContactTags = pgTable("task_contact_tags", {
  taskId: uuid("task_id").notNull(), // References tasks.id but FK defined in SQL
  contactId: uuid("contact_id").notNull(), // References contacts.id but FK defined in SQL
}, (table) => [primaryKey({ columns: [table.taskId, table.contactId] })]);

// Table: goals (Tracks practitioner and client goals)
export const goals = pgTable("goals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  contactId: uuid("contact_id"), // References contacts.id but FK defined in SQL, nullable for practitioner goals
  goalType: text("goal_type", { enum: ["practitioner_business", "practitioner_personal", "client_wellness"] }).notNull(),
  name: text("name").notNull(),
  status: text("status", { enum: ["on_track", "at_risk", "achieved", "abandoned"] }).notNull().default("on_track"),
  targetDate: date("target_date"),
  details: jsonb("details").default(sql`'{}'::jsonb`), // For description, metrics, values, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// Table: daily_pulse_logs (Logs the daily self-assessment)
export const dailyPulseLogs = pgTable("daily_pulse_logs", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  logDate: date("log_date").notNull(),
  details: jsonb("details").default(sql`'{}'::jsonb`), // For energy, sleep, mood, custom questions
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("daily_pulse_logs_user_date_unique").on(table.userId, table.logDate)]);

// ---------- Types ----------

export type AiInsight = typeof aiInsights.$inferSelect;
export type NewAiInsight = typeof aiInsights.$inferInsert;

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;

export type ContactIdentity = typeof contactIdentities.$inferSelect;
export type NewContactIdentity = typeof contactIdentities.$inferInsert;

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

export type RawEventError = typeof rawEventErrors.$inferSelect;
export type NewRawEventError = typeof rawEventErrors.$inferInsert;

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

export type SyncSession = typeof syncSessions.$inferSelect;
export type NewSyncSession = typeof syncSessions.$inferInsert;

export type AiQuota = typeof aiQuotas.$inferSelect;
export type NewAiQuota = typeof aiQuotas.$inferInsert;

export type AiUsage = typeof aiUsage.$inferSelect;
export type NewAiUsage = typeof aiUsage.$inferInsert;

export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;

export type ContactTimeline = typeof contactTimeline.$inferSelect;
export type NewContactTimeline = typeof contactTimeline.$inferInsert;

export type MomentumWorkspace = typeof momentumWorkspaces.$inferSelect;
export type NewMomentumWorkspace = typeof momentumWorkspaces.$inferInsert;

export type MomentumProject = typeof momentumProjects.$inferSelect;
export type NewMomentumProject = typeof momentumProjects.$inferInsert;

export type Momentum = typeof momentums.$inferSelect;
export type NewMomentum = typeof momentums.$inferInsert;

export type MomentumAction = typeof momentumActions.$inferSelect;
export type NewMomentumAction = typeof momentumActions.$inferInsert;

// OmniMomentum Types
export type Zone = typeof zones.$inferSelect;
export type NewZone = typeof zones.$inferInsert;

export type InboxItem = typeof inboxItems.$inferSelect;
export type NewInboxItem = typeof inboxItems.$inferInsert;

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export type TaskContactTag = typeof taskContactTags.$inferSelect;
export type NewTaskContactTag = typeof taskContactTags.$inferInsert;

export type Goal = typeof goals.$inferSelect;
export type NewGoal = typeof goals.$inferInsert;

export type DailyPulseLog = typeof dailyPulseLogs.$inferSelect;
export type NewDailyPulseLog = typeof dailyPulseLogs.$inferInsert;

// Legacy aliases for backward compatibility
export type Workspace = MomentumWorkspace;
