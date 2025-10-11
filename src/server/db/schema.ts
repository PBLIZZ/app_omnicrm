// Generated Drizzle schema based on Supabase introspection
// This is a basic schema to enable the migration - can be enhanced later

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
} from "drizzle-orm/pg-core";

// Enums
export const projectStatusEnum = pgEnum("project_status", [
  "active",
  "on_hold",
  "completed",
  "archived",
]);
export const taskStatusEnum = pgEnum("task_status", ["todo", "in_progress", "done", "canceled"]);
export const taskPriorityEnum = pgEnum("task_priority", ["low", "medium", "high", "urgent"]);
export const goalTypeEnum = pgEnum("goal_type", [
  "practitioner_business",
  "practitioner_personal",
  "client_wellness",
]);
export const goalStatusEnum = pgEnum("goal_status", [
  "on_track",
  "at_risk",
  "achieved",
  "abandoned",
]);
export const consentTypeEnum = pgEnum("consent_type", [
  "data_processing",
  "marketing",
  "hipaa",
  "photography",
]);
export const fileTypeEnum = pgEnum("file_type", ["photo", "document", "form"]);

// Core tables
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
  tags: jsonb("tags").default("'[]'::jsonb"),
  confidenceScore: text("confidence_score"),
  dateOfBirth: date("date_of_birth"),
  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),
  clientStatus: text("client_status").default("'active'::text"),
  referralSource: text("referral_source"),
  address: jsonb("address"),
  healthContext: jsonb("health_context"),
  preferences: jsonb("preferences"),
  photoUrl: text("photo_url"),
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

export const rawEvents = pgTable("raw_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  payload: jsonb("payload").notNull(),
  contactId: uuid("contact_id"),
  processed: boolean("processed").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
  batchId: uuid("batch_id"),
  sourceId: text("source_id"),
});

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

export const embeddings = pgTable("embeddings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  ownerType: text("owner_type").notNull(),
  ownerId: uuid("owner_id").notNull(),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  contentHash: text("content_hash"),
  chunkIndex: integer("chunk_index"),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  kind: text("kind").notNull(),
  payload: jsonb("payload").notNull(),
  status: text("status").default("'queued'::text"),
  attempts: integer("attempts").default(0),
  batchId: uuid("batch_id"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  lastError: text("last_error"),
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

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  zoneId: uuid("zone_id"),
  name: text("name").notNull(),
  status: projectStatusEnum("status").default("active"),
  dueDate: timestamp("due_date", { withTimezone: true }),
  details: jsonb("details").default("'{}'::jsonb"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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
  details: jsonb("details").default("'{}'::jsonb"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const zones = pgTable("zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color"),
  details: jsonb("details").default("'{}'::jsonb"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
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

// Additional tables for completeness
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

export const contactIdentities = pgTable("contact_identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  email: text("email"),
  name: text("name"),
  meta: jsonb("meta"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
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

export const taskContactTags = pgTable("task_contact_tags", {
  taskId: uuid("task_id").notNull(),
  contactId: uuid("contact_id").notNull(),
});

export const contactTimeline = pgTable("contact_timeline", {
  id: uuid("id").primaryKey().defaultRandom(),
  contactId: uuid("contact_id").notNull(),
  userId: uuid("user_id").notNull(),
  eventType: text("event_type").notNull(),
  eventData: jsonb("event_data"),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const dailyPulseLogs = pgTable("daily_pulse_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  logDate: date("log_date").notNull(),
  details: jsonb("details").default("'{}'::jsonb"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
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

export const userIntegrations = pgTable("user_integrations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiresAt: timestamp("token_expires_at"),
  config: jsonb("config"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const syncSessions = pgTable("sync_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  status: text("status").notNull(),
  startedAt: timestamp("started_at").defaultNow(),
  completedAt: timestamp("completed_at"),
  lastSyncAt: timestamp("last_sync_at"),
  config: jsonb("config"),
  error: text("error"),
  stats: jsonb("stats"),
});

export const authUsers = pgTable("auth_users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const identities = pgTable("identities", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  provider: text("provider").notNull(),
  providerId: text("provider_id").notNull(),
  email: text("email"),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const calendarEvents = pgTable("calendar_events", {
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
});

export const inboxItems = pgTable("inbox_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  type: text("type").notNull(),
  status: text("status").default("pending"),
  priority: text("priority").default("medium"),
  dueDate: timestamp("due_date"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
