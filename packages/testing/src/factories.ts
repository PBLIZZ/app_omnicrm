/**
 * @fileoverview Test data factories using faker.js for all DTOs
 *
 * Provides realistic test data generation for all application DTOs with:
 * - Faker.js for realistic data generation
 * - Partial override support for test customization
 * - Consistent data patterns across all factories
 * - Wellness business-specific data for contacts
 */

import { faker } from '@faker-js/faker';

// Define the types locally since we're not importing from the main project in tests
export type OmniClientDTO = {
  id: string;
  userId: string;
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: string | null;
  stage: string | null;
  tags: string[] | null;
  confidenceScore: string | null;
  slug: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OmniClientWithNotesDTO = OmniClientDTO & {
  notesCount: number;
  lastNote: string | null;
  interactions?: number;
};

export type CreateOmniClientInput = {
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  source?: "manual" | "gmail_import" | "upload" | "calendar_import";
  stage?: string | null;
  tags?: string[] | null;
};

export type UpdateOmniClientInput = {
  displayName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  stage?: string | null;
  tags?: string[] | null;
};

export type ContactDTO = {
  id: string;
  userId: string;
  displayName: string;
  primaryEmail: string | null;
  primaryPhone: string | null;
  source: string | null;
  createdAt: string;
  updatedAt: string;
  avatar?: string;
  tags?: string[];
  lifecycleStage?: "lead" | "prospect" | "customer" | "advocate";
  lastContactDate?: string;
  notes?: string;
  company?: string;
};

export type CreateContactInput = {
  displayName: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  company?: string | null;
  notes?: string | null;
  tags?: string[];
  lifecycleStage?: "lead" | "prospect" | "customer" | "advocate";
};

export type UpdateContactInput = Partial<CreateContactInput>;

export type ClientSuggestion = {
  id: string;
  displayName: string;
  email: string;
  eventCount: number;
  lastEventDate: string;
  eventTitles: string[];
  confidence: "high" | "medium" | "low";
  source: "calendar_attendee";
};

export type ClientAIInsightsResponse = {
  insights: {
    wellnessGoals?: string[];
    preferences?: string[];
    engagementLevel?: string;
    risks?: string[];
    opportunities?: string[];
    nextSteps?: string[];
  };
  confidence: number;
};

export type ClientEmailSuggestion = {
  subject: string;
  content: string;
  tone: string;
  reasoning: string;
};

export type ClientNoteSuggestion = {
  title: string;
  content: string;
  category: string;
  priority: "low" | "medium" | "high";
};

export type Interaction = {
  id: string;
  userId: string;
  contactId: string | null;
  type: string;
  subject: string | null;
  bodyText: string | null;
  bodyRaw: unknown;
  occurredAt: string;
  source: string | null;
  sourceId: string | null;
  sourceMeta: unknown;
  batchId: string | null;
  createdAt: string;
};

export type NewInteraction = Omit<Interaction, 'id' | 'createdAt'>;

export type NormalizedInteraction = {
  userId: string;
  contactId?: string | null;
  type: string;
  subject?: string | null;
  bodyText?: string | null;
  bodyRaw?: unknown;
  occurredAt: string;
  source: string;
  sourceId?: string;
  sourceMeta?: unknown;
  batchId?: string | null;
};

export type InteractionType =
  | "email_received" | "email_sent" | "sms_received" | "sms_sent"
  | "dm_received" | "dm_sent" | "meeting_created" | "meeting_attended"
  | "call_logged" | "note_added" | "form_submission" | "web_chat" | "system_event";

export type NoteDTO = {
  id: string;
  contactId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateNoteInput = {
  content: string;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
};

export type ChatRequest = {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
};

export type ChatResponse = {
  id: string;
  model: string;
  message: ChatMessage;
  usage?: {
    input_tokens: number;
    output_tokens: number;
  };
};

export type SimpleChatRequest = {
  prompt: string;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedMinutes?: number;
};

export type EmailSuggestionInput = {
  purpose?: string;
};

export type InsightContent = {
  title: string;
  summary: string;
  score?: number;
  confidence: number;
  tags: string[];
  priority: "low" | "medium" | "high" | "critical";
  references?: Array<{
    table: string;
    id: string;
  }>;
  props?: Record<string, unknown>;
  actions?: Array<{
    type: string;
    label: string;
    payload: Record<string, unknown>;
  }>;
  ttlHours?: number;
  expiresAt?: string;
  status: "new" | "viewed" | "dismissed" | "applied";
};

export type AIInsight = {
  id: string;
  userId: string;
  subjectType: string;
  subjectId: string | null;
  kind: string;
  content: InsightContent;
  model: string | null;
  createdAt: string;
  fingerprint?: string;
};

export type NewAIInsight = Omit<AIInsight, 'id' | 'createdAt' | 'fingerprint'>;

export type InsightSubjectType =
  | 'contact' | 'thread' | 'account' | 'workspace' | 'project' | 'task'
  | 'email' | 'meeting' | 'campaign' | 'pipeline' | 'segment';

export type InsightKind =
  | 'thread_summary' | 'meeting_summary' | 'account_summary' | 'weekly_digest'
  | 'next_best_action' | 'reply_draft' | 'subject_line_suggestions' | 'playbook_recommendation'
  | 'lead_score' | 'health_score' | 'upsell_score' | 'churn_risk'
  | 'smart_segment_definition' | 'cluster_assignment' | 'entity_enrichment' | 'title_inference'
  | 'company_match' | 'pii_detected' | 'policy_flag' | 'anomaly_detected'
  | 'duplicate_contact_suspected' | 'campaign_driver_analysis' | 'cohort_insight' | 'topic_trend';

// Utility to convert empty strings to null (matches app behavior)
function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value.trim() === '') {
    return null;
  }
  return value;
}

