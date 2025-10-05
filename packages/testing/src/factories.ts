/**
 * @fileoverview Test data factories using faker.js for all DTOs
 *
 * Provides realistic test data generation for all application DTOs with:
 * - Faker.js for realistic data generation
 * - Partial override support for test customization
 * - Consistent data patterns across all factories
 * - Wellness business-specific data for contacts
 */

import { faker } from "@faker-js/faker";

// Define the types locally since we're not importing from the main project in tests

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
  lifecycleStage?: (typeof LIFECYCLE_CONTACT_STAGES)[number];
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
  lifecycleStage?: (typeof LIFECYCLE_CONTACT_STAGES)[number];
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

export type NewInteraction = Omit<Interaction, "id" | "createdAt">;


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

export type CreateTaskInput = {
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimatedMinutes?: number;
};


// Utility to convert empty strings to null (matches app behavior)
function emptyToNull(value: string | undefined | null): string | null {
  if (value === undefined || value === null || value.trim() === "") {
    return null;
  }
  return value;
}

// Wellness-specific data for contacts
const WELLNESS_TAGS = [
  // Services (14)
  "Yoga",
  "Massage",
  "Meditation",
  "Pilates",
  "Reiki",
  "Acupuncture",
  "Personal Training",
  "Nutrition Coaching",
  "Life Coaching",
  "Therapy",
  "Workshops",
  "Retreats",
  "Group Classes",
  "Private Sessions",

  // Demographics (11)
  "Senior",
  "Young Adult",
  "Professional",
  "Parent",
  "Student",
  "Beginner",
  "Intermediate",
  "Advanced",
  "VIP",
  "Local",
  "Traveler",

  // Goals & Health (11)
  "Stress Relief",
  "Weight Loss",
  "Flexibility",
  "Strength Building",
  "Pain Management",
  "Mental Health",
  "Spiritual Growth",
  "Mindfulness",
  "Athletic Performance",
  "Injury Recovery",
  "Prenatal",

  // Engagement Patterns (10)
  "Regular Attendee",
  "Weekend Warrior",
  "Early Bird",
  "Evening Preferred",
  "Seasonal Contact",
  "Frequent Visitor",
  "Occasional Visitor",
  "High Spender",
  "Referral Source",
  "Social Media Active",
];

const LIFECYCLE_CONTACT_STAGES = [
  "Prospect",
  "New Client",
  "Core Client",
  "Referring Client",
  "VIP Client",
  "Lost Client",
  "At Risk Client",
];

const CONTACT_SOURCES = [
  "manual",
  "gmail_import",
  "upload",
  "calendar_import",
  "onboarding_form",
] as const;

// =============================================================================
// CONTACT FACTORIES
// =============================================================================

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
    lifecycleStage: faker.helpers.arrayElement(LIFECYCLE_CONTACT_STAGES),
    lastContactDate: faker.date.recent().toISOString(),
    notes: faker.lorem.paragraph(),
    company: faker.company.name(),
    ...overrides,
  };
}

export function makeCreateContactInput(
  overrides: Partial<CreateContactInput> = {},
): CreateContactInput {
  return {
    displayName: faker.person.fullName(),
    primaryEmail: emptyToNull(faker.internet.email()),
    primaryPhone: emptyToNull(faker.phone.number()),
    company: emptyToNull(faker.company.name()),
    notes: emptyToNull(faker.lorem.paragraph()),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 0, max: 3 }),
    lifecycleStage: faker.helpers.arrayElement(LIFECYCLE_CONTACT_STAGES),
    ...overrides,
  };
}

export function makeUpdateContactInput(
  overrides: Partial<UpdateContactInput> = {},
): UpdateContactInput {
  return {
    displayName: faker.person.fullName(),
    primaryEmail: emptyToNull(faker.internet.email()),
    primaryPhone: emptyToNull(faker.phone.number()),
    company: emptyToNull(faker.company.name()),
    notes: emptyToNull(faker.lorem.paragraph()),
    tags: faker.helpers.arrayElements(WELLNESS_TAGS, { min: 0, max: 3 }),
    lifecycleStage: faker.helpers.arrayElement(LIFECYCLE_CONTACT_STAGES),
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
    eventTitles: faker.helpers.arrayElements(
      [
        "Yoga Class",
        "Massage Appointment",
        "Meditation Session",
        "Personal Training",
        "Wellness Consultation",
        "Group Therapy",
        "Nutrition Planning",
        "Stress Relief Workshop",
      ],
      { min: 1, max: eventCount },
    ),
    confidence: faker.helpers.arrayElement(["high", "medium", "low"]),
    source: "calendar_attendee",
    ...overrides,
  };
}

