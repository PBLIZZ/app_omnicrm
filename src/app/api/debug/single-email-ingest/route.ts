/** POST /api/debug/single-email-ingest — minimal Gmail ingestion with multiple strategies (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { getGoogleClients } from "@/server/google/client";
import { supaAdminGuard } from "@/server/db/supabase-admin";
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

interface InsertStrategy {
  name: string;
  success: boolean;
  error?: string;
  insertedId?: string | undefined;
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
    strategies: [] as InsertStrategy[],
    finalSuccess: false,
    workingStrategy: null as string | null,
  };

  try {
    // Step 1: Fetch exactly 1 Gmail message
    log.info({ userId }, "starting_minimal_gmail_ingest");

    const { gmail } = await getGoogleClients(userId);

    // Get the single most recent message
    const listResponse = await gmail.users.messages.list({
      userId: "me",
      maxResults: 1, // Only get 1 message
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

    // Parse timestamp
    const internalMs = Number(msg.internalDate ?? 0);
    const occurredAt = internalMs ? new Date(internalMs) : new Date();

    // Create the raw_events payload
    const rawEventData = {
      userId,
      provider: "gmail",
      payload: msg,
      occurredAt,
      contactId: null,
      batchId: null,
      sourceMeta: { 
        fetchedAt: new Date().toISOString(),
        singleEmailIngest: true,
        strategy: "unknown", // Will be updated by successful strategy
      },
      sourceId: msg.id ?? null,
    };

    log.info({ userId, messageId, occurredAt }, "gmail_message_fetched");

    // Step 2: Try multiple insertion strategies

    // Strategy 1: Service Role (supaAdminGuard)
    try {
      log.info({ userId, strategy: "service_role" }, "attempting_service_role_insert");
      
      const adminResult = await supaAdminGuard.insert("raw_events", {
        ...rawEventData,
        sourceMeta: { ...rawEventData.sourceMeta, strategy: "service_role" },
      });

      results.strategies.push({ 
        name: "service_role", 
        success: true,
        insertedId: Array.isArray(adminResult) && adminResult.length > 0 ? adminResult[0]?.id : "unknown"
      });
      
      results.finalSuccess = true;
      results.workingStrategy = "service_role";
      
      log.info({ userId, messageId }, "service_role_insert_success");

    } catch (adminError) {
      const adminErrorMsg = adminError instanceof Error ? adminError.message : String(adminError);
      results.strategies.push({ 
        name: "service_role", 
        success: false, 
        error: adminErrorMsg 
      });
      
      log.warn({ userId, error: adminErrorMsg }, "service_role_insert_failed");

      // Strategy 2: Raw SQL
      if (!results.finalSuccess && process.env["DATABASE_URL"]) {
        let pool: Pool | null = null;
        try {
          log.info({ userId, strategy: "raw_sql" }, "attempting_raw_sql_insert");
          
          pool = new Pool({
            connectionString: process.env["DATABASE_URL"],
            max: 1,
          });

          const client = await pool.connect();
          
          try {
            const insertQuery = `
              INSERT INTO raw_events (
                user_id, provider, payload, occurred_at, 
                contact_id, batch_id, source_meta, source_id
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
              ON CONFLICT (user_id, provider, source_id) DO NOTHING
              RETURNING id
            `;

            const values = [
              userId,
              "gmail",
              JSON.stringify(msg),
              occurredAt,
              null,
              null,
              JSON.stringify({ ...rawEventData.sourceMeta, strategy: "raw_sql" }),
              msg.id ?? null,
            ];

            const sqlResult = await client.query(insertQuery, values);
            
            if (sqlResult.rows.length > 0 && sqlResult.rows[0]) {
              const row = sqlResult.rows[0] as { id?: string };
              const insertedId = row.id ?? "unknown";
              
              results.strategies.push({ 
                name: "raw_sql", 
                success: true,
                insertedId
              });
              results.finalSuccess = true;
              results.workingStrategy = "raw_sql";
              
              log.info({ userId, messageId, insertedId }, "raw_sql_insert_success");
            } else {
              results.strategies.push({ 
                name: "raw_sql", 
                success: false, 
                error: "Insert returned no rows (likely conflict)" 
              });
              log.info({ userId, messageId }, "raw_sql_insert_conflict");
            }

          } finally {
            client.release();
          }

        } catch (sqlError) {
          const sqlErrorMsg = sqlError instanceof Error ? sqlError.message : String(sqlError);
          results.strategies.push({ 
            name: "raw_sql", 
            success: false, 
            error: sqlErrorMsg 
          });
          
          log.warn({ userId, error: sqlErrorMsg }, "raw_sql_insert_failed");

        } finally {
          if (pool) {
            await pool.end().catch(() => {});
          }
        }
      }
    }

    const successMessage = results.finalSuccess 
      ? `Successfully ingested Gmail message using ${results.workingStrategy} strategy`
      : "All insertion strategies failed";

    log.info({ 
      userId, 
      messageId, 
      finalSuccess: results.finalSuccess,
      workingStrategy: results.workingStrategy,
      strategiesAttempted: results.strategies.length
    }, "gmail_ingest_complete");

    return ok({ 
      success: results.finalSuccess, 
      results,
      message: successMessage,
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.gmailFetch.error = errorMsg;
    
    log.error({ userId, error: errorMsg }, "gmail_ingest_failed");
    
    return ok({ 
      success: false, 
      results, 
      error: errorMsg 
    });
  }
}

export async function GET(): Promise<Response> {
  return handleRequest();
}

export async function POST(): Promise<Response> {
  return handleRequest();
}