// Wellness-specific data for contacts
const WELLNESS_TAGS = [
  // Services (14)
  'Yoga', 'Massage', 'Meditation', 'Pilates', 'Reiki', 'Acupuncture',
  'Personal Training', 'Nutrition Coaching', 'Life Coaching', 'Therapy',
  'Workshops', 'Retreats', 'Group Classes', 'Private Sessions',

  // Demographics (11)
  'Senior', 'Young Adult', 'Professional', 'Parent', 'Student', 'Beginner',
  'Intermediate', 'Advanced', 'VIP', 'Local', 'Traveler',

  // Goals & Health (11)
  'Stress Relief', 'Weight Loss', 'Flexibility', 'Strength Building',
  'Pain Management', 'Mental Health', 'Spiritual Growth', 'Mindfulness',
  'Athletic Performance', 'Injury Recovery', 'Prenatal',

  // Engagement Patterns (10)
  'Regular Attendee', 'Weekend Warrior', 'Early Bird', 'Evening Preferred',
  'Seasonal Client', 'Frequent Visitor', 'Occasional Visitor', 'High Spender',
  'Referral Source', 'Social Media Active'
];

const CLIENT_STAGES = [
  'Prospect',
  'New Client',
  'Core Client',
  'Referring Client',
  'VIP Client',
  'Lost Client',
  'At Risk Client'
];

const CONTACT_SOURCES = ['manual', 'gmail_import', 'upload', 'calendar_import'] as const;

// =============================================================================
// CONTACT FACTORIES
// =============================================================================

export function makeOmniClient(overrides: Partial<OmniClientDTO> = {}): OmniClientDTO {
  const baseClient = {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    displayName: faker.person.fullName(),
    primaryEmail: faker.internet.email(),
    primaryPhone: faker.phone.number(),
    source: faker.helpers.arrayElement(CONTACT_SOURCES),
    stage: faker.helpers.arrayElement(CLIENT_STAGES),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 1, max: 5 }),
    confidenceScore: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 1 }).toString(),
    slug: faker.helpers.slugify(faker.person.fullName()).toLowerCase(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
  };

  return { ...baseClient, ...overrides };
}

