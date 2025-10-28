/**
 * Compliance & Consent Tools
 *
 * AI-callable tools for managing client consent, HIPAA compliance, and data processing agreements.
 * Implements consent tracking, compliance verification, and reminder task creation.
 */

import type { ToolDefinition, ToolHandler } from "../types";
import { z } from "zod";
import { getDb } from "@/server/db/client";
import { createComplianceRepository } from "@repo";
import { AppError } from "@/lib/errors/app-error";

// ============================================================================
// TOOL 1: get_consent_status
// ============================================================================

const GetConsentStatusParamsSchema = z.object({
  contact_id: z.string().uuid(),
  consent_type: z.enum(["data_processing", "marketing", "hipaa", "photography"]).optional(),
});

type GetConsentStatusParams = z.infer<typeof GetConsentStatusParamsSchema>;

export const getConsentStatusDefinition: ToolDefinition = {
  name: "get_consent_status",
  category: "data_access",
  version: "1.0.0",
  description:
    "Check consent status for a specific contact. Returns granted consents with type, status, date, and version. Optionally filter by specific consent type (data_processing, marketing, hipaa, photography).",
  useCases: [
    "When user asks 'Does Sarah have signed HIPAA consent?'",
    "When checking compliance before sending marketing emails",
    "When verifying 'what consents does this client have?'",
    "When reviewing 'do I have permission to use their photos?'",
  ],
  exampleCalls: [
    'get_consent_status({"contact_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'get_consent_status({"contact_id": "123e4567-e89b-12d3-a456-426614174000", "consent_type": "hipaa"})',
    'User: "Does John have HIPAA consent?" → get_consent_status({...})',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to check consent for",
      },
      consent_type: {
        type: "string",
        description:
          "Optional: Filter by specific consent type (data_processing, marketing, hipaa, photography)",
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
  tags: ["compliance", "consent", "read", "hipaa"],
  deprecated: false,
};

export const getConsentStatusHandler: ToolHandler<GetConsentStatusParams> = async (
  params,
  context,
) => {
  const validated = GetConsentStatusParamsSchema.parse(params);
  const db = await getDb();
  const repo = createComplianceRepository(db);

  try {
    const consents = await repo.getConsentStatus(
      context.userId,
      validated.contact_id,
      validated.consent_type,
    );

    return {
      contactId: validated.contact_id,
      consents,
      totalConsents: consents.length,
      filtered: validated.consent_type
        ? { consentType: validated.consent_type }
        : { consentType: "all" },
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get consent status",
      "GET_CONSENT_STATUS_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 2: list_missing_consents
// ============================================================================

const ListMissingConsentsParamsSchema = z.object({
  required_consent_types: z
    .array(z.enum(["data_processing", "marketing", "hipaa", "photography"]))
    .min(1)
    .default(["data_processing", "hipaa"]),
});

type ListMissingConsentsParams = z.infer<typeof ListMissingConsentsParamsSchema>;

export const listMissingConsentsDefinition: ToolDefinition = {
  name: "list_missing_consents",
  category: "data_access",
  version: "1.0.0",
  description:
    "Find all contacts missing required consent types. Returns contacts who don't have granted consent for the specified types. Useful for compliance audits and follow-up campaigns.",
  useCases: [
    "When user asks 'who hasn't signed HIPAA consent?'",
    "When preparing compliance audit: 'show me clients without data processing consent'",
    "When planning marketing: 'which contacts need marketing consent?'",
    "When reviewing 'are all my clients compliant?'",
  ],
  exampleCalls: [
    'list_missing_consents({"required_consent_types": ["hipaa", "data_processing"]})',
    'list_missing_consents({"required_consent_types": ["marketing"]})',
    'User: "Show me clients without HIPAA consent" → list_missing_consents({...})',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      required_consent_types: {
        type: "array",
        items: { type: "string" },
        description:
          "Array of required consent types to check. Defaults to ['data_processing', 'hipaa']",
      },
    },
    required: [],
    additionalProperties: false,
  },
  permissionLevel: "read",
  creditCost: 0,
  isIdempotent: true,
  cacheable: true,
  cacheTtlSeconds: 600, // 10 minutes - compliance data changes infrequently
  tags: ["compliance", "consent", "read", "audit"],
  deprecated: false,
};

export const listMissingConsentsHandler: ToolHandler<ListMissingConsentsParams> = async (
  params,
  context,
) => {
  const validated = ListMissingConsentsParamsSchema.parse(params);
  const db = await getDb();
  const repo = createComplianceRepository(db);

  try {
    const missingConsents = await repo.getContactsMissingConsents(
      context.userId,
      validated.required_consent_types,
    );

    return {
      totalContacts: missingConsents.length,
      requiredTypes: validated.required_consent_types,
      contacts: missingConsents,
      summary: `Found ${missingConsents.length} contact${missingConsents.length === 1 ? "" : "s"} missing required consents`,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to list missing consents",
      "LIST_MISSING_CONSENTS_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 3: get_consent_history
// ============================================================================

const GetConsentHistoryParamsSchema = z.object({
  contact_id: z.string().uuid(),
});

type GetConsentHistoryParams = z.infer<typeof GetConsentHistoryParamsSchema>;

export const getConsentHistoryDefinition: ToolDefinition = {
  name: "get_consent_history",
  category: "data_access",
  version: "1.0.0",
  description:
    "Retrieve complete consent audit trail for a contact. Returns all consent records with timestamps, IP addresses, versions, and granted status. Essential for compliance audits and legal documentation.",
  useCases: [
    "When user asks 'show me the full consent history for Sarah'",
    "When auditing: 'when did this client sign HIPAA consent?'",
    "When verifying: 'what's the complete consent trail for this contact?'",
    "During legal review: 'show me all consent records with IP addresses'",
  ],
  exampleCalls: [
    'get_consent_history({"contact_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'User: "Show me John\'s consent history" → get_consent_history({...})',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to retrieve consent history for",
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
  tags: ["compliance", "consent", "read", "audit", "history"],
  deprecated: false,
};

export const getConsentHistoryHandler: ToolHandler<GetConsentHistoryParams> = async (
  params,
  context,
) => {
  const validated = GetConsentHistoryParamsSchema.parse(params);
  const db = await getDb();
  const repo = createComplianceRepository(db);

  try {
    const history = await repo.getConsentHistory(context.userId, validated.contact_id);

    return {
      contactId: validated.contact_id,
      totalRecords: history.length,
      history,
      summary: `Found ${history.length} consent record${history.length === 1 ? "" : "s"} in audit trail`,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to get consent history",
      "GET_CONSENT_HISTORY_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 4: generate_consent_reminder
// ============================================================================

const GenerateConsentReminderParamsSchema = z.object({
  contact_id: z.string().uuid(),
  consent_type: z.enum(["data_processing", "marketing", "hipaa", "photography"]),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

type GenerateConsentReminderParams = z.infer<typeof GenerateConsentReminderParamsSchema>;

export const generateConsentReminderDefinition: ToolDefinition = {
  name: "generate_consent_reminder",
  category: "data_mutation",
  version: "1.0.0",
  description:
    "Create a high-priority task reminder to obtain consent from a contact. Generates a task in the task management system with contact details and consent type. Useful for compliance follow-up workflows.",
  useCases: [
    "When user asks 'remind me to get HIPAA consent from Sarah'",
    "When following up: 'create a task to get marketing consent from new clients'",
    "When planning: 'I need to get data processing consent from John by Friday'",
    "During onboarding: 'set reminder to obtain photography consent'",
  ],
  exampleCalls: [
    'generate_consent_reminder({"contact_id": "123e4567-e89b-12d3-a456-426614174000", "consent_type": "hipaa"})',
    'generate_consent_reminder({"contact_id": "123e4567-e89b-12d3-a456-426614174000", "consent_type": "marketing", "due_date": "2025-11-05"})',
    'User: "Remind me to get HIPAA consent from Sarah by next week" → generate_consent_reminder({...})',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact who needs to provide consent",
      },
      consent_type: {
        type: "string",
        description:
          "Type of consent needed: data_processing, marketing, hipaa, or photography",
      },
      due_date: {
        type: "string",
        description: "Optional: Due date for obtaining consent in YYYY-MM-DD format",
      },
    },
    required: ["contact_id", "consent_type"],
    additionalProperties: false,
  },
  permissionLevel: "write",
  creditCost: 0,
  isIdempotent: false, // Creates new task each time
  cacheable: false,
  rateLimit: {
    maxCalls: 50,
    windowMs: 60000, // 50 reminders per minute
  },
  tags: ["compliance", "consent", "write", "tasks", "reminder"],
  deprecated: false,
};

export const generateConsentReminderHandler: ToolHandler<GenerateConsentReminderParams> = async (
  params,
  context,
) => {
  const validated = GenerateConsentReminderParamsSchema.parse(params);
  const db = await getDb();
  const repo = createComplianceRepository(db);

  try {
    const taskId = await repo.createConsentReminderTask(
      context.userId,
      validated.contact_id,
      validated.consent_type,
      validated.due_date,
    );

    return {
      success: true,
      taskId,
      contactId: validated.contact_id,
      consentType: validated.consent_type,
      dueDate: validated.due_date,
      message: `Created high-priority task to obtain ${validated.consent_type} consent`,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to create consent reminder",
      "CREATE_CONSENT_REMINDER_FAILED",
      "database",
      false,
      500,
    );
  }
};

// ============================================================================
// TOOL 5: check_hipaa_compliance
// ============================================================================

const CheckHipaaComplianceParamsSchema = z.object({
  contact_id: z.string().uuid(),
});

type CheckHipaaComplianceParams = z.infer<typeof CheckHipaaComplianceParamsSchema>;

export const checkHipaaComplianceDefinition: ToolDefinition = {
  name: "check_hipaa_compliance",
  category: "data_access",
  version: "1.0.0",
  description:
    "Verify HIPAA compliance status for a contact. Checks for required HIPAA and data processing consents. Returns compliance status, missing consents, and specific issues. Critical for healthcare practitioners.",
  useCases: [
    "When user asks 'is Sarah HIPAA compliant?'",
    "Before treatment: 'verify HIPAA compliance for this client'",
    "When auditing: 'check which clients are not HIPAA compliant'",
    "During onboarding: 'does this new client have all required healthcare consents?'",
  ],
  exampleCalls: [
    'check_hipaa_compliance({"contact_id": "123e4567-e89b-12d3-a456-426614174000"})',
    'User: "Is John HIPAA compliant?" → check_hipaa_compliance({...})',
  ],
  parameters: {
    type: "object" as const,
    properties: {
      contact_id: {
        type: "string",
        description: "UUID of the contact to check HIPAA compliance for",
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
  tags: ["compliance", "hipaa", "read", "healthcare"],
  deprecated: false,
};

export const checkHipaaComplianceHandler: ToolHandler<CheckHipaaComplianceParams> = async (
  params,
  context,
) => {
  const validated = CheckHipaaComplianceParamsSchema.parse(params);
  const db = await getDb();
  const repo = createComplianceRepository(db);

  try {
    const compliance = await repo.checkHipaaCompliance(context.userId, validated.contact_id);

    return {
      contactId: validated.contact_id,
      ...compliance,
      summary: compliance.isCompliant
        ? "Contact is HIPAA compliant - all required consents are in place"
        : `Contact is NOT HIPAA compliant - missing ${compliance.missingConsents.length} required consent${compliance.missingConsents.length === 1 ? "" : "s"}`,
    };
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Failed to check HIPAA compliance",
      "CHECK_HIPAA_COMPLIANCE_FAILED",
      "database",
      false,
      500,
    );
  }
};
