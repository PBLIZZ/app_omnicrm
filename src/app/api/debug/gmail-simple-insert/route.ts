/** GET/POST /api/debug/gmail-simple-insert — get 1 Gmail email into raw_events using simple insert (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { getGoogleClients } from "@/server/google/client";
import { err, ok } from "@/server/http/responses";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";
import { Pool } from "pg";
import type { gmail_v1 } from "googleapis";

interface GmailMessage {
  id?: string | null;
  labelIds?: string[] | null;
  snippet?: string | null;
  payload?: gmail_v1.Schema$MessagePart | null;
  internalDate?: string | null;
  threadId?: string | null;
}

async function handleRequest(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const results = {
    gmailFetch: { success: false, messageId: null as string | null, error: null as string | null },
    insertion: { success: false, insertedId: null as string | null, error: null as string | null },
    message: null as GmailMessage | null,
  };

  let pool: Pool | null = null;

  try {
    // Step 1: Fetch 1 Gmail message
    log.info({ userId }, "starting_gmail_simple_insert");

    const { gmail } = await getGoogleClients(userId);

    // Get the single most recent message
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 1, // Only 1 message
    });

    const messageIds = listResponse.data.messages?.map(m => m.id).filter(Boolean) ?? [];
    if (messageIds.length === 0) {
      return ok({ success: false, results, error: "No Gmail messages found" });
    }

    const messageId = messageIds[0]!;
    results.gmailFetch.messageId = messageId;

    // Get full message details
    const messageResponse = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "full",
    });

    const msg = messageResponse.data as GmailMessage;
    if (!msg) {
      results.gmailFetch.error = "No message data returned";
      return ok({ success: false, results });
    }

    results.gmailFetch.success = true;
    results.message = msg; // Store the full message for debugging

    // Parse timestamp
    const internalMs = Number(msg.internalDate ?? 0);
    const occurredAt = internalMs ? new Date(internalMs) : new Date();

    // Get email subject for logging
    const headers = msg.payload?.headers ?? [];
    const subject = headers.find(h => h.name?.toLowerCase() === "subject")?.value ?? "No Subject";
    
    log.info({ userId, messageId, subject, occurredAt }, "gmail_message_fetched");

    // Step 2: Insert into raw_events using simple INSERT (we know this works!)
    if (!process.env["DATABASE_URL"]) {
      results.insertion.error = "DATABASE_URL missing";
      return ok({ success: false, results });
    }

    pool = new Pool({
      connectionString: process.env["DATABASE_URL"],
      max: 1,
    });

    const client = await pool.connect();
    
    try {
      log.info({ userId, messageId, strategy: "simple_insert" }, "inserting_gmail_to_raw_events");

      // Use the strategy we know works: simple INSERT
      const insertQuery = `
        INSERT INTO raw_events (user_id, provider, payload, occurred_at, source_id, source_meta)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `;

      const values = [
        userId,                           // user_id
        "gmail",                         // provider
        JSON.stringify(msg),             // payload (the full Gmail message)
        occurredAt,                      // occurred_at
        msg.id ?? null,                  // source_id (Gmail message ID)
        JSON.stringify({                 // source_meta
          fetchedAt: new Date().toISOString(),
          subject,
          simpleInsert: true,
          messageId,
        }),
      ];

      log.info({ userId, messageId, queryValues: values.map((v, i) => 
        i === 2 ? "[Gmail Message JSON]" : v
      ) }, "executing_gmail_insert");

      const insertResult = await client.query(insertQuery, values);

      if (insertResult.rows.length > 0 && insertResult.rows[0]) {
        const row = insertResult.rows[0] as { id?: string };
        results.insertion.success = true;
        results.insertion.insertedId = row.id ?? "unknown";
        
        log.info({ 
          userId, 
          messageId, 
          subject,
          insertedId: results.insertion.insertedId,
          occurredAt 
        }, "gmail_inserted_successfully");
      } else {
        results.insertion.error = "Insert returned no rows";
        log.warn({ userId, messageId }, "gmail_insert_no_rows");
      }

    } finally {
      client.release();
    }

    const success = results.gmailFetch.success && results.insertion.success;
    const message = success 
      ? `Successfully inserted Gmail message "${subject}" into raw_events!`
      : `Failed: Gmail fetch ${results.gmailFetch.success ? "✓" : "✗"}, Insertion ${results.insertion.success ? "✓" : "✗"}`;

    log.info({ 
      userId, 
      messageId,
      subject,
      finalSuccess: success,
      insertedId: results.insertion.insertedId
    }, "gmail_simple_insert_complete");

    return ok({ 
      success, 
      results: {
        ...results,
        message: undefined, // Don't return the full message object (too large)
        messagePreview: {
          id: msg.id,
          subject,
          snippet: msg.snippet,
          labelIds: msg.labelIds,
          occurredAt: occurredAt.toISOString(),
        }
      },
      message 
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "gmail_simple_insert_failed");
    
    return ok({ 
      success: false, 
      results, 
      error: errorMsg 
    });

  } finally {
    if (pool) {
      await pool.end().catch(() => {});
    }
  }
}

export async function GET(): Promise<Response> {
  return handleRequest();
}

export async function POST(): Promise<Response> {
  return handleRequest();
}