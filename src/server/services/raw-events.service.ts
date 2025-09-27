// src/server/services/raw-events.service.ts
import type { RawEventListItem, RawEventListParams } from "@repo";
import { listRawEvents } from "@repo";

export async function listRawEventsService(
  userId: string,
  params: RawEventListParams,
): Promise<{ items: RawEventListItem[]; total: number }> {
  return listRawEvents(userId, params);
}