export function makeOmniClientWithNotes(overrides: Partial<OmniClientWithNotesDTO> = {}): OmniClientWithNotesDTO {
  const baseClient = makeOmniClient(overrides);
  const defaultNotesCount = faker.number.int({ min: 0, max: 10 });

  // Use override notesCount if provided, otherwise use default
  const notesCount = overrides.notesCount !== undefined ? overrides.notesCount : defaultNotesCount;

  return {
    ...baseClient,
    notesCount,
    lastNote: notesCount > 0 ? faker.lorem.sentence() : null,
    interactions: faker.number.int({ min: 0, max: 50 }),
    ...overrides,
  };
}

export function makeCreateOmniClientInput(overrides: Partial<CreateOmniClientInput> = {}): CreateOmniClientInput {
  return {
    displayName: faker.person.fullName(),
    primaryEmail: faker.internet.email(),
    primaryPhone: faker.phone.number(),
    source: faker.helpers.arrayElement(CONTACT_SOURCES),
    stage: faker.helpers.arrayElement(CLIENT_STAGES),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 1, max: 3 }),
    ...overrides,
  };
}

export function makeUpdateOmniClientInput(overrides: Partial<UpdateOmniClientInput> = {}): UpdateOmniClientInput {
  return {
    displayName: faker.person.fullName(),
    primaryEmail: faker.internet.email(),
    primaryPhone: faker.phone.number(),
    stage: faker.helpers.arrayElement(CLIENT_STAGES),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 1, max: 3 }),
    ...overrides,
  };
}

export function makeContactDTO(overrides: Partial<ContactDTO> = {}): ContactDTO {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    displayName: faker.person.fullName(),
    primaryEmail: faker.internet.email(),
    primaryPhone: faker.phone.number(),
    source: faker.helpers.arrayElement(CONTACT_SOURCES),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    avatar: faker.image.avatar(),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 0, max: 3 }),
    lifecycleStage: faker.helpers.arrayElement(['lead', 'prospect', 'customer', 'advocate']),
    lastContactDate: faker.date.recent().toISOString(),
    notes: faker.lorem.paragraph(),
    company: faker.company.name(),
    ...overrides,
  };
}

export function makeCreateContactInput(overrides: Partial<CreateContactInput> = {}): CreateContactInput {
  return {
    displayName: faker.person.fullName(),
    primaryEmail: emptyToNull(faker.internet.email()),
    primaryPhone: emptyToNull(faker.phone.number()),
    company: emptyToNull(faker.company.name()),
    notes: emptyToNull(faker.lorem.paragraph()),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 0, max: 3 }),
    lifecycleStage: faker.helpers.arrayElement(['lead', 'prospect', 'customer', 'advocate']),
    ...overrides,
  };
}

export function makeUpdateContactInput(overrides: Partial<UpdateContactInput> = {}): UpdateContactInput {
  return {
    displayName: faker.person.fullName(),
    primaryEmail: emptyToNull(faker.internet.email()),
    primaryPhone: emptyToNull(faker.phone.number()),
    company: emptyToNull(faker.company.name()),
    notes: emptyToNull(faker.lorem.paragraph()),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 0, max: 3 }),
    lifecycleStage: faker.helpers.arrayElement(['lead', 'prospect', 'customer', 'advocate']),
    ...overrides,
  };
}

export function makeClientSuggestion(overrides: Partial<ClientSuggestion> = {}): ClientSuggestion {
  const eventCount = faker.number.int({ min: 1, max: 20 });

  return {
    id: faker.string.uuid(),
    displayName: faker.person.fullName(),
    email: faker.internet.email(),
    eventCount,
    lastEventDate: faker.date.recent().toISOString(),
    eventTitles: faker.helpers.arrayElements([
      'Yoga Class', 'Massage Appointment', 'Meditation Session', 'Personal Training',
      'Wellness Consultation', 'Group Therapy', 'Nutrition Planning', 'Stress Relief Workshop'
    ], { min: 1, max: eventCount }),
    confidence: faker.helpers.arrayElement(['high', 'medium', 'low']),
    source: 'calendar_attendee',
    ...overrides,
  };
}

