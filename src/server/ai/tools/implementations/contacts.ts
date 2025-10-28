/**
 * Contact Management Tools
 *
 * AI-callable tools for contact/client operations in the wellness CRM.
 * Implements data access and mutation tools for the contacts domain.
 */

import type { ToolDefinition, ToolHandler } from "@/server/ai/tools/types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createContactsRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TOOL: get_contact
// ============================================================================

const GetContactParamsSchema = z.object({
  contact_id: z.string().uuid(),
});

type GetContactParams = z.infer<typeof GetContactParamsSchema>;

export const getContactDefinition: ToolDefinition = {
  name: "get_contact",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve complete details for a specific contact/client by their ID. Returns contact information including name, email, phone, lifecycle stage, health context, and preferences.",
  useCases: [
    "When user asks 'show me details for [contact name]'",
    "When preparing for a client session and need full context",
    "When reviewing client history before making contact",
    "When verifying contact information before updating",
  ],
  exampleCalls: [
    'get_contact({"contact_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'When user says: "Pull up Sarah Johnson\'s profile"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to retrieve",
      },
    },
    required: ["contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  deprecated: false,
  tags: ["contacts", "read", "client-management"],
};

export const getContactHandler: ToolHandler<GetContactParams> = async (params, context) => {
  const validated = GetContactParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const contact = await repo.getContactById(context.userId, validated.contact_id);

  if (!contact) {
    throw new AppError(
      `Contact with ID ${validated.contact_id} not found`,
      "CONTACT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  return contact;
};

// ============================================================================
// TOOL: search_contacts
// ============================================================================

const SearchContactsParamsSchema = z.object({
  query: z.string().min(1),
  lifecycle_stage: z.enum(["prospect", "new_client", "core_client", "vip_client"]).optional(),
  limit: z.number().int().positive().max(100).default(20),
});

type SearchContactsParams = z.infer<typeof SearchContactsParamsSchema>;

export const searchContactsDefinition: ToolDefinition = {
  name: "search_contacts",
  category: "data_access",
  version: "1.0.0",
  description:
    "Search for contacts using a text query. Searches across contact names, emails, and phone numbers. Can optionally filter by lifecycle stage.",
  useCases: [
    "When user asks 'find all clients named Sarah'",
    "When user wants to 'show me all VIP clients'",
    "When user searches 'who has email @gmail.com'",
    "When looking up contacts by partial name or phone number",
  ],
  exampleCalls: [
    'search_contacts({"query": "Sarah", "limit": 10})',
    'search_contacts({"query": "555-1234"})',
    'search_contacts({"query": "yoga", "lifecycle_stage": "core_client"})',
  ],
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search text (name, email, phone)",
      },
      lifecycle_stage: {
        type: "string",
        description: "Optional filter by lifecycle stage",
        enum: ["prospect", "new_client", "core_client", "vip_client"],
      },
      limit: {
        type: "number",
        description: "Maximum number of results (default 20, max 100)",
      },
    },
    required: ["query"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60, // 1 minute
  deprecated: false,
  tags: ["contacts", "search", "read"],
};

export const searchContactsHandler: ToolHandler<SearchContactsParams> = async (params, context) => {
  const validated = SearchContactsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const { items, total } = await repo.listContacts(context.userId, {
    search: validated.query,
    pageSize: validated.limit,
  });

  // Filter by lifecycle stage if provided
  const filteredContacts = validated.lifecycle_stage
    ? items.filter((c) => c.lifecycleStage === validated.lifecycle_stage)
    : items;

  return {
    contacts: filteredContacts,
    count: filteredContacts.length,
    query: validated.query,
  };
};

// ============================================================================
// TOOL: list_contacts
// ============================================================================

const ListContactsParamsSchema = z.object({
  lifecycle_stage: z.enum(["prospect", "new_client", "core_client", "vip_client"]).optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

type ListContactsParams = z.infer<typeof ListContactsParamsSchema>;

export const listContactsDefinition: ToolDefinition = {
  name: "list_contacts",
  category: "data_access",
  version: "1.0.0",
  description:
    "List contacts with optional filtering by lifecycle stage. Returns paginated results ordered by most recently updated.",
  useCases: [
    "When user asks 'show me all my clients'",
    "When user wants to 'list all new clients this month'",
    "When building a client overview dashboard",
    "When preparing batch communications",
  ],
  exampleCalls: [
    'list_contacts({"limit": 20})',
    'list_contacts({"lifecycle_stage": "vip_client", "limit": 10})',
  ],
  parameters: {
    type: "object",
    properties: {
      lifecycle_stage: {
        type: "string",
        description: "Filter by lifecycle stage",
        enum: ["prospect", "new_client", "core_client", "vip_client"],
      },
      limit: {
        type: "number",
        description: "Number of contacts to return (max 100)",
      },
      offset: {
        type: "number",
        description: "Number of contacts to skip for pagination",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 30,
  deprecated: false,
  tags: ["contacts", "list", "read"],
};

export const listContactsHandler: ToolHandler<ListContactsParams> = async (params, context) => {
  const validated = ListContactsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const { items, total } = await repo.listContacts(context.userId, {
    lifecycleStage: validated.lifecycle_stage,
    limit: validated.limit,
    offset: validated.offset,
  });

  return {
    contacts: items,
    pagination: {
      total,
      limit: validated.limit,
      offset: validated.offset,
      hasMore: validated.offset + items.length < total,
    },
  };
};

// ============================================================================
// TOOL: create_contact
// ============================================================================

const CreateContactParamsSchema = z.object({
  display_name: z.string().min(1),
  primary_email: z.string().email().optional(),
  primary_phone: z.string().optional(),
  source: z.string().optional(),
  lifecycle_stage: z.string().default("prospect"),
  date_of_birth: z.coerce.date().optional(),
});

type CreateContactParams = z.infer<typeof CreateContactParamsSchema>;

export const createContactDefinition: ToolDefinition = {
  name: "create_contact",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Create a new contact/client record. Minimum requirement is display_name. Returns the newly created contact with generated ID.",
  useCases: [
    "When user says 'add a new client named Sarah Johnson'",
    "When capturing lead information from intake form",
    "When manually adding contact from verbal conversation",
    "When importing contacts from external source",
  ],
  exampleCalls: [
    'create_contact({"display_name": "Sarah Johnson", "primary_email": "sarah@example.com"})',
    'create_contact({"display_name": "John Doe", "primary_phone": "555-1234", "source": "referral"})',
  ],
  parameters: {
    type: "object",
    properties: {
      display_name: {
        type: "string",
        description: "Full name of the contact (required)",
      },
      primary_email: {
        type: "string",
        description: "Email address",
      },
      primary_phone: {
        type: "string",
        description: "Phone number",
      },
      source: {
        type: "string",
        description: "How this contact was acquired (e.g., 'referral', 'website', 'event')",
      },
      lifecycle_stage: {
        type: "string",
        description: "Initial lifecycle stage (default: 'prospect')",
      },
      date_of_birth: {
        type: "string",
        description: "Date of birth in ISO format (YYYY-MM-DD)",
      },
    },
    required: ["display_name"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false,
  cacheable: false,
  deprecated: false,
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 contacts per minute
  },
  tags: ["contacts", "create", "write"],
};

export const createContactHandler: ToolHandler<CreateContactParams> = async (params, context) => {
  const validated = CreateContactParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const contact = await repo.createContact(context.userId, {
    displayName: validated.display_name,
    primaryEmail: validated.primary_email ?? null,
    primaryPhone: validated.primary_phone ?? null,
    source: validated.source ?? null,
    lifecycleStage: validated.lifecycle_stage,
    dateOfBirth: validated.date_of_birth ?? null,
  });

  return contact;
};

// ============================================================================
// TOOL: update_contact
// ============================================================================

const UpdateContactParamsSchema = z.object({
  contact_id: z.string().uuid(),
  display_name: z.string().min(1).optional(),
  primary_email: z.string().email().optional(),
  primary_phone: z.string().optional(),
  lifecycle_stage: z.string().optional(),
  client_status: z.string().optional(),
});

type UpdateContactParams = z.infer<typeof UpdateContactParamsSchema>;

export const updateContactDefinition: ToolDefinition = {
  name: "update_contact",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Update existing contact information. Only provided fields will be updated. Returns the updated contact.",
  useCases: [
    "When user says 'update Sarah\\'s email to newemail@example.com'",
    "When client provides updated phone number",
    "When promoting contact to next lifecycle stage",
    "When correcting typos in contact information",
  ],
  exampleCalls: [
    'update_contact({"contact_id": "123...", "primary_email": "new@example.com"})',
    'update_contact({"contact_id": "123...", "lifecycle_stage": "core_client"})',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of contact to update",
      },
      display_name: {
        type: "string",
        description: "Updated full name",
      },
      primary_email: {
        type: "string",
        description: "Updated email address",
      },
      primary_phone: {
        type: "string",
        description: "Updated phone number",
      },
      lifecycle_stage: {
        type: "string",
        description: "Updated lifecycle stage",
      },
      client_status: {
        type: "string",
        description: "Updated client status",
      },
    },
    required: ["contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["contacts", "update", "write"],
};

export const updateContactHandler: ToolHandler<UpdateContactParams> = async (params, context) => {
  const validated = UpdateContactParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const updates: Record<string, unknown> = {};
  if (validated.display_name !== undefined) updates["displayName"] = validated.display_name;
  if (validated.primary_email !== undefined) updates["primaryEmail"] = validated.primary_email;
  if (validated.primary_phone !== undefined) updates["primaryPhone"] = validated.primary_phone;
  if (validated.lifecycle_stage !== undefined)
    updates["lifecycleStage"] = validated.lifecycle_stage;
  if (validated.client_status !== undefined) updates["clientStatus"] = validated.client_status;

  const contact = await repo.updateContact(context.userId, validated.contact_id, updates);

  if (!contact) {
    throw new AppError(
      `Contact with ID ${validated.contact_id} not found`,
      "CONTACT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  return contact;
};

// ============================================================================
// TOOL: update_lifecycle_stage
// ============================================================================

const UpdateLifecycleStageParamsSchema = z.object({
  contact_id: z.string().uuid(),
  lifecycle_stage: z.enum([
    "prospect",
    "new_client",
    "core_client",
    "vip_client",
    "lost_client",
    "at_risk_client",
  ]),
});

type UpdateLifecycleStageParams = z.infer<typeof UpdateLifecycleStageParamsSchema>;

export const updateLifecycleStageDefinition: ToolDefinition = {
  name: "update_lifecycle_stage",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Update a contact's lifecycle stage to track their journey through the client relationship. Stages include: prospect (1-2 events), new_client (2-5 events), core_client (6+ events), vip_client (high frequency + premium), lost_client (60+ days inactive), at_risk_client (declining attendance).",
  useCases: [
    "When user says 'promote Sarah to VIP client'",
    "When contact has attended enough sessions to become a core client",
    "When user wants to 'mark John as at-risk'",
    "When moving prospect to new_client after first booking",
  ],
  exampleCalls: [
    'update_lifecycle_stage({"contact_id": "123...", "lifecycle_stage": "core_client"})',
    'update_lifecycle_stage({"contact_id": "123...", "lifecycle_stage": "vip_client"})',
    'When user says: "Sarah has become a VIP client"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to update",
      },
      lifecycle_stage: {
        type: "string",
        description: "New lifecycle stage",
        enum: ["prospect", "new_client", "core_client", "vip_client", "lost_client", "at_risk_client"],
      },
    },
    required: ["contact_id", "lifecycle_stage"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["contacts", "lifecycle", "write"],
};

export const updateLifecycleStageHandler: ToolHandler<UpdateLifecycleStageParams> = async (
  params,
  context,
) => {
  const validated = UpdateLifecycleStageParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const contact = await repo.updateContact(context.userId, validated.contact_id, {
    lifecycleStage: validated.lifecycle_stage,
  });

  if (!contact) {
    throw new AppError(
      `Contact with ID ${validated.contact_id} not found`,
      "CONTACT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  return {
    success: true,
    contactId: contact.id,
    displayName: contact.displayName,
    previousStage: contact.lifecycleStage,
    newStage: validated.lifecycle_stage,
  };
};

// ============================================================================
// TOOL: get_referral_sources
// ============================================================================

const GetReferralSourcesParamsSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
});

type GetReferralSourcesParams = z.infer<typeof GetReferralSourcesParamsSchema>;

interface ReferralSourceSummary {
  source: string;
  count: number;
  percentage: number;
}

interface ReferralSourcesResult {
  sources: ReferralSourceSummary[];
  totalContacts: number;
  contactsWithSource: number;
  contactsWithoutSource: number;
}

export const getReferralSourcesDefinition: ToolDefinition = {
  name: "get_referral_sources",
  category: "analytics",
  version: "1.0.0",
  description:
    "Get a summary of all referral sources with counts and percentages. Shows how contacts found the business (e.g., 'friend referral', 'google search', 'instagram', 'event').",
  useCases: [
    "When user asks 'where do my clients come from?'",
    "When analyzing marketing effectiveness",
    "When user wants to 'show me referral source breakdown'",
    "When planning marketing budget allocation",
  ],
  exampleCalls: [
    'get_referral_sources({"limit": 10})',
    'get_referral_sources({})',
    'When user says: "What are my top referral sources?"',
  ],
  parameters: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        description: "Maximum number of sources to return (default 20, max 100)",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
  deprecated: false,
  tags: ["contacts", "analytics", "referrals", "read"],
};

export const getReferralSourcesHandler: ToolHandler<GetReferralSourcesParams> = async (
  params,
  context,
) => {
  const validated = GetReferralSourcesParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  // Get all contacts to analyze referral sources
  const { items: allContacts, total } = await repo.listContacts(context.userId, {
    pageSize: 10000, // Get all contacts for analysis
  });

  const contactsWithSource = allContacts.filter((c) => c.referralSource);
  const contactsWithoutSource = total - contactsWithSource.length;

  // Count by source
  const sourceCounts = new Map<string, number>();
  for (const contact of contactsWithSource) {
    const source = contact.referralSource ?? "unknown";
    sourceCounts.set(source, (sourceCounts.get(source) ?? 0) + 1);
  }

  // Convert to array and sort by count
  const sources: ReferralSourceSummary[] = Array.from(sourceCounts.entries())
    .map(([source, count]) => ({
      source,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100 * 100) / 100 : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, validated.limit);

  const result: ReferralSourcesResult = {
    sources,
    totalContacts: total,
    contactsWithSource: contactsWithSource.length,
    contactsWithoutSource,
  };

  return result;
};

// ============================================================================
// TOOL: add_contact_tag
// ============================================================================

const AddContactTagParamsSchema = z.object({
  contact_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});

type AddContactTagParams = z.infer<typeof AddContactTagParamsSchema>;

export const addContactTagDefinition: ToolDefinition = {
  name: "add_contact_tag",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Add a tag to a contact for categorization and filtering. Tags can represent services (e.g., 'Yoga', 'Massage'), demographics (e.g., 'Senior', 'Professional'), goals (e.g., 'Stress Relief'), or engagement patterns (e.g., 'VIP', 'Referral Source').",
  useCases: [
    "When user says 'tag Sarah as a yoga client'",
    "When categorizing contacts for targeted communications",
    "When user wants to 'add stress relief tag to John'",
    "When organizing client base by service interest",
  ],
  exampleCalls: [
    'add_contact_tag({"contact_id": "123...", "tag_id": "456..."})',
    'When user says: "Tag this client as a VIP"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact",
      },
      tag_id: {
        type: "string",
        description: "UUID of the tag to add",
      },
    },
    required: ["contact_id", "tag_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["contacts", "tags", "write"],
};

export const addContactTagHandler: ToolHandler<AddContactTagParams> = async (params, context) => {
  const validated = AddContactTagParamsSchema.parse(params);
  const db = await getDb();
  const contactsRepo = createContactsRepository(db);

  // Import tags repository from @repo
  const { createTagsRepository } = await import("@repo");
  const tagsRepo = createTagsRepository(db);

  // Verify contact exists
  const contact = await contactsRepo.getContactById(context.userId, validated.contact_id);
  if (!contact) {
    throw new AppError(
      `Contact with ID ${validated.contact_id} not found`,
      "CONTACT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Verify tag exists and belongs to user
  const tag = await tagsRepo.getTagById(context.userId, validated.tag_id);
  if (!tag) {
    throw new AppError(
      `Tag with ID ${validated.tag_id} not found`,
      "TAG_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Get existing tags
  const existingTags = await tagsRepo.getContactTags(context.userId, validated.contact_id);
  const existingTagIds = existingTags.map((t) => t.id);

  // Add new tag if not already present
  if (!existingTagIds.includes(validated.tag_id)) {
    await tagsRepo.applyTagsToContact(
      context.userId,
      validated.contact_id,
      [...existingTagIds, validated.tag_id],
      context.userId,
    );
  }

  return {
    success: true,
    contactId: validated.contact_id,
    contactName: contact.displayName,
    tagId: validated.tag_id,
    tagName: tag.name,
    alreadyTagged: existingTagIds.includes(validated.tag_id),
  };
};

// ============================================================================
// TOOL: remove_contact_tag
// ============================================================================

const RemoveContactTagParamsSchema = z.object({
  contact_id: z.string().uuid(),
  tag_id: z.string().uuid(),
});

type RemoveContactTagParams = z.infer<typeof RemoveContactTagParamsSchema>;

export const removeContactTagDefinition: ToolDefinition = {
  name: "remove_contact_tag",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Remove a tag from a contact. Used to update categorization when contact interests or characteristics change.",
  useCases: [
    "When user says 'remove the yoga tag from Sarah'",
    "When contact no longer interested in a service",
    "When user wants to 'untag John from VIP'",
    "When cleaning up outdated categorizations",
  ],
  exampleCalls: [
    'remove_contact_tag({"contact_id": "123...", "tag_id": "456..."})',
    'When user says: "Remove the stress relief tag from this client"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact",
      },
      tag_id: {
        type: "string",
        description: "UUID of the tag to remove",
      },
    },
    required: ["contact_id", "tag_id"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  cacheable: false,
  deprecated: false,
  tags: ["contacts", "tags", "write"],
};

export const removeContactTagHandler: ToolHandler<RemoveContactTagParams> = async (
  params,
  context,
) => {
  const validated = RemoveContactTagParamsSchema.parse(params);
  const db = await getDb();
  const contactsRepo = createContactsRepository(db);

  // Import tags repository from @repo
  const { createTagsRepository } = await import("@repo");
  const tagsRepo = createTagsRepository(db);

  // Verify contact exists
  const contact = await contactsRepo.getContactById(context.userId, validated.contact_id);
  if (!contact) {
    throw new AppError(
      `Contact with ID ${validated.contact_id} not found`,
      "CONTACT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Verify tag exists
  const tag = await tagsRepo.getTagById(context.userId, validated.tag_id);
  if (!tag) {
    throw new AppError(
      `Tag with ID ${validated.tag_id} not found`,
      "TAG_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  // Remove tag
  const removedCount = await tagsRepo.removeTagsFromContact(context.userId, validated.contact_id, [
    validated.tag_id,
  ]);

  return {
    success: true,
    contactId: validated.contact_id,
    contactName: contact.displayName,
    tagId: validated.tag_id,
    tagName: tag.name,
    removed: removedCount > 0,
  };
};

// ============================================================================
// TOOL: get_contact_timeline
// ============================================================================

const GetContactTimelineParamsSchema = z.object({
  contact_id: z.string().uuid(),
  limit: z.number().int().positive().max(200).default(50),
  include_types: z
    .array(z.enum(["interaction", "note", "file"]))
    .optional()
    .default(["interaction", "note"]),
});

type GetContactTimelineParams = z.infer<typeof GetContactTimelineParamsSchema>;

interface TimelineEvent {
  type: "interaction" | "note" | "file";
  id: string;
  timestamp: Date;
  title: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

interface ContactTimelineResult {
  contactId: string;
  contactName: string;
  events: TimelineEvent[];
  totalEvents: number;
  dateRange: {
    earliest: Date | null;
    latest: Date | null;
  };
}

export const getContactTimelineDefinition: ToolDefinition = {
  name: "get_contact_timeline",
  category: "data_access",
  version: "1.0.0",
  description:
    "Get the complete interaction history for a contact, including emails, calls, meetings, notes, and files. Events are sorted by date (most recent first) to provide a chronological view of the relationship.",
  useCases: [
    "When user asks 'show me all interactions with Sarah'",
    "When preparing for a client session and need full context",
    "When user wants to 'review my history with John'",
    "When analyzing client engagement patterns",
  ],
  exampleCalls: [
    'get_contact_timeline({"contact_id": "123...", "limit": 50})',
    'get_contact_timeline({"contact_id": "123...", "include_types": ["interaction", "note"]})',
    'When user says: "Show me everything about this client"',
  ],
  parameters: {
    type: "object",
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact",
      },
      limit: {
        type: "number",
        description: "Maximum number of events to return (default 50, max 200)",
      },
      include_types: {
        type: "array",
        description: "Types of events to include (default: interactions and notes)",
        items: {
          type: "string",
        },
      },
    },
    required: ["contact_id"],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60, // 1 minute
  deprecated: false,
  tags: ["contacts", "timeline", "history", "read"],
};

export const getContactTimelineHandler: ToolHandler<GetContactTimelineParams> = async (
  params,
  context,
) => {
  const validated = GetContactTimelineParamsSchema.parse(params);
  const db = await getDb();
  const contactsRepo = createContactsRepository(db);

  // Import repositories
  const { createInteractionsRepository, createNotesRepository } = await import("@repo");
  const interactionsRepo = createInteractionsRepository(db);
  const notesRepo = createNotesRepository(db);

  // Verify contact exists
  const contact = await contactsRepo.getContactById(context.userId, validated.contact_id);
  if (!contact) {
    throw new AppError(
      `Contact with ID ${validated.contact_id} not found`,
      "CONTACT_NOT_FOUND",
      "validation",
      true,
      404,
    );
  }

  const events: TimelineEvent[] = [];

  // Fetch interactions if included
  if (validated.include_types.includes("interaction")) {
    const { items: interactions } = await interactionsRepo.listInteractions(context.userId, {
      contactId: validated.contact_id,
      pageSize: validated.limit,
    });

    for (const interaction of interactions) {
      events.push({
        type: "interaction",
        id: interaction.id,
        timestamp: interaction.occurredAt,
        title: interaction.subject ?? `${interaction.type} interaction`,
        content: interaction.bodyText ?? undefined,
        metadata: {
          interactionType: interaction.type,
          source: interaction.source,
          sourceId: interaction.sourceId,
        },
      });
    }
  }

  // Fetch notes if included
  if (validated.include_types.includes("note")) {
    const notes = await notesRepo.getNotesByContactId(context.userId, validated.contact_id);

    for (const note of notes) {
      events.push({
        type: "note",
        id: note.id,
        timestamp: note.createdAt ?? new Date(),
        title: "Note",
        content: note.contentPlain,
        metadata: {
          sourceType: note.sourceType,
        },
      });
    }
  }

  // Sort by timestamp (most recent first)
  events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Limit results
  const limitedEvents = events.slice(0, validated.limit);

  // Calculate date range
  const timestamps = events.map((e) => e.timestamp.getTime());
  const dateRange = {
    earliest: timestamps.length > 0 ? new Date(Math.min(...timestamps)) : null,
    latest: timestamps.length > 0 ? new Date(Math.max(...timestamps)) : null,
  };

  const result: ContactTimelineResult = {
    contactId: validated.contact_id,
    contactName: contact.displayName,
    events: limitedEvents,
    totalEvents: events.length,
    dateRange,
  };

  return result;
};
