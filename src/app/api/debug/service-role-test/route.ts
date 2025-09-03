/** POST /api/debug/service-role-test — diagnose service role configuration (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { supaAdminGuard } from "@/lib/supabase/admin";
import { err, ok } from "@/lib/api/http";
import { log } from "@/server/log";
import { toApiError } from "@/server/jobs/types";

async function handleRequest(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error: unknown) {
    const { status, message } = toApiError(error);
    return err(status, message);
  }

  const diagnostics = {
    serviceRoleAvailable: false,
    environmentVariables: {
      hasSupabaseUrl: Boolean(process.env["NEXT_PUBLIC_SUPABASE_URL"]),
      hasServiceKey: Boolean(process.env["SUPABASE_SECRET_KEY"]),
    },
    testResults: {
      canInsertRawEvents: false,
      canInsertInteractions: false,
      insertError: null as string | null,
    },
  };

  try {
    // Test environment variables
    const adminUrl = process.env["NEXT_PUBLIC_SUPABASE_URL"];
    const adminKey = process.env["SUPABASE_SECRET_KEY"];
    
    if (!adminUrl || !adminKey) {
      log.warn({ userId, hasUrl: Boolean(adminUrl), hasKey: Boolean(adminKey) }, 
        "service_role_env_missing");
      return ok({ success: false, diagnostics, error: "Missing service role environment variables" });
    }

    diagnostics.serviceRoleAvailable = true;

    // Test 1: Try inserting a minimal raw_events record
    try {
      const testRawEvent = {
        userId,
        provider: "test",
        payload: { test: true, timestamp: new Date().toISOString() },
        occurredAt: new Date(),
        contactId: null,
        batchId: null,
        sourceMeta: { diagnostic: true },
        sourceId: `test_${Date.now()}`,
      };

      log.info({ userId, testPayload: testRawEvent }, "attempting_service_role_raw_events_insert");
      
      const result = await supaAdminGuard.insert("raw_events", testRawEvent);
      diagnostics.testResults.canInsertRawEvents = true;
      
      log.info({ userId, insertResult: result }, "service_role_raw_events_insert_success");
      
    } catch (insertError) {
      const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
      diagnostics.testResults.insertError = errorMsg;
      
      log.error({ 
        userId, 
        error: errorMsg, 
        errorType: insertError instanceof Error ? insertError.constructor.name : typeof insertError 
      }, "service_role_raw_events_insert_failed");
    }

    // Test 2: Try inserting into interactions (different table for comparison)
    try {
      const testInteraction = {
        userId,
        contactId: null,
        type: "note",
        subject: "Service role diagnostic test",
        bodyText: "This is a test interaction for service role diagnostics",
        bodyRaw: null,
        occurredAt: new Date(),
        source: "diagnostic",
        sourceId: `diag_${Date.now()}`,
        sourceMeta: { diagnostic: true },
        batchId: null,
      };

      await supaAdminGuard.insert("interactions", testInteraction);
      diagnostics.testResults.canInsertInteractions = true;
      
    } catch (interactionError) {
      log.warn({ 
        userId, 
        error: interactionError instanceof Error ? interactionError.message : String(interactionError) 
      }, "service_role_interactions_insert_failed");
    }

    const success = diagnostics.testResults.canInsertRawEvents;
    log.info({ 
      userId, 
      success,
      canInsertRawEvents: diagnostics.testResults.canInsertRawEvents,
      canInsertInteractions: diagnostics.testResults.canInsertInteractions,
    }, "service_role_diagnostics_complete");

    return ok({ 
      success, 
      diagnostics,
      message: success ? "Service role working correctly" : "Service role has issues - check logs for details"
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    log.error({ userId, error: errorMsg }, "service_role_diagnostics_failed");
    
    return ok({ 
      success: false, 
      diagnostics, 
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