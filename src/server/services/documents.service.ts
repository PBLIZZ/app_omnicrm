import { createDocumentsRepository } from "@repo";
import type { DocumentListParams as RepoDocumentListParams } from "@repo";
import type {
  CreateIntelligenceDocument,
  IntelligenceDocument,
  UpdateIntelligenceDocument,
} from "@repo";
import { getDb, type DbClient } from "@/server/db/client";

import { AppError } from "@/lib/errors/app-error";

type ListDocumentsParams = RepoDocumentListParams;

function toDatabaseError(message: string, error: unknown): AppError {
  return new AppError(
    message,
    "DOCUMENTS_DB_ERROR",
    "database",
    false,
    error instanceof Error ? { cause: error } : { cause: String(error) },
  );
}

export interface CreateDocumentInput {
  ownerContactId?: string | null;
  title?: string | null;
  text?: string | null;
  mime?: string | null;
  meta?: unknown;
}

export type UpdateDocumentInput = Partial<CreateDocumentInput>;

export async function listDocumentsService(
  userId: string,
  params: ListDocumentsParams = {},
): Promise<{ items: IntelligenceDocument[]; total: number }> {
  try {
    const db = await getDb();
    const repo = createDocumentsRepository(db);
    return await repo.listDocuments(userId, params);
  } catch (error) {
    throw toDatabaseError("Failed to load documents", error);
  }
}

export async function getDocumentByIdService(
  userId: string,
  documentId: string,
): Promise<IntelligenceDocument> {
  try {
    const db = await getDb();
    const repo = createDocumentsRepository(db);
    const document = await repo.getDocumentById(userId, documentId);

    if (!document) {
      throw new AppError("Document not found", "DOCUMENT_NOT_FOUND", "validation", false);
    }

    return document;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to load document", error);
  }
}

export async function createDocumentService(
  userId: string,
  input: CreateDocumentInput,
): Promise<IntelligenceDocument> {
  if (!input.title?.trim() && !input.text?.trim()) {
    throw new AppError(
      "title or text is required to create a document",
      "VALIDATION_ERROR",
      "validation",
      false,
    );
  }

  try {
    const db = await getDb();
    const repo = createDocumentsRepository(db);
    return await repo.createDocument({
      userId,
      ownerContactId: input.ownerContactId ?? null,
      title: input.title?.trim() ?? null,
      text: input.text?.trim() ?? null,
      mime: input.mime ?? null,
      meta: input.meta ?? null,
    } satisfies CreateIntelligenceDocument & { userId: string });
  } catch (error) {
    throw toDatabaseError("Failed to create document", error);
  }
}

export async function updateDocumentService(
  userId: string,
  documentId: string,
  input: UpdateDocumentInput,
): Promise<IntelligenceDocument> {
  if (Object.keys(input).length === 0) {
    throw new AppError("No fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  const updatePayload: UpdateIntelligenceDocument = {};

  if (input.ownerContactId !== undefined) {
    updatePayload.ownerContactId = input.ownerContactId ?? null;
  }

  if (input.title !== undefined) {
    updatePayload.title = input.title?.trim() ?? null;
  }

  if (input.text !== undefined) {
    updatePayload.text = input.text?.trim() ?? null;
  }

  if (input.mime !== undefined) {
    updatePayload.mime = input.mime ?? null;
  }

  if (input.meta !== undefined) {
    updatePayload.meta = input.meta ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError("No valid fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  try {
    const db = await getDb();
    const repo = createDocumentsRepository(db);
    const updated = await repo.updateDocument(userId, documentId, updatePayload);

    if (!updated) {
      throw new AppError("Document not found", "DOCUMENT_NOT_FOUND", "validation", false);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to update document", error);
  }
}

export async function deleteDocumentService(
  userId: string,
  documentId: string,
  db?: DbClient,
): Promise<{ deleted: number }> {
  const executor = db ?? (await getDb());
  const repo = createDocumentsRepository(executor);

  try {
    const deleted = await repo.deleteDocument(userId, documentId);

    if (deleted === 0) {
      throw new AppError("Document not found", "DOCUMENT_NOT_FOUND", "validation", false);
    }

    return { deleted };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to delete document", error);
  }
}

export async function deleteDocumentsForUserService(
  userId: string,
  db?: DbClient,
): Promise<number> {
  const executor = db ?? (await getDb());
  const repo = createDocumentsRepository(executor);

  try {
    return await repo.deleteDocumentsForUser(userId);
  } catch (error) {
    throw toDatabaseError("Failed to delete documents for user", error);
  }
}