export function makeClientAIInsightsResponse(overrides: Partial<ClientAIInsightsResponse> = {}): ClientAIInsightsResponse {
  return {
    insights: {
      wellnessGoals: faker.helpers.arrayElements([
        'Stress Management', 'Weight Loss', 'Flexibility Improvement', 'Strength Building',
        'Mental Health', 'Pain Relief', 'Spiritual Growth', 'Athletic Performance'
      ], { min: 1, max: 3 }),
      preferences: faker.helpers.arrayElements([
        'Morning Sessions', 'Evening Classes', 'Weekend Appointments', 'Group Activities',
        'Private Sessions', 'Online Classes', 'In-Person Only', 'Beginner Friendly'
      ], { min: 1, max: 3 }),
      engagementLevel: faker.helpers.arrayElement(['High', 'Medium', 'Low']),
      risks: faker.helpers.arrayElements([
        'Irregular Attendance', 'Price Sensitivity', 'Scheduling Conflicts', 'Lack of Progress'
      ], { min: 0, max: 2 }),
      opportunities: faker.helpers.arrayElements([
        'Upgrade to Premium', 'Additional Services', 'Referral Program', 'Workshop Enrollment'
      ], { min: 1, max: 3 }),
      nextSteps: faker.helpers.arrayElements([
        'Schedule Follow-up', 'Send Program Recommendations', 'Offer Trial Class', 'Check-in Call'
      ], { min: 1, max: 2 }),
    },
    confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
    ...overrides,
  };
}

export function makeClientEmailSuggestion(overrides: Partial<ClientEmailSuggestion> = {}): ClientEmailSuggestion {
  return {
    subject: faker.lorem.sentence(),
    content: faker.lorem.paragraphs(2),
    tone: faker.helpers.arrayElement(['Professional', 'Friendly', 'Casual', 'Supportive']),
    reasoning: faker.lorem.sentence(),
    ...overrides,
  };
}

export function makeClientNoteSuggestion(overrides: Partial<ClientNoteSuggestion> = {}): ClientNoteSuggestion {
  return {
    title: faker.lorem.words(3),
    content: faker.lorem.paragraph(),
    category: faker.helpers.arrayElement(['Progress', 'Goals', 'Preferences', 'Concerns', 'Achievements']),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
    ...overrides,
  };
}

// =============================================================================
// INTERACTION FACTORIES
// =============================================================================

const INTERACTION_TYPES = [
  'email_received', 'email_sent', 'sms_received', 'sms_sent', 'dm_received', 'dm_sent',
  'meeting_created', 'meeting_attended', 'call_logged', 'note_added', 'form_submission',
  'web_chat', 'system_event'
] as const;

