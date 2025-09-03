/** POST /api/test/gmail-ingest — simple Gmail ingestion test (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { getGoogleClients } from "@/server/google/client";
import { gmail_v1 } from "googleapis";
import { getDb } from "@/server/db/client";
import { rawEvents } from "@/server/db/schema";
import { err, ok } from "@/lib/api/http";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";

interface GmailMessage {
  id?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  payload?: gmail_v1.Schema$MessagePart | null;
  internalDate?: string | null;
  threadId?: string | null;
}

export async function POST(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  try {
    // Get Gmail client
    const { gmail } = await getGoogleClients(userId);

    log.info({ userId, op: "test_gmail_ingest_start" }, "starting simple Gmail ingest");

    // Get the 10 most recent messages (no filters)
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
    });

    const messageIds = listResponse.data.messages?.map(m => m.id).filter(Boolean) ?? [];
    log.info({ userId, messageCount: messageIds.length }, "fetched message IDs");

    const insertedMessages: Array<{ id: string; success: boolean; error?: string }> = [];

    // Process each message
    for (const messageId of messageIds) {
      if (!messageId) continue;

      try {
        // Get full message
        const messageResponse = await gmail.users.messages.get({
          userId: "me",
          id: messageId,
          format: "full",
        });

        const msg = messageResponse.data as GmailMessage;
        if (!msg) {
          insertedMessages.push({ id: messageId, success: false, error: "no_message_data" });
          continue;
        }

        // Parse timestamp
        const internalMs = Number(msg.internalDate ?? 0);
        const occurredAt = internalMs ? new Date(internalMs) : new Date();

        // Insert directly into raw_events using regular DB client (with RLS)
        const db = await getDb();
        await db.insert(rawEvents).values({
          userId,
          provider: "gmail",
          payload: msg,
          occurredAt,
          contactId: null,
          batchId: null, // No batch ID for this test
          sourceMeta: { 
            fetchedAt: new Date().toISOString(),
            testIngestion: true,
          },
          sourceId: msg.id ?? null,
        });

        insertedMessages.push({ id: messageId, success: true });
        log.info({ userId, messageId }, "successfully inserted message");

      } catch (insertError) {
        const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
        insertedMessages.push({ id: messageId, success: false, error: errorMsg });
        log.warn({ userId, messageId, error: errorMsg }, "failed to insert message");
      }
    }

    const successCount = insertedMessages.filter(m => m.success).length;
    const failureCount = insertedMessages.filter(m => !m.success).length;

    log.info({ 
      userId, 
      totalMessages: messageIds.length, 
      successCount, 
      failureCount 
    }, "Gmail ingest completed");

    return ok({
      totalMessages: messageIds.length,
      successCount,
      failureCount,
      results: insertedMessages,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "Gmail ingest failed");
    return err(500, "Gmail ingest failed");
  }
}