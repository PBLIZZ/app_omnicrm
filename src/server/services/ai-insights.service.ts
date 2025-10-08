import {
  AiInsightsRepository,
  type AiInsightListParams,
} from "@repo";
import type { AiInsight, CreateAiInsight, UpdateAiInsight } from "@repo";
import { getDb, type DbClient } from "@/server/db/client";

import { AppError } from "@/lib/errors/app-error";

export type ListAiInsightsParams = AiInsightListParams;

function toDatabaseError(message: string, error: unknown): AppError {
  return new AppError(
    message,
    "AI_INSIGHTS_DB_ERROR",
    "database",
    false,
    error instanceof Error ? { cause: error } : { cause: String(error) },
  );
}

export interface CreateAiInsightInput {
  subjectType: string;
  subjectId?: string | null;
  kind: string;
  content: unknown;
  model?: string | null;
  fingerprint?: string | null;
}

export type UpdateAiInsightInput = Partial<CreateAiInsightInput>;

export async function listAiInsightsService(
  userId: string,
  params: ListAiInsightsParams = {},
): Promise<{ items: AiInsight[]; total: number }> {
  try {
    const db = await getDb();
    return await AiInsightsRepository.listAiInsights(db, userId, params);
  } catch (error) {
    throw toDatabaseError("Failed to load AI insights", error);
  }
}

export async function getAiInsightByIdService(
  userId: string,
  aiInsightId: string,
): Promise<AiInsight> {
  try {
    const db = await getDb();
    const insight = await AiInsightsRepository.getAiInsightById(db, userId, aiInsightId);

    if (!insight) {
      throw new AppError("AI insight not found", "AI_INSIGHT_NOT_FOUND", "validation", false);
    }

    return insight;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw new AppError("AI insight not found", "AI_INSIGHT_NOT_FOUND", "validation", false);
  }
}

export async function createAiInsightService(
  userId: string,
  input: CreateAiInsightInput,
): Promise<AiInsight> {
  if (!input.subjectType?.trim() || !input.kind?.trim()) {
    throw new AppError(
      "subjectType and kind are required",
      "VALIDATION_ERROR",
      "validation",
      false,
    );
  }

  const fingerprint = input.fingerprint?.trim() ?? null;
  try {
    const db = await getDb();

    if (fingerprint) {
      const existing = await AiInsightsRepository.findByFingerprint(db, userId, fingerprint);
      if (existing) {
        throw new AppError(
          "AI insight with fingerprint already exists",
          "AI_INSIGHT_DUPLICATE",
          "validation",
          false,
        );
      }
    }

    return await AiInsightsRepository.createAiInsight(db, {
      userId,
      subjectType: input.subjectType.trim(),
      subjectId: input.subjectId ?? null,
      kind: input.kind.trim(),
      content: input.content,
      model: input.model ?? null,
      fingerprint,
    } satisfies CreateAiInsight & { userId: string });
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to create AI insight", error);
  }
}

export async function updateAiInsightService(
  userId: string,
  aiInsightId: string,
  input: UpdateAiInsightInput,
): Promise<AiInsight> {
  if (Object.keys(input).length === 0) {
    throw new AppError("No fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  const updatePayload: UpdateAiInsight = {};

  if (input.subjectType !== undefined) {
    updatePayload.subjectType = input.subjectType?.trim() ?? null;
  }

  if (input.subjectId !== undefined) {
    updatePayload.subjectId = input.subjectId ?? null;
  }

  if (input.kind !== undefined) {
    updatePayload.kind = input.kind?.trim() ?? null;
  }

  if (input.content !== undefined) {
    updatePayload.content = input.content;
  }

  if (input.model !== undefined) {
    updatePayload.model = input.model ?? null;
  }

  if (input.fingerprint !== undefined) {
    updatePayload.fingerprint = input.fingerprint?.trim() ?? null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError("No valid fields provided for update", "VALIDATION_ERROR", "validation", false);
  }

  try {
    const db = await getDb();
    const updated = await AiInsightsRepository.updateAiInsight(
      db,
      userId,
      aiInsightId,
      updatePayload,
    );

    if (!updated) {
      throw new AppError("AI insight not found", "AI_INSIGHT_NOT_FOUND", "validation", false);
    }

    return updated;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to update AI insight", error);
  }
}

export async function deleteAiInsightService(
  userId: string,
  aiInsightId: string,
  db?: DbClient,
): Promise<{ deleted: number }> {
  const executor = db ?? (await getDb());

  try {
    const deleted = await AiInsightsRepository.deleteAiInsight(executor, userId, aiInsightId);

    if (deleted === 0) {
      throw new AppError("AI insight not found", "AI_INSIGHT_NOT_FOUND", "validation", false);
    }

    return { deleted };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to delete AI insight", error);
  }
}

export async function deleteAiInsightsForUserService(
  userId: string,
  db?: DbClient,
): Promise<number> {
  const executor = db ?? (await getDb());

  try {
    return await AiInsightsRepository.deleteAiInsightsForUser(executor, userId);
  } catch (error) {
    throw toDatabaseError("Failed to delete AI insights for user", error);
  }
}

export async function findAiInsightsBySubjectIdsService(
  userId: string,
  subjectIds: string[],
  options: { subjectType?: string; kind?: string } = {},
): Promise<AiInsight[]> {
  try {
    const db = await getDb();
    return await AiInsightsRepository.findBySubjectIds(db, userId, subjectIds, options);
  } catch (error) {
    throw toDatabaseError("Failed to fetch AI insights by subject", error);
  }
}