export function makeInteraction(overrides: Partial<Interaction> = {}): Interaction {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    contactId: faker.string.uuid(),
    type: faker.helpers.arrayElement(INTERACTION_TYPES),
    subject: faker.lorem.sentence(),
    bodyText: faker.lorem.paragraphs(2),
    bodyRaw: { html: faker.lorem.paragraphs(2), metadata: {} },
    occurredAt: faker.date.recent().toISOString(),
    source: faker.helpers.arrayElement(['gmail', 'calendar', 'manual']),
    sourceId: faker.string.alphanumeric(12),
    sourceMeta: { provider: 'gmail', messageId: faker.string.alphanumeric(12) },
    batchId: faker.string.uuid(),
    createdAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function makeNewInteraction(overrides: Partial<NewInteraction> = {}): NewInteraction {
  const interaction = makeInteraction(overrides);
  const { id, createdAt, ...newInteraction } = interaction;
  return newInteraction;
}

export function makeNormalizedInteraction(overrides: Partial<NormalizedInteraction> = {}): NormalizedInteraction {
  return {
    userId: faker.string.uuid(),
    contactId: faker.string.uuid(),
    type: faker.helpers.arrayElement(INTERACTION_TYPES),
    subject: faker.lorem.sentence(),
    bodyText: faker.lorem.paragraphs(2),
    bodyRaw: { html: faker.lorem.paragraphs(2) },
    occurredAt: faker.date.recent().toISOString(),
    source: faker.helpers.arrayElement(['gmail', 'calendar', 'manual']),
    sourceId: faker.string.alphanumeric(12),
    sourceMeta: { provider: 'gmail' },
    batchId: faker.string.uuid(),
    ...overrides,
  };
}

// =============================================================================
// NOTES FACTORIES
// =============================================================================

export function makeNoteDTO(overrides: Partial<NoteDTO> = {}): NoteDTO {
  return {
    id: faker.string.uuid(),
    contactId: faker.string.uuid(),
    userId: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    createdAt: faker.date.past().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}

export function makeCreateNoteInput(overrides: Partial<CreateNoteInput> = {}): CreateNoteInput {
  return {
    content: faker.lorem.paragraph(),
    ...overrides,
  };
}

// =============================================================================
// CHAT FACTORIES
// =============================================================================

export function makeChatMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    role: faker.helpers.arrayElement(['system', 'user', 'assistant', 'tool']),
    content: faker.lorem.sentence(),
    ...overrides,
  };
}

export function makeChatRequest(overrides: Partial<ChatRequest> = {}): ChatRequest {
  return {
    model: faker.helpers.arrayElement(['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet']),
    messages: [
      makeChatMessage({ role: 'user', content: faker.lorem.sentence() }),
      makeChatMessage({ role: 'assistant', content: faker.lorem.paragraph() })
    ],
    temperature: faker.number.float({ min: 0, max: 2, fractionDigits: 1 }),
    max_tokens: faker.number.int({ min: 100, max: 4000 }),
    stream: faker.datatype.boolean(),
    ...overrides,
  };
}

export function makeChatResponse(overrides: Partial<ChatResponse> = {}): ChatResponse {
  return {
    id: faker.string.uuid(),
    model: faker.helpers.arrayElement(['gpt-4', 'gpt-3.5-turbo', 'claude-3-sonnet']),
    message: makeChatMessage({ role: 'assistant' }),
    usage: {
      input_tokens: faker.number.int({ min: 10, max: 1000 }),
      output_tokens: faker.number.int({ min: 10, max: 1000 }),
    },
    ...overrides,
  };
}

export function makeSimpleChatRequest(overrides: Partial<SimpleChatRequest> = {}): SimpleChatRequest {
  return {
    prompt: faker.lorem.sentence(),
    ...overrides,
  };
}

// =============================================================================
// TASK FACTORIES
// =============================================================================

export function makeCreateTaskInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: faker.lorem.words(5),
    description: faker.lorem.paragraph(),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'urgent']),
    estimatedMinutes: faker.number.int({ min: 15, max: 480 }), // 15 min to 8 hours
    ...overrides,
  };
}

export function makeEmailSuggestionInput(overrides: Partial<EmailSuggestionInput> = {}): EmailSuggestionInput {
  return {
    purpose: faker.lorem.sentence(),
    ...overrides,
  };
}

// =============================================================================
// AI INSIGHTS FACTORIES
// =============================================================================

const INSIGHT_SUBJECTS: InsightSubjectType[] = [
  'contact', 'thread', 'account', 'workspace', 'project', 'task',
  'email', 'meeting', 'campaign', 'pipeline', 'segment'
];

