/** POST /api/debug/raw-sql-insert — test raw SQL insertion bypassing Supabase client (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { err, ok } from "@/server/http/responses";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";
import { Pool } from "pg";

async function handleRequest(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const diagnostics = {
    hasConnectionString: Boolean(process.env["DATABASE_URL"]),
    connectionTest: false,
    insertTest: false,
    error: null as string | null,
    insertedId: null as string | null,
  };

  let pool: Pool | null = null;

  try {
    // Check if we have database URL
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) {
      return ok({ 
        success: false, 
        diagnostics, 
        error: "DATABASE_URL environment variable missing" 
      });
    }

    diagnostics.hasConnectionString = true;

    // Create PostgreSQL pool with service role credentials
    pool = new Pool({
      connectionString: databaseUrl,
      max: 1, // Only need 1 connection for this test
    });

    // Test connection
    const client = await pool.connect();
    diagnostics.connectionTest = true;
    
    log.info({ userId }, "raw_sql_connection_established");

    try {
      // Test SQL insert with conflict handling
      const insertQuery = `
        INSERT INTO raw_events (
          user_id, 
          provider, 
          payload, 
          occurred_at, 
          contact_id, 
          batch_id, 
          source_meta, 
          source_id
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        ) 
        ON CONFLICT (user_id, provider, source_id) DO NOTHING
        RETURNING id
      `;

      const testPayload = {
        test: true,
        timestamp: new Date().toISOString(),
        method: "raw_sql",
      };

      const values = [
        userId,                           // user_id
        "test_sql",                      // provider  
        JSON.stringify(testPayload),     // payload (jsonb)
        new Date(),                      // occurred_at
        null,                            // contact_id
        null,                            // batch_id
        JSON.stringify({ diagnostic: true }), // source_meta
        `test_sql_${Date.now()}`,        // source_id
      ];

      log.info({ userId, query: insertQuery, values }, "executing_raw_sql_insert");

      const result = await client.query(insertQuery, values);
      
      if (result.rows.length > 0 && result.rows[0]) {
        const row = result.rows[0] as { id?: string };
        diagnostics.insertedId = row.id ?? "unknown";
        diagnostics.insertTest = true;
        
        log.info({ 
          userId, 
          insertedId: diagnostics.insertedId,
          rowsAffected: result.rowCount 
        }, "raw_sql_insert_success");
      } else {
        // Insert was skipped due to conflict, but query succeeded
        diagnostics.insertTest = true;
        log.info({ userId }, "raw_sql_insert_skipped_conflict");
      }

    } finally {
      client.release();
    }

    return ok({ 
      success: diagnostics.insertTest, 
      diagnostics,
      message: diagnostics.insertTest ? "Raw SQL insert successful" : "Raw SQL insert failed"
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    diagnostics.error = errorMsg;
    
    log.error({ 
      userId, 
      error: errorMsg,
      stack: error instanceof Error ? error.stack : undefined
    }, "raw_sql_insert_failed");

    return ok({ 
      success: false, 
      diagnostics, 
      error: errorMsg 
    });

  } finally {
    // Always close the pool
    if (pool) {
      await pool.end().catch(poolError => {
        log.warn({ poolError: String(poolError) }, "failed_to_close_pool");
      });
    }
  }
}

export async function GET(): Promise<Response> {
  return handleRequest();
}

export async function POST(): Promise<Response> {
  return handleRequest();
}