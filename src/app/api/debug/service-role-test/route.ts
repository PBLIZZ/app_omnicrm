/** POST /api/debug/service-role-test — diagnose service role configuration (auth required). */
import { getServerUserId } from "@/server/auth/user";
import { supaAdminGuard } from "@/lib/supabase/admin";
import { err, ok } from "@/lib/api/http";
// import { log } from "@/server/log"; // Removed missing module
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
      console.warn("service_role_env_missing:", { userId, hasUrl: Boolean(adminUrl), hasKey: Boolean(adminKey) });
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

      console.log("attempting_service_role_raw_events_insert:", { userId, testPayload: testRawEvent });
      
      const result = await supaAdminGuard.insert("raw_events", testRawEvent);
      diagnostics.testResults.canInsertRawEvents = true;
      
      console.log("service_role_raw_events_insert_success:", { userId, insertResult: result });
      
    } catch (insertError) {
      const errorMsg = insertError instanceof Error ? insertError.message : String(insertError);
      diagnostics.testResults.insertError = errorMsg;
      
      console.error("service_role_raw_events_insert_failed:", { 
        userId, 
        error: errorMsg, 
        errorType: insertError instanceof Error ? insertError.constructor.name : typeof insertError 
      });
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
      console.warn("service_role_interactions_insert_failed:", { 
        userId, 
        error: interactionError instanceof Error ? interactionError.message : String(interactionError) 
      });
    }

    const success = diagnostics.testResults.canInsertRawEvents;
    console.log("service_role_diagnostics_complete:", { 
      userId, 
      success,
      canInsertRawEvents: diagnostics.testResults.canInsertRawEvents,
      canInsertInteractions: diagnostics.testResults.canInsertInteractions,
    });

    return ok({ 
      success, 
      diagnostics,
      message: success ? "Service role working correctly" : "Service role has issues - check logs for details"
    });

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("service_role_diagnostics_failed:", { userId, error: errorMsg });
    
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