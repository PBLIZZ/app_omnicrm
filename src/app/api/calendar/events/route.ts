import { NextRequest, NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { getGoogleClients } from "@/server/google/client";

// GET: Return all calendar events for business intelligence
export async function GET(req: NextRequest): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error) {
    console.error("Calendar events GET - auth error:", error);
    return new NextResponse(
      JSON.stringify({
        error: "unauthorized",
        details: error instanceof Error ? error.message : "Authentication failed",
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  try {
    // Check if user has Google Calendar integration
    try {
      await getGoogleClients(userId);
    } catch (error: any) {
      if (error?.status === 401 || error?.message === "google_not_connected") {
        return NextResponse.json({
          isConnected: false,
          events: [],
        }, { status: 200 });
      }
      throw error;
    }

    // Get all calendar events from database for BI analysis
    try {
      const { listCalendarEventsService } = await import(
        "@/server/services/calendar.service"
      );

      // Get events from a wider range for BI analysis (last 30 days to next 90 days)
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 90);

      const eventsResult = await listCalendarEventsService(userId, {
        limit: 500, // Get more events for BI
        fromDate: startDate,
        toDate: endDate,
      });

      return NextResponse.json({
        isConnected: true,
        events: eventsResult.items.map((event) => ({
          id: event.id,
          title: event.title,
          startTime: event.startTime.toISOString(),
          endTime: event.endTime.toISOString(),
          location: event.location,
          eventType: event.eventType,
          businessCategory: event.businessCategory,
          attendees: event.attendees,
        })),
        totalCount: eventsResult.items.length,
      });
    } catch (serviceError) {
      console.error("Calendar events GET - database error:", serviceError);
      
      // Return empty data for service errors
      return NextResponse.json({
        isConnected: true,
        events: [],
        totalCount: 0,
      });
    }
  } catch (error) {
    console.log("Calendar events GET - database error:", error);
    return new NextResponse("database_error", { status: 500 });
  }
}