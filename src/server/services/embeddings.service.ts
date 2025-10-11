import {
  createEmbeddingsRepository,
  type EmbeddingListParams,
} from "@repo";
import type { CreateEmbedding, Embedding, UpdateEmbedding } from "@repo";
import { getDb, type DbClient } from "@/server/db/client";

import { AppError } from "@/lib/errors/app-error";

export type ListEmbeddingsParams = EmbeddingListParams;

function toDatabaseError(message: string, error: unknown): AppError {
  return new AppError(
    message,
    "EMBEDDINGS_DB_ERROR",
    "database",
    false,
    error instanceof Error ? { cause: error } : { cause: String(error) },
  );
}

export interface CreateEmbeddingInput {
  ownerType: string;
  ownerId: string;
  embedding?: string | null;
  embeddingV?: string | null;
  contentHash?: string | null;
  chunkIndex?: number | null;
  meta?: unknown;
}

export type UpdateEmbeddingInput = Partial<CreateEmbeddingInput>;

export async function listEmbeddingsService(
  userId: string,
  params: ListEmbeddingsParams = {},
): Promise<{ items: Embedding[]; total: number }> {
  try {
    const db = await getDb();
    const repo = createEmbeddingsRepository(db);
    return await repo.listEmbeddings(userId, params);
  } catch (error) {
    throw toDatabaseError("Failed to load embeddings", error);
  }
}

export async function listEmbeddingsForOwnerService(
  userId: string,
  ownerType: string,
  ownerId: string,
): Promise<Embedding[]> {
  try {
    const db = await getDb();
    const repo = createEmbeddingsRepository(db);
    return await repo.listEmbeddingsForOwner(userId, ownerType, ownerId);
  } catch (error) {
    throw toDatabaseError("Failed to load embeddings for owner", error);
  }
}

export async function createEmbeddingService(
  userId: string,
  input: CreateEmbeddingInput,
): Promise<Embedding> {
  validateCreateEmbedding(input);

  try {
    const db = await getDb();
    const repo = createEmbeddingsRepository(db);
    return await repo.createEmbedding({
      userId,
      ownerType: input.ownerType,
      ownerId: input.ownerId,
      embedding: input.embedding ?? null,
      embeddingV: input.embeddingV ?? null,
      contentHash: input.contentHash ?? null,
      chunkIndex: input.chunkIndex ?? null,
      meta: input.meta ?? null,
    } satisfies CreateEmbedding & { userId: string });
  } catch (error) {
    throw toDatabaseError("Failed to create embedding", error);
  }
}

export async function createEmbeddingsBulkService(
  userId: string,
  items: CreateEmbeddingInput[],
): Promise<Embedding[]> {
  const payload = items.map((item) => {
    validateCreateEmbedding(item);
    return {
      userId,
      ownerType: item.ownerType,
      ownerId: item.ownerId,
      embedding: item.embedding ?? null,
      embeddingV: item.embeddingV ?? null,
      contentHash: item.contentHash ?? null,
      chunkIndex: item.chunkIndex ?? null,
      meta: item.meta ?? null,
    } satisfies CreateEmbedding & { userId: string };
  });

  try {
    const db = await getDb();
    const repo = createEmbeddingsRepository(db);
    return await repo.createEmbeddingsBulk(payload);
  } catch (error) {
    throw toDatabaseError("Failed to create embeddings", error);
  }
}

export async function updateEmbeddingService(
  userId: string,
  embeddingId: string,
  input: UpdateEmbeddingInput,
): Promise<Embedding> {
  if (Object.keys(input).length === 0) {
    throw new AppError("No fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  const updatePayload: UpdateEmbedding = {};

  if (input.ownerType !== undefined) {
    updatePayload.ownerType = input.ownerType;
  }

  if (input.ownerId !== undefined) {
    updatePayload.ownerId = input.ownerId;
  }

  if (input.embedding !== undefined) {
    updatePayload.embedding = input.embedding ?? null;
  }

  if (input.embeddingV !== undefined) {
    updatePayload.embeddingV = input.embeddingV ?? null;
  }

  if (input.contentHash !== undefined) {
    updatePayload.contentHash = input.contentHash ?? null;
  }

  if (input.chunkIndex !== undefined) {
    updatePayload.chunkIndex = input.chunkIndex ?? null;
  }

  if (input.meta !== undefined) {
    updatePayload.meta = input.meta ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError("No valid fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  try {
    const db = await getDb();
    const repo = createEmbeddingsRepository(db);
    const updated = await repo.updateEmbedding(userId, embeddingId, updatePayload);

    if (!updated) {
      throw new AppError("Embedding not found", "EMBEDDING_NOT_FOUND", "validation", false);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to update embedding", error);
  }
}

export async function deleteEmbeddingsForOwnerService(
  userId: string,
  ownerType: string,
  ownerId: string,
  db?: DbClient,
): Promise<{ deleted: number }> {
  const executor = db ?? (await getDb());
  const repo = createEmbeddingsRepository(executor);

  try {
    const deleted = await repo.deleteEmbeddingsForOwner(
      userId,
      ownerType,
      ownerId,
    );

    return { deleted };
  } catch (error) {
    throw toDatabaseError("Failed to delete embeddings for owner", error);
  }
}

export async function deleteEmbeddingService(
  userId: string,
  embeddingId: string,
  db?: DbClient,
): Promise<{ deleted: number }> {
  const executor = db ?? (await getDb());
  const repo = createEmbeddingsRepository(executor);

  try {
    const deleted = await repo.deleteEmbeddingById(userId, embeddingId);

    if (deleted === 0) {
      throw new AppError("Embedding not found", "EMBEDDING_NOT_FOUND", "validation", false);
    }

    return { deleted };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to delete embedding", error);
  }
}

export async function deleteEmbeddingsForUserService(
  userId: string,
  db?: DbClient,
): Promise<number> {
  const executor = db ?? (await getDb());
  const repo = createEmbeddingsRepository(executor);

  try {
    return await repo.deleteEmbeddingsForUser(userId);
  } catch (error) {
    throw toDatabaseError("Failed to delete embeddings for user", error);
  }
}

function validateCreateEmbedding(input: CreateEmbeddingInput): void {
  if (!input.ownerType?.trim()) {
    throw new AppError("ownerType is required", "VALIDATION_ERROR", "validation", false);
  }

  if (!input.ownerId?.trim()) {
    throw new AppError("ownerId is required", "VALIDATION_ERROR", "validation", false);
  }

  if (!input.embedding && !input.embeddingV) {
    throw new AppError(
      "embedding or embeddingV must be provided",
      "VALIDATION_ERROR",
      "validation",
      false,
    );
  }
}
