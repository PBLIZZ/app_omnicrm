import { createRawEventsRepository, type RawEventListParams } from "@repo";
import type { RawEvent, RawEventListItem } from "@repo";
import { getDb, type DbClient } from "@/server/db/client";

import { AppError } from "@/lib/errors/app-error";

function toDatabaseError(message: string, error: unknown): AppError {
  return new AppError(
    message,
    "RAW_EVENTS_DB_ERROR",
    "database",
    false,
    error instanceof Error ? { cause: error } : { cause: String(error) },
  );
}

export async function listRawEventsService(
  userId: string,
  params: RawEventListParams,
): Promise<{ items: RawEventListItem[]; total: number }> {
  try {
    const db = await getDb();
    const repo = createRawEventsRepository(db);
    return await repo.listRawEvents(userId, params);
  } catch (error) {
    throw toDatabaseError("Failed to load raw events", error);
  }
}

export async function getRawEventByIdService(
  userId: string,
  rawEventId: string,
): Promise<RawEvent> {
  try {
    const db = await getDb();
    const repo = createRawEventsRepository(db);
    const rawEvent = await repo.getRawEventById(userId, rawEventId);

    if (!rawEvent) {
      throw new AppError("Raw event not found", "RAW_EVENT_NOT_FOUND", "validation", false);
    }

    return rawEvent;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw toDatabaseError("Failed to load raw event", error);
  }
}

export async function deleteRawEventsForUserService(
  userId: string,
  db?: DbClient,
): Promise<number> {
  const executor = db ?? (await getDb());
  const repo = createRawEventsRepository(executor);

  try {
    return await repo.deleteRawEventsForUser(userId);
  } catch (error) {
    throw toDatabaseError("Failed to delete raw events for user", error);
  }
}
