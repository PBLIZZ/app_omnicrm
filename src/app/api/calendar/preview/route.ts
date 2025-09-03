import { NextResponse } from "next/server";
import { getServerUserId } from "@/server/auth/user";
import { GoogleCalendarService } from "@/server/services/google-calendar.service";
import { google } from "googleapis";

// GET: Return live preview data from Google Calendar (30 days ahead)
export async function GET(): Promise<Response> {
  let userId: string;
  try {
    userId = await getServerUserId();
  } catch (error) {
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
    // Get auth and make live Google Calendar API call
    const auth = await GoogleCalendarService.getAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });
    
    const timeMin = new Date().toISOString();
    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + 30); // 30 days ahead only
    
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 50
    });

    const events = response.data.items || [];

    return NextResponse.json({
      upcomingEventsCount: events.length,
    });
  } catch (error) {
    // Handle specific Google API errors
    if (error instanceof Error) {
      if (error.message.includes('invalid_grant') || error.message.includes('unauthorized')) {
        return NextResponse.json({
          error: "authentication_expired",
          message: "Google Calendar authentication has expired. Please reconnect.",
        }, { status: 401 });
      }
    }

    return new NextResponse(
      JSON.stringify({
        error: "service_error",
        details: error instanceof Error ? error.message : "Failed to fetch calendar preview",
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}