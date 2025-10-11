// src/server/services/raw-events.service.ts
import type { RawEventListItem, RawEventListParams } from "@repo";
import { RawEventsRepository } from "@repo";
import { Result, ok, err, isErr } from "@/lib/utils/result";

export async function listRawEventsService(
  userId: string,
  params: RawEventListParams,
): Promise<Result<{ items: RawEventListItem[]; total: number }, string>> {
  try {
    const result = await RawEventsRepository.listRawEvents(userId, params);

    if (isErr(result)) {
      return err(typeof result.error === 'string' ? result.error : result.error.message ?? 'Failed to list raw events');
    }

    return ok(result.data);
  } catch (error) {
    return err(error instanceof Error ? error.message : "Failed to list raw events");
  }
}
