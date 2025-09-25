// Generated Database Types
// This file exports clean type interfaces from the generated database types
// Regenerate with: pnpm types:gen

export type { Database, Json } from './database.types';

// Convenience type exports for common tables
import type { Database } from './database.types';

// Core table types - use shorter aliases that match previous schema exports
export type AiInsight = Database['public']['Tables']['ai_insights']['Row'];
export type NewAiInsight = Database['public']['Tables']['ai_insights']['Insert'];
export type AiQuota = Database['public']['Tables']['ai_quotas']['Row'];
export type NewAiQuota = Database['public']['Tables']['ai_quotas']['Insert'];
export type AiUsage = Database['public']['Tables']['ai_usage']['Row'];
export type NewAiUsage = Database['public']['Tables']['ai_usage']['Insert'];

export type Contact = Database['public']['Tables']['contacts']['Row'];
export type NewContact = Database['public']['Tables']['contacts']['Insert'];
export type UpdateContact = Database['public']['Tables']['contacts']['Update'];

export type ContactIdentity = Database['public']['Tables']['contact_identities']['Row'];
export type NewContactIdentity = Database['public']['Tables']['contact_identities']['Insert'];

export type Document = Database['public']['Tables']['documents']['Row'];
export type NewDocument = Database['public']['Tables']['documents']['Insert'];

export type Embedding = Database['public']['Tables']['embeddings']['Row'];
export type NewEmbedding = Database['public']['Tables']['embeddings']['Insert'];

export type Interaction = Database['public']['Tables']['interactions']['Row'];
export type NewInteraction = Database['public']['Tables']['interactions']['Insert'];

export type Job = Database['public']['Tables']['jobs']['Row'];
export type NewJob = Database['public']['Tables']['jobs']['Insert'];

export type RawEvent = Database['public']['Tables']['raw_events']['Row'];
export type NewRawEvent = Database['public']['Tables']['raw_events']['Insert'];
export type RawEventError = Database['public']['Tables']['raw_event_errors']['Row'];
export type NewRawEventError = Database['public']['Tables']['raw_event_errors']['Insert'];

// Chat types
export type Thread = Database['public']['Tables']['threads']['Row'];
export type NewThread = Database['public']['Tables']['threads']['Insert'];
export type Message = Database['public']['Tables']['messages']['Row'];
export type NewMessage = Database['public']['Tables']['messages']['Insert'];
export type ToolInvocation = Database['public']['Tables']['tool_invocations']['Row'];
export type NewToolInvocation = Database['public']['Tables']['tool_invocations']['Insert'];

// Integration types
export type UserIntegration = Database['public']['Tables']['user_integrations']['Row'];
export type NewUserIntegration = Database['public']['Tables']['user_integrations']['Insert'];
export type UserSyncPrefs = Database['public']['Tables']['user_sync_prefs']['Row'];
export type NewUserSyncPrefs = Database['public']['Tables']['user_sync_prefs']['Insert'];
export type SyncAudit = Database['public']['Tables']['sync_audit']['Row'];
export type NewSyncAudit = Database['public']['Tables']['sync_audit']['Insert'];
export type SyncSession = Database['public']['Tables']['sync_sessions']['Row'];
export type NewSyncSession = Database['public']['Tables']['sync_sessions']['Insert'];

export type Note = Database['public']['Tables']['notes']['Row'];
export type NewNote = Database['public']['Tables']['notes']['Insert'];
export type UpdateNote = Database['public']['Tables']['notes']['Update'];

export type CalendarEvent = Database['public']['Tables']['calendar_events']['Row'];
export type NewCalendarEvent = Database['public']['Tables']['calendar_events']['Insert'];
export type ContactTimeline = Database['public']['Tables']['contact_timeline']['Row'];
export type NewContactTimeline = Database['public']['Tables']['contact_timeline']['Insert'];

// OmniMomentum types
export type Zone = Database['public']['Tables']['zones']['Row'];
export type NewZone = Database['public']['Tables']['zones']['Insert'];
export type InboxItem = Database['public']['Tables']['inbox_items']['Row'];
export type NewInboxItem = Database['public']['Tables']['inbox_items']['Insert'];
export type Project = Database['public']['Tables']['projects']['Row'];
export type NewProject = Database['public']['Tables']['projects']['Insert'];
export type Task = Database['public']['Tables']['tasks']['Row'];
export type NewTask = Database['public']['Tables']['tasks']['Insert'];
export type TaskContactTag = Database['public']['Tables']['task_contact_tags']['Row'];
export type NewTaskContactTag = Database['public']['Tables']['task_contact_tags']['Insert'];
export type Goal = Database['public']['Tables']['goals']['Row'];
export type NewGoal = Database['public']['Tables']['goals']['Insert'];
export type DailyPulseLog = Database['public']['Tables']['daily_pulse_logs']['Row'];
export type NewDailyPulseLog = Database['public']['Tables']['daily_pulse_logs']['Insert'];

// Onboarding system types (if they exist)
export type OnboardingTokenRow = Database['public']['Tables']['onboarding_tokens']['Row'];
export type NewOnboardingToken = Database['public']['Tables']['onboarding_tokens']['Insert'];
export type UpdateOnboardingToken = Database['public']['Tables']['onboarding_tokens']['Update'];

export type ClientConsentRow = Database['public']['Tables']['client_consents']['Row'];
export type NewClientConsent = Database['public']['Tables']['client_consents']['Insert'];
export type UpdateClientConsent = Database['public']['Tables']['client_consents']['Update'];

export type ClientFileRow = Database['public']['Tables']['client_files']['Row'];
export type NewClientFile = Database['public']['Tables']['client_files']['Insert'];
export type UpdateClientFile = Database['public']['Tables']['client_files']['Update'];

// Database functions (if they exist)
export type OnboardClientWithTokenArgs = Database['public']['Functions']['onboard_client_with_token']['Args'];
export type CheckClientConsentArgs = Database['public']['Functions']['check_client_consent']['Args'];

// Enums
export type GoalStatus = Database['public']['Enums']['goal_status'];
export type GoalType = Database['public']['Enums']['goal_type'];
export type InboxItemStatus = Database['public']['Enums']['inbox_item_status'];
export type ProjectStatus = Database['public']['Enums']['project_status'];
export type TaskPriority = Database['public']['Enums']['task_priority'];
export type TaskStatus = Database['public']['Enums']['task_status'];