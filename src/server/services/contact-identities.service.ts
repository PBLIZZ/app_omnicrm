import {
  ContactIdentitiesRepository,
  type ContactIdentityListParams,
} from "@repo";
import type {
  ContactIdentity,
  CreateContactIdentity,
  UpdateContactIdentity,
} from "@repo";

import { AppError } from "@/lib/errors/app-error";
import { getDb, type DbClient } from "@/server/db/client";

export type ListContactIdentitiesParams = ContactIdentityListParams;

export interface CreateContactIdentityInput {
  contactId: string;
  kind: "email" | "phone" | "handle" | "provider_id";
  value: string;
  provider?: string | null;
}

export type UpdateContactIdentityInput = Partial<Omit<CreateContactIdentityInput, "contactId">>;

function toDatabaseError(message: string, error: unknown): AppError {
  return new AppError(
    message,
    "CONTACT_IDENTITIES_DB_ERROR",
    "database",
    false,
    error instanceof Error ? { cause: error } : { cause: String(error) },
  );
}

export async function listContactIdentitiesService(
  userId: string,
  params: ListContactIdentitiesParams = {},
): Promise<{ items: ContactIdentity[]; total: number }> {
  try {
    const db = await getDb();
    return await ContactIdentitiesRepository.listContactIdentities(db, userId, params);
  } catch (error) {
    throw toDatabaseError("Failed to load contact identities", error);
  }
}

export async function createContactIdentityService(
  userId: string,
  input: CreateContactIdentityInput,
): Promise<ContactIdentity> {
  const sanitized = sanitizeIdentityInput(input);

  try {
    const db = await getDb();
    const existing = await ContactIdentitiesRepository.findByKindAndValue(
      db,
      userId,
      sanitized.kind,
      sanitized.value,
      sanitized.provider ?? undefined,
    );

    if (existing) {
      throw new AppError(
        "Identity already exists for this user",
        "CONTACT_IDENTITY_EXISTS",
        "validation",
        false,
      );
    }

    return await ContactIdentitiesRepository.createContactIdentity(db, {
      userId,
      contactId: sanitized.contactId,
      kind: sanitized.kind,
      value: sanitized.value,
      provider: sanitized.provider,
    } satisfies CreateContactIdentity & { userId: string });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to create contact identity", error);
  }
}

export async function updateContactIdentityService(
  userId: string,
  identityId: string,
  input: UpdateContactIdentityInput,
): Promise<ContactIdentity> {
  if (Object.keys(input).length === 0) {
    throw new AppError("No fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  const sanitized = sanitizeIdentityUpdate(input);

  try {
    const db = await getDb();

    if (sanitized.value !== undefined || sanitized.provider !== undefined || sanitized.kind !== undefined) {
      const checkKind = sanitized.kind ?? undefined;
      const checkValue = sanitized.value ?? undefined;

      if (checkKind && checkValue) {
        const dupCheck = await ContactIdentitiesRepository.findByKindAndValue(
          db,
          userId,
          checkKind,
          checkValue,
          sanitized.provider ?? undefined,
        );

        if (dupCheck && dupCheck.id !== identityId) {
          throw new AppError(
            "Another identity already uses this value",
            "CONTACT_IDENTITY_EXISTS",
            "validation",
            false,
          );
        }
      }
    }

    const updated = await ContactIdentitiesRepository.updateContactIdentity(db, userId, identityId, sanitized);

    if (!updated) {
      throw new AppError("Identity not found", "CONTACT_IDENTITY_NOT_FOUND", "validation", false);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to update contact identity", error);
  }
}

export async function deleteContactIdentityService(
  userId: string,
  identityId: string,
  db?: DbClient,
): Promise<{ deleted: number }> {
  const executor = db ?? (await getDb());

  try {
    const deleted = await ContactIdentitiesRepository.deleteContactIdentity(
      executor,
      userId,
      identityId,
    );

    if (deleted === 0) {
      throw new AppError("Identity not found", "CONTACT_IDENTITY_NOT_FOUND", "validation", false);
    }

    return { deleted };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to delete contact identity", error);
  }
}

export async function deleteContactIdentitiesForContactService(
  userId: string,
  contactId: string,
  db?: DbClient,
): Promise<number> {
  const executor = db ?? (await getDb());

  try {
    return await ContactIdentitiesRepository.deleteIdentitiesForContact(executor, userId, contactId);
  } catch (error) {
    throw toDatabaseError("Failed to delete contact identities for contact", error);
  }
}

function sanitizeIdentityInput(
  input: CreateContactIdentityInput,
): CreateContactIdentityInput {
  if (!input.contactId) {
    throw new AppError("contactId is required", "VALIDATION_ERROR", "validation", false);
  }

  if (!input.value?.trim()) {
    throw new AppError("Identity value is required", "VALIDATION_ERROR", "validation", false);
  }

  const normalizedValue = normalizeValue(input.kind, input.value);
  const provider =
    input.kind === "provider_id" ? input.provider?.trim() ?? undefined : input.provider ?? null;

  if (input.kind === "provider_id" && !provider) {
    throw new AppError("provider is required for provider_id identities", "VALIDATION_ERROR", "validation", false);
  }

  return {
    contactId: input.contactId,
    kind: input.kind,
    value: normalizedValue,
    provider: provider ?? null,
  };
}

function sanitizeIdentityUpdate(
  input: UpdateContactIdentityInput,
): UpdateContactIdentity {
  const updateData: UpdateContactIdentity = {};

  if (input.kind !== undefined) {
    updateData.kind = input.kind;
  }

  if (input.value !== undefined) {
    if (!input.value.trim()) {
      throw new AppError("Identity value cannot be empty", "VALIDATION_ERROR", "validation", false);
    }

    const kind = input.kind ?? updateData.kind;
    if (!kind) {
      throw new AppError(
        "kind must be provided when updating value",
        "VALIDATION_ERROR",
        "validation",
        false,
      );
    }
    
    // Type guard ensures kind is a valid type
    if (!isValidIdentityKind(kind)) {
      throw new AppError(
        `Invalid identity kind: ${kind}`,
        "VALIDATION_ERROR",
        "validation",
        false,
      );
    }
    
    updateData.value = normalizeValue(kind, input.value);
  }

  if (input.provider !== undefined) {
    updateData.provider = input.provider ?? null;
  }

  return updateData;
}

// Type guard function - validates at runtime AND narrows the type
function isValidIdentityKind(kind: string): kind is CreateContactIdentityInput["kind"] {
  return kind === "email" || kind === "phone" || kind === "handle" || kind === "provider_id";
}

function normalizeValue(kind: CreateContactIdentityInput["kind"], value: string): string {
  switch (kind) {
    case "email":
      return value.trim().toLowerCase();
    case "handle":
      return value.trim().toLowerCase();
    case "phone":
      return value.replace(/\D/g, "");
    case "provider_id":
    default:
      return value.trim();
  }
}
