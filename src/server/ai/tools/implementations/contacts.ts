/**
 * Contact Management Tools
 *
 * AI-callable tools for contact/client operations in the wellness CRM.
 * Implements data access and mutation tools for the contacts domain.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createContactsRepository } from "@/packages/repo/src/contacts.repo";
import { AppError } from "@/lib/errors";

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
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 300, // 5 minutes
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
      "not_found",
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
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 60, // 1 minute
  tags: ["contacts", "search", "read"],
};

export const searchContactsHandler: ToolHandler<SearchContactsParams> = async (
  params,
  context,
) => {
  const validated = SearchContactsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const contacts = await repo.searchContacts(context.userId, {
    query: validated.query,
    lifecycleStage: validated.lifecycle_stage,
    limit: validated.limit,
  });

  return {
    contacts,
    count: contacts.length,
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
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 30,
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
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false,
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 contacts per minute
  },
  tags: ["contacts", "create", "write"],
};

export const createContactHandler: ToolHandler<CreateContactParams> = async (
  params,
  context,
) => {
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
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: true,
  tags: ["contacts", "update", "write"],
};

export const updateContactHandler: ToolHandler<UpdateContactParams> = async (
  params,
  context,
) => {
  const validated = UpdateContactParamsSchema.parse(params);
  const db = await getDb();
  const repo = createContactsRepository(db);

  const updates: Record<string, unknown> = {};
  if (validated.display_name !== undefined) updates.displayName = validated.display_name;
  if (validated.primary_email !== undefined) updates.primaryEmail = validated.primary_email;
  if (validated.primary_phone !== undefined) updates.primaryPhone = validated.primary_phone;
  if (validated.lifecycle_stage !== undefined)
    updates.lifecycleStage = validated.lifecycle_stage;
  if (validated.client_status !== undefined) updates.clientStatus = validated.client_status;

  const contact = await repo.updateContact(context.userId, validated.contact_id, updates);

  if (!contact) {
    throw new AppError(
      `Contact with ID ${validated.contact_id} not found`,
      "CONTACT_NOT_FOUND",
      "not_found",
      true,
      404,
    );
  }

  return contact;
};