export function makeClientAIInsightsResponse(
  overrides: Partial<ClientAIInsightsResponse> = {},
): ClientAIInsightsResponse {
  return {
    insights: {
      wellnessGoals: faker.helpers.arrayElements(
        [
          "Stress Management",
          "Weight Loss",
          "Flexibility Improvement",
          "Strength Building",
          "Mental Health",
          "Pain Relief",
          "Spiritual Growth",
          "Athletic Performance",
        ],
        { min: 1, max: 3 },
      ),
      preferences: faker.helpers.arrayElements(
        [
          "Morning Sessions",
          "Evening Classes",
          "Weekend Appointments",
          "Group Activities",
          "Private Sessions",
          "Online Classes",
          "In-Person Only",
          "Beginner Friendly",
        ],
        { min: 1, max: 3 },
      ),
      engagementLevel: faker.helpers.arrayElement(["High", "Medium", "Low"]),
      risks: faker.helpers.arrayElements(
        ["Irregular Attendance", "Price Sensitivity", "Scheduling Conflicts", "Lack of Progress"],
        { min: 0, max: 2 },
      ),
      opportunities: faker.helpers.arrayElements(
        ["Upgrade to Premium", "Additional Services", "Referral Program", "Workshop Enrollment"],
        { min: 1, max: 3 },
      ),
      nextSteps: faker.helpers.arrayElements(
        [
          "Schedule Follow-up",
          "Send Program Recommendations",
          "Offer Trial Class",
          "Check-in Call",
        ],
        { min: 1, max: 2 },
      ),
    },
    confidence: faker.number.float({ min: 0.1, max: 1.0, fractionDigits: 2 }),
    ...overrides,
  };
}
// =============================================================================
// INTERACTION FACTORIES
// =============================================================================

const INTERACTION_TYPES = [
  "email_received",
  "email_sent",
  "sms_received",
  "sms_sent",
  "dm_received",
  "dm_sent",
  "meeting_created",
  "meeting_attended",
  "call_logged",
  "note_added",
  "form_submission",
  "web_chat",
  "system_event",
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
    source: faker.helpers.arrayElement(CONTACT_SOURCES),
    sourceId: faker.string.alphanumeric(12),
    sourceMeta: { provider: "gmail", messageId: faker.string.alphanumeric(12) },
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
// TASK FACTORIES
// =============================================================================

export function makeCreateTaskInput(overrides: Partial<CreateTaskInput> = {}): CreateTaskInput {
  return {
    title: faker.lorem.words(5),
    description: faker.lorem.paragraph(),
    priority: faker.helpers.arrayElement(["low", "medium", "high", "urgent"]),
    estimatedMinutes: faker.number.int({ min: 15, max: 480 }), // 15 min to 8 hours
    ...overrides,
  };
}

// =============================================================================
// AI INSIGHTS FACTORIES
// =============================================================================


// =============================================================================
// BATCH FACTORY HELPERS
// =============================================================================

/**
 * Creates an array of items using the provided factory function
 */
export function makeBatch<T>(
  factory: (overrides?: Record<string, unknown>) => T,
  count: number,
  overrides: Record<string, unknown> = {},
): T[] {
  return Array.from({ length: count }, () => factory(overrides));
}

/**
 * Creates realistic contact data with relationships (contact + notes + interactions)
 */
export function makeContactWithRelations(
  options: {
    contact?: Partial<ContactDTO>;
    noteCount?: number;
    interactionCount?: number;
  } = {},
) {
  const { contact: contactOverrides = {}, noteCount = 3, interactionCount = 5 } = options;

  const contact = makeContactDTO(contactOverrides);
  const notes = makeBatch(
    () =>
      makeNoteDTO({
        contactId: contact.id,
        userId: contact.userId,
      }),
    noteCount,
  );
  const interactions = makeBatch(
    () =>
      makeInteraction({
        contactId: contact.id,
        userId: contact.userId,
      }),
    interactionCount,
  );

  return { contact, notes, interactions };
}

/**
 * Creates realistic pagination response data
 */
export function makePaginatedResponse<T>(
  items: T[],
  total: number = items.length,
  nextCursor: string | null = null,
) {
  return {
    items,
    total,
    nextCursor,
  };
}