const INSIGHT_KINDS: InsightKind[] = [
  'thread_summary', 'meeting_summary', 'account_summary', 'weekly_digest',
  'next_best_action', 'reply_draft', 'subject_line_suggestions', 'playbook_recommendation',
  'lead_score', 'health_score', 'upsell_score', 'churn_risk',
  'smart_segment_definition', 'cluster_assignment', 'entity_enrichment', 'title_inference',
  'company_match', 'pii_detected', 'policy_flag', 'anomaly_detected',
  'duplicate_contact_suspected', 'campaign_driver_analysis', 'cohort_insight', 'topic_trend'
];

export function makeInsightContent(overrides: Partial<InsightContent> = {}): InsightContent {
  return {
    title: faker.lorem.words(5),
    summary: faker.lorem.paragraph(),
    score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
    tags: faker.helpers.arrayElements(['wellness', 'engagement', 'revenue', 'risk'], { min: 1, max: 3 }),
    priority: faker.helpers.arrayElement(['low', 'medium', 'high', 'critical']),
    references: [
      {
        table: 'contacts',
        id: faker.string.uuid(),
      }
    ],
    props: {
      score0To100: faker.number.int({ min: 0, max: 100 }),
      reasons: faker.helpers.arrayElements([
        'High engagement', 'Regular attendance', 'Positive feedback', 'Referral activity'
      ], { min: 1, max: 3 }),
    },
    actions: [
      {
        type: 'send_email',
        label: 'Send Follow-up Email',
        payload: { template: 'follow_up' },
      }
    ],
    ttlHours: faker.number.int({ min: 24, max: 168 }), // 1 day to 1 week
    expiresAt: faker.date.future().toISOString(),
    status: faker.helpers.arrayElement(['new', 'viewed', 'dismissed', 'applied']),
    ...overrides,
  };
}

export function makeAIInsight(overrides: Partial<AIInsight> = {}): AIInsight {
  return {
    id: faker.string.uuid(),
    userId: faker.string.uuid(),
    subjectType: faker.helpers.arrayElement(INSIGHT_SUBJECTS),
    subjectId: faker.string.uuid(),
    kind: faker.helpers.arrayElement(INSIGHT_KINDS),
    content: makeInsightContent(),
    model: faker.helpers.arrayElement(['gpt-4', 'claude-3-sonnet', 'gpt-3.5-turbo']),
    createdAt: faker.date.recent().toISOString(),
    fingerprint: faker.string.alphanumeric(32),
    ...overrides,
  };
}

export function makeNewAIInsight(overrides: Partial<NewAIInsight> = {}): NewAIInsight {
  const insight = makeAIInsight(overrides);
  const { id, createdAt, fingerprint, ...newInsight } = insight;
  return newInsight;
}

// =============================================================================
// BATCH FACTORY HELPERS
// =============================================================================

/**
 * Creates an array of items using the provided factory function
 */
export function makeBatch<T>(factory: (overrides?: Record<string, unknown>) => T, count: number, overrides: Record<string, unknown> = {}): T[] {
  return Array.from({ length: count }, () => factory(overrides));
}

/**
 * Creates realistic contact data with relationships (contact + notes + interactions)
 */
export function makeContactWithRelations(overrides: {
  contact?: Partial<OmniClientWithNotesDTO>;
  noteCount?: number;
  interactionCount?: number;
} = {}) {
  const contact = makeOmniClientWithNotes(overrides.contact);
  const notes = makeBatch(
    (o) => makeNoteDTO({ contactId: contact.id, userId: contact.userId, ...o }),
    overrides.noteCount ?? contact.notesCount
  );
  const interactions = makeBatch(
    (o) => makeInteraction({ contactId: contact.id, userId: contact.userId, ...o }),
    overrides.interactionCount ?? (contact.interactions || 0)
  );

  return { contact, notes, interactions };
}

/**
 * Creates realistic pagination response data
 */
export function makePaginatedResponse<T>(
  items: T[],
  total: number = items.length,
  nextCursor: string | null = null
) {
  return {
    items,
    total,
    nextCursor,
  };
}