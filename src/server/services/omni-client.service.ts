import { z } from "zod";
import { ContactsRepository } from "@repo";
import type { UpdateContact } from "@/server/db/business-schemas";
import { UpdateOmniClientSchema } from "@/server/db/business-schemas/omniClients";
import { toOmniClient } from "@/server/adapters/omniClients";

// --- helpers ---
const IdParams = z.object({ clientId: z.string().uuid() });

function toOptional(v: string | null | undefined): string | undefined {
  if (typeof v === "string" && v.trim().length === 0) return undefined;
  return v ?? undefined;
}

/**
 * Type guard to check if a value is a valid lifecycle stage
 */
function isValidLifecycleStage(
  value: string,
  allowedStages: readonly string[],
): value is (typeof allowedStages)[number] {
  return allowedStages.includes(value);
}

export interface LifecycleStageValidationResult {
  valid: boolean;
  stage?: string;
  error?: string;
}

export interface OmniClientUpdateData {
  displayName?: string;
  primaryEmail?: string | null;
  primaryPhone?: string | null;
  lifecycleStage?: string | null;
  tags?: string[] | null;
}

export interface OmniClientValidationResult {
  valid: boolean;
  updates: UpdateContact;
  errors?: string[];
  providedFields?: string[];
  allowedFields?: string[];
}

export class OmniClientService {
  /**
   * Get a single OmniClient by ID
   *
   * @param userId - The user ID
   * @param clientId - The client ID
   * @returns Promise<object | null> - The OmniClient object or null if not found
   */
  static async getOmniClient(userId: string, clientId: string): Promise<object | null> {
    const validatedParams = IdParams.parse({ clientId });
    const contact = await ContactsRepository.getContactById(userId, validatedParams.clientId);

    if (!contact) {
      return null;
    }

    return toOmniClient(contact);
  }

  /**
   * Update an OmniClient with validation and business logic
   *
   * @param userId - The user ID
   * @param clientId - The client ID
   * @param updateData - The update data
   * @returns Promise<object | null> - The updated OmniClient or null if not found
   */
  static async updateOmniClient(
    userId: string,
    clientId: string,
    updateData: Record<string, unknown>,
  ): Promise<object | null> {
    const validatedParams = IdParams.parse({ clientId });
    const validatedBody = UpdateOmniClientSchema.parse(updateData);

    const validationResult = this.validateUpdateData(validatedBody);
    if (!validationResult.valid) {
      throw new Error(`Validation failed: ${validationResult.errors?.join(", ")}`);
    }

    const updatedContact = await ContactsRepository.updateContact(
      userId,
      validatedParams.clientId,
      validationResult.updates,
    );

    if (!updatedContact) {
      return null;
    }

    return toOmniClient(updatedContact);
  }

  /**
   * Delete an OmniClient
   *
   * @param userId - The user ID
   * @param clientId - The client ID
   * @returns Promise<boolean> - True if deleted, false if not found
   */
  static async deleteOmniClient(userId: string, clientId: string): Promise<boolean> {
    const validatedParams = IdParams.parse({ clientId });
    return await ContactsRepository.deleteContact(userId, validatedParams.clientId);
  }

  /**
   * Validate lifecycle stage value
   *
   * @param stageValue - The stage value to validate
   * @returns LifecycleStageValidationResult - Validation result with stage or error
   */
  static validateLifecycleStage(stageValue: string): LifecycleStageValidationResult {
    const allowedStages = [
      "New Client",
      "VIP Client",
      "Core Client",
      "Prospect",
      "At Risk Client",
      "Lost Client",
      "Referring Client",
    ] as const;

    // Use proper type guard instead of type assertion
    if (isValidLifecycleStage(stageValue, allowedStages)) {
      return {
        valid: true,
        stage: stageValue,
      };
    }

    return {
      valid: false,
      error: `Invalid lifecycle stage: ${stageValue}`,
    };
  }

  /**
   * Validate and process update data for OmniClient
   *
   * @param validatedBody - The validated request body
   * @returns OmniClientValidationResult - Validation result with updates or errors
   */
  private static validateUpdateData(
    validatedBody: Record<string, unknown>,
  ): OmniClientValidationResult {
    const updates: UpdateContact = {};

    if (validatedBody["displayName"] !== undefined) {
      updates.displayName = validatedBody["displayName"] as string;
    }

    if (validatedBody["primaryEmail"] !== undefined) {
      updates.primaryEmail = toOptional(validatedBody["primaryEmail"] as string | null);
    }

    if (validatedBody["primaryPhone"] !== undefined) {
      updates.primaryPhone = toOptional(validatedBody["primaryPhone"] as string | null);
    }

    if (validatedBody["lifecycleStage"] !== undefined) {
      const stageValue = toOptional(validatedBody["lifecycleStage"] as string | null);
      if (stageValue !== undefined) {
        const stageValidation = this.validateLifecycleStage(stageValue);
        if (!stageValidation.valid) {
          return {
            valid: false,
            updates: {},
            errors: [stageValidation.error!],
          };
        }
        updates.lifecycleStage = stageValidation.stage as UpdateContact["lifecycleStage"];
      }
    }

    if (validatedBody["tags"] !== undefined) {
      updates.tags = (validatedBody["tags"] as string[] | null) ?? undefined;
    }

    if (Object.keys(updates).length === 0) {
      // Analyze what was provided vs what's valid
      const providedFields = Object.keys(validatedBody);
      const allowedFields = [
        "displayName",
        "primaryEmail",
        "primaryPhone",
        "lifecycleStage",
        "tags",
      ];
      const invalidFields = providedFields.filter((field) => !allowedFields.includes(field));
      const emptyFields = providedFields.filter((field) => {
        const value = validatedBody[field];
        return (
          value === null ||
          value === undefined ||
          (typeof value === "string" && value.trim() === "")
        );
      });

      const errors = [];
      if (invalidFields.length > 0) {
        errors.push(`Invalid fields: ${invalidFields.join(", ")}`);
      }
      if (emptyFields.length > 0) {
        errors.push(`Empty fields: ${emptyFields.join(", ")}`);
      }
      if (errors.length === 0) {
        errors.push("No valid updates provided");
      }

      return {
        valid: false,
        updates: {},
        errors,
        providedFields,
        allowedFields,
      };
    }

    return {
      valid: true,
      updates,
    };
  }
}
