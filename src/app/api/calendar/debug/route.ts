import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { sql } from "drizzle-orm";

// GET: Debug Google Calendar integration status
export async function GET(req: NextRequest): Promise<Response> {
  try {
    const userId = await getServerUserId();
    const db = await getDb();

    // Check for calendar integration
    const integration = await db.execute(sql`
      SELECT 
        user_id,
        provider,
        service,
        CASE WHEN access_token IS NOT NULL THEN 'present' ELSE 'missing' END as access_token_status,
        CASE WHEN refresh_token IS NOT NULL THEN 'present' ELSE 'missing' END as refresh_token_status,
        expiry_date,
        created_at,
        updated_at
      FROM user_integrations
      WHERE user_id = ${userId}
      AND provider = 'google'
      AND service = 'calendar'
    `);

    const rows = (integration as unknown as { rows: any[] }).rows;
    
    // Check if tokens are expired
    const now = new Date();
    const integrationData = rows[0];
    let tokenStatus = 'not_found';
    
    if (integrationData) {
      if (integrationData.expiry_date && new Date(integrationData.expiry_date) < now) {
        tokenStatus = 'expired';
      } else {
        tokenStatus = 'valid';
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        hasIntegration: !!integrationData,
        tokenStatus,
        integration: integrationData || null,
        currentTime: now.toISOString(),
      },
    });
  } catch (error) {
    console.error("Debug endpoint error:", error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
