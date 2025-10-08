import {
  IgnoredIdentifiersRepository,
  type IgnoredIdentifierListParams,
} from "@repo";
import type {
  CreateIgnoredIdentifier,
  IgnoredIdentifier,
  UpdateIgnoredIdentifier,
} from "@repo";

import { AppError } from "@/lib/errors/app-error";
import { getDb, type DbClient } from "@/server/db/client";

export type ListIgnoredIdentifiersParams = IgnoredIdentifierListParams;

export interface CreateIgnoredIdentifierInput {
  kind: "email" | "phone" | "handle" | "provider_id";
  value: string;
  reason?: string | null;
}

export type UpdateIgnoredIdentifierInput = Partial<Pick<CreateIgnoredIdentifierInput, "reason">>;

function toDatabaseError(message: string, error: unknown): AppError {
  return new AppError(
    message,
    "IGNORED_IDENTIFIERS_DB_ERROR",
    "database",
    false,
    error instanceof Error ? { cause: error } : { cause: String(error) },
  );
}

export async function listIgnoredIdentifiersService(
  userId: string,
  params: ListIgnoredIdentifiersParams = {},
): Promise<{ items: IgnoredIdentifier[]; total: number }> {
  try {
    const db = await getDb();
    return await IgnoredIdentifiersRepository.listIgnoredIdentifiers(db, userId, params);
  } catch (error) {
    throw toDatabaseError("Failed to load ignored identifiers", error);
  }
}

export async function createIgnoredIdentifierService(
  userId: string,
  input: CreateIgnoredIdentifierInput,
): Promise<IgnoredIdentifier> {
  if (!input.value?.trim()) {
    throw new AppError("Identifier value is required", "VALIDATION_ERROR", "validation", false);
  }

  const normalizedValue = normalizeValue(input.kind, input.value);

  try {
    const db = await getDb();
    const isDuplicate = await IgnoredIdentifiersRepository.isIgnored(
      db,
      userId,
      input.kind,
      normalizedValue,
    );

    if (isDuplicate) {
      throw new AppError(
        "Identifier is already ignored",
        "IGNORED_IDENTIFIER_EXISTS",
        "validation",
        false,
      );
    }

    return await IgnoredIdentifiersRepository.createIgnoredIdentifier(db, {
      userId,
      kind: input.kind,
      value: normalizedValue,
      reason: input.reason?.trim() ?? null,
    } satisfies CreateIgnoredIdentifier & { userId: string });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to create ignored identifier", error);
  }
}

export async function updateIgnoredIdentifierService(
  userId: string,
  identifierId: string,
  input: UpdateIgnoredIdentifierInput,
): Promise<IgnoredIdentifier> {
  if (Object.keys(input).length === 0) {
   throw new AppError("No fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  try {
    const db = await getDb();
    const updated = await IgnoredIdentifiersRepository.updateIgnoredIdentifier(
      db,
      userId,
      identifierId,
      {
        reason: input.reason?.trim() ?? null,
      } satisfies UpdateIgnoredIdentifier,
    );

    if (!updated) {
      throw new AppError("Ignored identifier not found", "IGNORED_IDENTIFIER_NOT_FOUND", "validation", false);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to update ignored identifier", error);
  }
}

export async function deleteIgnoredIdentifierService(
  userId: string,
  identifierId: string,
  db?: DbClient,
): Promise<{ deleted: number }> {
  const executor = db ?? (await getDb());

  try {
    const deleted = await IgnoredIdentifiersRepository.deleteIgnoredIdentifier(
      executor,
      userId,
      identifierId,
    );

    if (deleted === 0) {
      throw new AppError("Ignored identifier not found", "IGNORED_IDENTIFIER_NOT_FOUND", "validation", false);
    }

    return { deleted };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to delete ignored identifier", error);
  }
}

export async function deleteIgnoredIdentifiersForUserService(
  userId: string,
  db?: DbClient,
): Promise<number> {
  const executor = db ?? (await getDb());

  try {
    return await IgnoredIdentifiersRepository.deleteIgnoredIdentifiersForUser(executor, userId);
  } catch (error) {
    throw toDatabaseError("Failed to delete ignored identifiers for user", error);
  }
}

function normalizeValue(
  kind: CreateIgnoredIdentifierInput["kind"],
  value: string,
): string {
  switch (kind) {
    case "email":
    case "handle":
      return value.trim().toLowerCase();
    case "phone":
      return value.replace(/\D/g, "");
    case "provider_id":
    default:
      return value.trim();
  }
}
