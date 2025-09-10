/** POST /api/test/gmail-ingest — simple Gmail ingestion test (auth required). */
import { createRouteHandler } from "@/server/api/handler";
import { getGoogleClients } from "@/server/google/client";
import { gmail_v1 } from "googleapis";
import { getDb } from "@/server/db/client";
import { rawEvents } from "@/server/db/schema";
import { ApiResponseBuilder } from "@/server/api/response";
import { logger } from "@/lib/observability";

interface GmailMessage {
  id?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  payload?: gmail_v1.Schema$MessagePart | null;
  internalDate?: string | null;
  threadId?: string | null;
}

export const POST = createRouteHandler({
  auth: true,
  rateLimit: { operation: "gmail_ingest_test" },
})(async ({ userId, requestId }) => {
  const api = new ApiResponseBuilder("test.gmail_ingest", requestId);

  try {
    // Get Gmail client
    const { gmail } = await getGoogleClients(userId);

    await logger.info("Starting Gmail ingest test", {
      operation: "test.gmail_ingest",
      additionalData: { userId: userId.slice(0, 8) + "...", messageLimit: 10 },
    });

    // Get the 10 most recent messages (no filters)
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 10,
    });

    const messageIds = listResponse.data.messages?.map((m) => m.id).filter(Boolean) ?? [];
    await logger.info("Fetched Gmail message IDs", {
      operation: "test.gmail_ingest",
      additionalData: { userId: userId.slice(0, 8) + "...", messageCount: messageIds.length },
    });

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
        await logger.info("Successfully inserted message", {
          operation: "test.gmail_ingest",
          additionalData: { userId: userId.slice(0, 8) + "...", messageId },
        });
      } catch (insertError) {
        const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
        insertedMessages.push({ id: messageId, success: false, error: errorMsg });
        await logger.warn(
          "Failed to insert message",
          {
            operation: "test.gmail_ingest",
            additionalData: { userId: userId.slice(0, 8) + "...", messageId, error: errorMsg },
          },
          insertError instanceof Error ? insertError : undefined,
        );
      }
    }

    const successCount = insertedMessages.filter((m) => m.success).length;
    const failureCount = insertedMessages.filter((m) => !m.success).length;

    await logger.info("Gmail ingest completed", {
      operation: "test.gmail_ingest",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        totalMessages: messageIds.length,
        successCount,
        failureCount,
      },
    });

    return api.success({
      totalMessages: messageIds.length,
      successCount,
      failureCount,
      results: insertedMessages,
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    await logger.error(
      "Gmail ingest failed",
      {
        operation: "test.gmail_ingest",
        additionalData: { userId: userId.slice(0, 8) + "...", error: errorMsg },
      },
      error instanceof Error ? error : undefined,
    );
    return api.error(
      "Gmail ingest failed",
      "INTERNAL_ERROR",
      undefined,
      error instanceof Error ? error : undefined,
    );
  }
});
