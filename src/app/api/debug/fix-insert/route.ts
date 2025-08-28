/** GET/POST /api/debug/fix-insert — fixed insertion without constraint issues (auth required). */
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

  const results = {
    strategy1_simple_insert: { success: false, error: null as string | null, insertedId: null as string | null },
    strategy2_upsert_by_constraint_name: { success: false, error: null as string | null, insertedId: null as string | null },
    strategy3_check_then_insert: { success: false, error: null as string | null, insertedId: null as string | null },
  };

  let pool: Pool | null = null;

  try {
    if (!process.env["DATABASE_URL"]) {
      return ok({ success: false, error: "DATABASE_URL missing", results });
    }

    pool = new Pool({
      connectionString: process.env["DATABASE_URL"],
      max: 1,
    });

    const client = await pool.connect();

    try {
      const testData = {
        userId,
        provider: "test_fix",
        payload: JSON.stringify({ test: true, timestamp: new Date().toISOString(), fix_attempt: true }),
        occurredAt: new Date(),
        sourceId: `fix_test_${Date.now()}`,
      };

      // Strategy 1: Simple INSERT without ON CONFLICT
      try {
        log.info({ userId, strategy: "simple_insert" }, "attempting_simple_insert");
        
        const simpleQuery = `
          INSERT INTO raw_events (user_id, provider, payload, occurred_at, source_id)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        
        const simpleResult = await client.query(simpleQuery, [
          testData.userId,
          testData.provider,
          testData.payload,
          testData.occurredAt,
          testData.sourceId,
        ]);

        if (simpleResult.rows.length > 0 && simpleResult.rows[0]) {
          const row = simpleResult.rows[0] as { id?: string };
          results.strategy1_simple_insert.success = true;
          results.strategy1_simple_insert.insertedId = row.id ?? "unknown";
          
          log.info({ userId, insertedId: results.strategy1_simple_insert.insertedId }, "simple_insert_success");
        }

      } catch (simpleError) {
        const errorMsg = simpleError instanceof Error ? simpleError.message : String(simpleError);
        results.strategy1_simple_insert.error = errorMsg;
        log.warn({ userId, error: errorMsg }, "simple_insert_failed");

        // Strategy 2: Find the actual constraint name and use it
        if (errorMsg.includes("duplicate") || errorMsg.includes("unique")) {
          try {
            log.info({ userId, strategy: "constraint_lookup" }, "looking_up_constraint_names");
            
            // Get constraint information
            const constraintQuery = `
              SELECT constraint_name, column_name
              FROM information_schema.key_column_usage
              WHERE table_name = 'raw_events' 
              AND table_schema = 'public'
              ORDER BY constraint_name, ordinal_position
            `;
            
            const constraintResult = await client.query(constraintQuery);
            log.info({ userId, constraints: constraintResult.rows }, "found_constraints");

            // Try using the actual constraint name
            if (constraintResult.rows.length > 0) {
              const constraintName = (constraintResult.rows[0] as { constraint_name?: string }).constraint_name;
              
              if (constraintName) {
                const upsertQuery = `
                  INSERT INTO raw_events (user_id, provider, payload, occurred_at, source_id)
                  VALUES ($1, $2, $3, $4, $5)
                  ON CONFLICT ON CONSTRAINT ${constraintName} DO NOTHING
                  RETURNING id
                `;

                const upsertResult = await client.query(upsertQuery, [
                  testData.userId,
                  `${testData.provider}_v2`,
                  testData.payload,
                  testData.occurredAt,
                  `${testData.sourceId}_v2`,
                ]);

                results.strategy2_upsert_by_constraint_name.success = true;
                if (upsertResult.rows.length > 0 && upsertResult.rows[0]) {
                  const row = upsertResult.rows[0] as { id?: string };
                  results.strategy2_upsert_by_constraint_name.insertedId = row.id ?? "unknown";
                }
                
                log.info({ userId, constraintName, insertedId: results.strategy2_upsert_by_constraint_name.insertedId }, "constraint_upsert_success");
              }
            }

          } catch (constraintError) {
            const constraintErrorMsg = constraintError instanceof Error ? constraintError.message : String(constraintError);
            results.strategy2_upsert_by_constraint_name.error = constraintErrorMsg;
            log.warn({ userId, error: constraintErrorMsg }, "constraint_upsert_failed");
          }
        }

        // Strategy 3: Check if exists, then insert
        try {
          log.info({ userId, strategy: "check_then_insert" }, "attempting_check_then_insert");
          
          const checkQuery = `
            SELECT id FROM raw_events 
            WHERE user_id = $1 AND provider = $2 AND source_id = $3
            LIMIT 1
          `;
          
          const checkResult = await client.query(checkQuery, [
            testData.userId,
            `${testData.provider}_v3`,
            `${testData.sourceId}_v3`,
          ]);

          if (checkResult.rows.length === 0) {
            // No conflict, safe to insert
            const insertQuery = `
              INSERT INTO raw_events (user_id, provider, payload, occurred_at, source_id)
              VALUES ($1, $2, $3, $4, $5)
              RETURNING id
            `;
            
            const insertResult = await client.query(insertQuery, [
              testData.userId,
              `${testData.provider}_v3`,
              testData.payload,
              testData.occurredAt,
              `${testData.sourceId}_v3`,
            ]);

            if (insertResult.rows.length > 0 && insertResult.rows[0]) {
              const row = insertResult.rows[0] as { id?: string };
              results.strategy3_check_then_insert.success = true;
              results.strategy3_check_then_insert.insertedId = row.id ?? "unknown";
              
              log.info({ userId, insertedId: results.strategy3_check_then_insert.insertedId }, "check_then_insert_success");
            }
          } else {
            // Record exists, skip
            results.strategy3_check_then_insert.success = true;
            results.strategy3_check_then_insert.insertedId = "skipped_existing";
            log.info({ userId }, "check_then_insert_skipped_existing");
          }

        } catch (checkInsertError) {
          const checkInsertErrorMsg = checkInsertError instanceof Error ? checkInsertError.message : String(checkInsertError);
          results.strategy3_check_then_insert.error = checkInsertErrorMsg;
          log.warn({ userId, error: checkInsertErrorMsg }, "check_then_insert_failed");
        }
      }

    } finally {
      client.release();
    }

    const successCount = Object.values(results).filter(r => r.success).length;
    const workingStrategy = Object.entries(results).find(([, r]) => r.success)?.[0] ?? "none";

    log.info({ userId, successCount, workingStrategy, results }, "fix_insert_complete");

    return ok({
      success: successCount > 0,
      workingStrategy,
      successCount,
      totalStrategies: 3,
      results,
      message: successCount > 0 ? `Found ${successCount} working insertion strategies!` : "All insertion strategies failed",
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "fix_insert_failed");
    
    return ok({ success: false, error: errorMsg, results });

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