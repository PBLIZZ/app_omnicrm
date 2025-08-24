// src/server/services/raw-events.service.ts
import type {
  RawEventListItem,
  RawEventListParams,
} from "@/server/repositories/raw-events.repo";
import { listRawEvents } from "@/server/repositories/raw-events.repo";

export async function listRawEventsService(
  userId: string,
  params: RawEventListParams,
): Promise<{ items: RawEventListItem[]; total: number }> {
  return listRawEvents(userId, params);
}
