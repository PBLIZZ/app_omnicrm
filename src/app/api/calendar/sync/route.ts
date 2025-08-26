import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getServerUserId } from "@/server/auth/user";
import { getDb } from "@/server/db/client";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";

// GET: Return basic connection status and minimal stats the Calendar page expects
export async function GET(req: NextRequest): Promise<Response> {
  console.log("Calendar sync GET - starting, method:", req.method, "URL:", req.url);
  let userId: string;
  try {
    userId = await getServerUserId();
    console.log("Calendar sync GET - userId:", userId);
  } catch (error) {
    console.error("Calendar sync GET - auth error:", error);
    return new NextResponse(JSON.stringify({
      error: "unauthorized",
      details: error instanceof Error ? error.message : "Authentication failed"
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const db = await getDb();
    console.log("Calendar sync GET - got database connection");
    
    // Check if user has Google Calendar integration
    const integration = await db.execute(sql`
      SELECT user_id, provider, service, access_token, expiry_date 
      FROM user_integrations 
      WHERE user_id = ${userId} 
      AND provider = 'google' 
      AND service = 'calendar' 
      LIMIT 1
    `);
    
    console.log("Calendar sync GET - integration found:", !!integration.rows[0]);
    
    if (!integration.rows[0]) {
      console.log("Calendar sync GET - no integration found, returning not_connected");
      return new NextResponse("not_connected", { status: 500 });
    }

    // Integration exists, get actual upcoming events using the service
    console.log("Calendar sync GET - getting upcoming events from Google Calendar service");
    try {
      const upcomingEvents = await GoogleCalendarService.getUpcomingEvents(userId, 5);
      console.log("Calendar sync GET - found", upcomingEvents.length, "upcoming events");
      
      return NextResponse.json({
        upcomingEventsCount: upcomingEvents.length,
        upcomingEvents: upcomingEvents.map(event => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime,
          endTime: event.endTime,
          location: event.location,
        })),
        lastSync: new Date().toISOString(),
      });
    } catch (serviceError) {
      console.log("Calendar sync GET - service error, falling back to mock data:", serviceError);
      return NextResponse.json({
        upcomingEventsCount: 0,
        upcomingEvents: [],
        lastSync: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.log("Calendar sync GET - database error:", error);
    return new NextResponse("database_error", { status: 500 });
  }

}

// POST: Trigger a sync (no-op placeholder so UI can proceed)
export async function POST(req: NextRequest): Promise<Response> {
  console.log("Calendar sync POST - starting authentication check");
  let userId: string;
  try {
    userId = await getServerUserId();
    console.log("Calendar sync POST - authenticated user:", userId);
  } catch (error) {
    console.log("Calendar sync POST - authentication failed:", error);
    return new NextResponse(JSON.stringify({ 
      error: "unauthorized", 
      details: error instanceof Error ? error.message : "Authentication failed" 
    }), { 
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log("Calendar sync POST - checking for existing integration");
  try {
    const db = await getDb();
    // Use raw SQL to bypass Drizzle ORM issues
    const existing = await db.execute(sql`
      SELECT user_id FROM user_integrations 
      WHERE user_id = ${userId} 
      AND provider = 'google' 
      AND service = 'calendar' 
      LIMIT 1
    `);

    console.log("Calendar sync POST - integration check result:", existing.rows.length > 0);
    if (existing.rows.length === 0) {
      console.log("Calendar sync POST - no integration found, user needs to connect first");
      return new NextResponse(JSON.stringify({
        error: "not_connected", 
        message: "Google Calendar not connected. Please connect first."
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (dbError) {
    console.error("Calendar sync POST - database error during integration check:", dbError);
    return new NextResponse(JSON.stringify({
      error: "database_error",
      message: "Failed to check integration status",
      details: dbError instanceof Error ? dbError.message : "Unknown database error"
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Trigger actual calendar sync using the service
  console.log("Calendar sync POST - triggering calendar sync for user:", userId);
  try {
    const syncResult = await GoogleCalendarService.syncUserCalendars(userId, {
      daysPast: 30,
      daysFuture: 90,
      maxResults: 1000,
    });
    
    console.log("Calendar sync POST - sync completed:", syncResult);
    
    if (syncResult.success) {
      console.log("Calendar sync POST - sync successful, events synced:", syncResult.syncedEvents);
      return NextResponse.json({ 
        success: true, 
        syncedEvents: syncResult.syncedEvents,
        message: `Successfully synced ${syncResult.syncedEvents} events`
      });
    } else {
      console.error("Calendar sync POST - sync failed:", syncResult.error);
      return NextResponse.json({ 
        success: false, 
        error: syncResult.error || "Sync failed",
        details: "Check server logs for more information"
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Calendar sync POST - service exception:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown sync error",
      details: error instanceof Error ? error.stack : "No stack trace available"
    }, { status: 500 });
  }
}