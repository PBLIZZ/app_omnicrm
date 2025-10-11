import { gmail_v1 } from "googleapis";
import { getGoogleClients } from "@/server/google/client";
import { RawEventsRepository } from "@repo";
import type {
  GmailIngestionResultDTO,
  CreateRawEventDTO,
} from "@/server/db/business-schemas/business-schema";
import { logger } from "@/lib/observability";

interface GmailMessage {
  id?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  payload?: gmail_v1.Schema$MessagePart | null;
  internalDate?: string | null;
  threadId?: string | null;
}

interface MessageIngestionResult {
  id: string;
  success: boolean;
  error?: string;
}

export class GmailIngestionService {
  /**
   * Test Gmail ingestion - fetches the 10 most recent messages
   */
  static async testGmailIngestion(userId: string): Promise<GmailIngestionResultDTO> {
    await logger.info("Starting Gmail ingest test", {
      operation: "gmail_ingestion_service.test",
      additionalData: { userId: userId.slice(0, 8) + "...", messageLimit: 10 },
    });

    try {
      // Get Gmail client
      const { gmail } = await getGoogleClients(userId);

      // Get the 10 most recent messages (no filters)
      const listResponse = await gmail.users.messages.list({
        userId: "me",
        maxResults: 10,
      });

      const messageIds = listResponse.data.messages?.map((m) => m.id).filter(Boolean) ?? [];
      await logger.info("Fetched Gmail message IDs", {
        operation: "gmail_ingestion_service.test",
        additionalData: { userId: userId.slice(0, 8) + "...", messageCount: messageIds.length },
      });

      const insertedMessages: MessageIngestionResult[] = [];

      // Process each message
      for (const messageId of messageIds) {
        if (!messageId) continue;

        try {
          const result = await this.ingestSingleMessage(userId, gmail, messageId);
          insertedMessages.push(result);

          if (result.success) {
            await logger.info("Successfully inserted message", {
              operation: "gmail_ingestion_service.test",
              additionalData: { userId: userId.slice(0, 8) + "...", messageId },
            });
          }
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          insertedMessages.push({ id: messageId, success: false, error: errorMsg });

          await logger.warn(
            "Failed to insert message",
            {
              operation: "gmail_ingestion_service.test",
              additionalData: { userId: userId.slice(0, 8) + "...", messageId, error: errorMsg },
            },
            error instanceof Error ? error : undefined,
          );
        }
      }

      const successCount = insertedMessages.filter((m) => m.success).length;
      const failureCount = insertedMessages.filter((m) => !m.success).length;

      await logger.info("Gmail ingest completed", {
        operation: "gmail_ingestion_service.test",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          totalMessages: messageIds.length,
          successCount,
          failureCount,
        },
      });

      return {
        totalMessages: messageIds.length,
        successCount,
        failureCount,
        results: insertedMessages,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error(
        "Gmail ingest failed",
        {
          operation: "gmail_ingestion_service.test",
          additionalData: { userId: userId.slice(0, 8) + "...", error: errorMsg },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  /**
   * Ingest a single Gmail message
   */
  private static async ingestSingleMessage(
    userId: string,
    gmail: gmail_v1.Gmail,
    messageId: string,
  ): Promise<MessageIngestionResult> {
    try {
      // Get full message
      const messageResponse = await gmail.users.messages.get({
        userId: "me",
        id: messageId,
        format: "full",
      });

      const msg = messageResponse.data as GmailMessage;
      if (!msg) {
        return { id: messageId, success: false, error: "no_message_data" };
      }

      // Parse timestamp
      const internalMs = Number(msg.internalDate ?? 0);
      const occurredAt = internalMs ? new Date(internalMs) : new Date();

      // Create raw event data
      const rawEventData: CreateRawEventDTO = {
        provider: "gmail",
        payload: msg as Record<string, unknown>,
        occurredAt,
        contactId: undefined, // No contact association for test ingestion
        batchId: undefined, // No batch ID for test ingestion
        sourceMeta: {
          fetchedAt: new Date().toISOString(),
          testIngestion: true,
        },
        sourceId: msg.id ?? undefined,
      };

      // Insert into raw_events using repository
      await RawEventsRepository.createRawEvent({
        ...rawEventData,
        userId,
      });

      return { id: messageId, success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { id: messageId, success: false, error: errorMsg };
    }
  }

  /**
   * Bulk Gmail ingestion for production use
   */
  static async bulkGmailIngestion(
    userId: string,
    options: {
      maxResults?: number;
      query?: string;
      batchId?: string;
    } = {},
  ): Promise<GmailIngestionResultDTO> {
    const { maxResults = 100, query, batchId } = options;

    await logger.info("Starting bulk Gmail ingestion", {
      operation: "gmail_ingestion_service.bulk",
      additionalData: {
        userId: userId.slice(0, 8) + "...",
        maxResults,
        query,
        batchId,
      },
    });

    try {
      const { gmail } = await getGoogleClients(userId);

      // Get messages with optional query
      const listParams: { userId: string; maxResults: number; q?: string } = {
        userId: "me",
        maxResults,
      };
      if (query) {
        listParams.q = query;
      }
      const listResponse = await gmail.users.messages.list(listParams);

      const messageIds = listResponse.data.messages?.map((m) => m.id).filter(Boolean) ?? [];
      const insertedMessages: MessageIngestionResult[] = [];
      const rawEvents: CreateRawEventDTO[] = [];

      // Process messages in batches for better performance
      for (const messageId of messageIds) {
        if (!messageId) continue;

        try {
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

          // Check if we already have this message
          const existingEvent = await RawEventsRepository.findRawEventBySourceId(
            userId,
            "gmail",
            msg.id ?? messageId,
          );

          if (existingEvent) {
            insertedMessages.push({ id: messageId, success: true, error: "already_exists" });
            continue;
          }

          const internalMs = Number(msg.internalDate ?? 0);
          const occurredAt = internalMs ? new Date(internalMs) : new Date();

          rawEvents.push({
            provider: "gmail",
            payload: msg as Record<string, unknown>,
            occurredAt,
            batchId,
            sourceMeta: {
              fetchedAt: new Date().toISOString(),
              bulkIngestion: true,
            },
            sourceId: msg.id ?? messageId,
          });

          insertedMessages.push({ id: messageId, success: true });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          insertedMessages.push({ id: messageId, success: false, error: errorMsg });
        }
      }

      // Bulk insert raw events
      if (rawEvents.length > 0) {
        const eventsWithUserId = rawEvents.map((event) => ({ ...event, userId }));
        await RawEventsRepository.createBulkRawEvents(eventsWithUserId);
      }

      const successCount = insertedMessages.filter((m) => m.success).length;
      const failureCount = insertedMessages.filter((m) => !m.success).length;

      await logger.info("Bulk Gmail ingestion completed", {
        operation: "gmail_ingestion_service.bulk",
        additionalData: {
          userId: userId.slice(0, 8) + "...",
          totalMessages: messageIds.length,
          successCount,
          failureCount,
          batchId,
        },
      });

      return {
        totalMessages: messageIds.length,
        successCount,
        failureCount,
        results: insertedMessages,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      await logger.error(
        "Bulk Gmail ingestion failed",
        {
          operation: "gmail_ingestion_service.bulk",
          additionalData: { userId: userId.slice(0, 8) + "...", error: errorMsg },
        },
        error instanceof Error ? error : undefined,
      );
      throw error;
    }
  }

  /**
   * Get ingestion statistics for a user
   */
  static async getIngestionStats(
    userId: string,
    provider: string = "gmail",
  ): Promise<{
    totalEvents: number;
    recentEvents: number;
    lastIngestionAt: Date | null;
  }> {
    const totalEvents = await RawEventsRepository.countRawEvents(userId, {
      provider: [provider],
    });

    // Count events from last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentEvents = await RawEventsRepository.countRawEvents(userId, {
      provider: [provider],
      occurredAfter: yesterday,
    });

    // Get most recent event to determine last ingestion
    const recentEventsList = await RawEventsRepository.listRawEvents(
      userId,
      { provider: [provider] },
      1,
    );

    const lastIngestionAt =
      recentEventsList.length > 0 ? (recentEventsList[0]?.createdAt ?? null) : null;

    return {
      totalEvents,
      recentEvents,
      lastIngestionAt,
    };
  }
}
