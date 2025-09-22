import { google, calendar_v3 } from "googleapis";
import { getDb } from "@/server/db/client";
import { rawEvents, userIntegrations, calendarEvents } from "@/server/db/schema";
import { and, eq, gte, lte, asc } from "drizzle-orm";
import { withRateLimit } from "@/server/lib/rate-limiter";
import { logger } from "@/lib/observability";
import { decryptString, encryptString } from "@/server/utils/crypto";
import { enqueue } from "@/server/jobs/enqueue";
import { z } from "zod";

// CalendarEvent type for return values
export interface CalendarEvent {
  id: string;
  userId: string;
  googleEventId: string;
  title: string;
  description: string | null;
  location: string | null;
  startTime: Date;
  endTime: Date;
  status: string | null;
  attendees: unknown;
  createdAt: Date;
  updatedAt: Date;
  calendarId: string;
  timeZone: string | null;
  isAllDay: boolean | null;
  visibility: string | null;
  eventType: string | null;
  businessCategory: string | null;
  lastSynced: Date;
  googleUpdated: Date;
}

// Custom error types for better error handling
export class GoogleAuthError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly shouldRetry: boolean = false,
  ) {
    super(message);
    this.name = "GoogleAuthError";
  }
}

type OAuth2Type = InstanceType<typeof google.auth.OAuth2>;

// Calendar list types
export interface CalendarItem {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
}

export interface CalendarListResult {
  calendars: CalendarItem[];
  meta: {
    totalProcessed: number;
    totalSkipped: number;
    totalRequested: number;
  };
}

// Validation schema for CalendarItem
const CalendarItemSchema = z.object({
  id: z.string().min(1),
  summary: z.string().min(1),
  primary: z.boolean(),
  accessRole: z.string().min(1),
});

export class GoogleCalendarService {
  /**
   * Get OAuth2 client for a user with automatic token refresh
   */
  public static async getAuth(userId: string): Promise<OAuth2Type> {
    const db = await getDb();

    // Get user integration using Drizzle ORM - require explicit calendar service approval
    const result = await db
      .select({
        accessToken: userIntegrations.accessToken,
        refreshToken: userIntegrations.refreshToken,
        expiryDate: userIntegrations.expiryDate,
        service: userIntegrations.service,
      })
      .from(userIntegrations)
      .where(
        and(
          eq(userIntegrations.userId, userId),
          eq(userIntegrations.provider, "google"),
          eq(userIntegrations.service, "calendar"),
        ),
      )
      .limit(1);

    if (!result[0]) {
      throw new GoogleAuthError("Google Calendar not connected for user", "not_connected", false);
    }

    const integration = result[0];

    const redirectUri = process.env["GOOGLE_CALENDAR_REDIRECT_URI"];
    if (!redirectUri) {
      throw new GoogleAuthError(
        "Calendar OAuth not configured - missing GOOGLE_CALENDAR_REDIRECT_URI",
        "config_error",
        false,
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env["GOOGLE_CLIENT_ID"],
      process.env["GOOGLE_CLIENT_SECRET"],
      redirectUri,
    );

    // Type guard to ensure we have the required fields
    if (!integration.accessToken) {
      throw new GoogleAuthError("Invalid access token in database", "invalid_token", false);
    }

    const refreshToken = integration.refreshToken ? decryptString(integration.refreshToken) : null;

    const expiryDate: number | null = integration.expiryDate
      ? new Date(integration.expiryDate).getTime()
      : null;

    oauth2Client.setCredentials({
      access_token: decryptString(integration.accessToken),
      refresh_token: refreshToken,
      expiry_date: expiryDate,
    });

    // Add automatic token refresh listener (same as getGoogleClients)
    oauth2Client.on("tokens", async (tokens) => {
      if (!(tokens.access_token || tokens.refresh_token)) return;
      try {
        await db
          .update(userIntegrations)
          .set({
            accessToken: tokens.access_token
              ? encryptString(tokens.access_token)
              : integration.accessToken,
            refreshToken: tokens.refresh_token
              ? encryptString(tokens.refresh_token)
              : integration.refreshToken,
            expiryDate: tokens.expiry_date ? new Date(tokens.expiry_date) : integration.expiryDate,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(userIntegrations.userId, userId),
              eq(userIntegrations.provider, "google"),
              eq(userIntegrations.service, integration.service),
            ),
          );
      } catch (error) {
        await logger.error(
          "Failed to update tokens from automatic refresh",
          {
            operation: "oauth",
            additionalData: { userId, service: integration.service },
          },
          error instanceof Error ? error : new Error(String(error)),
        );
      }
    });

    // Check if token is near expiry and refresh if needed
    const now = Date.now();
    const tokenExpiresIn = expiryDate ? expiryDate - now : 0;

    // Refresh if token expires within 5 minutes (300000ms)
    if (tokenExpiresIn < 300000 && refreshToken) {
      try {
        await logger.info("Refreshing Google Calendar token", {
          operation: "oauth",
          additionalData: {
            op: "google_calendar.token_refresh",
            userId,
            expiresIn: tokenExpiresIn,
          },
        });

        const { credentials } = await oauth2Client.refreshAccessToken();

        if (credentials.access_token) {
          // Update database with new tokens (use actual service name)
          await db
            .update(userIntegrations)
            .set({
              accessToken: encryptString(credentials.access_token),
              expiryDate: credentials.expiry_date ? new Date(credentials.expiry_date) : null,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(userIntegrations.userId, userId),
                eq(userIntegrations.provider, "google"),
                eq(userIntegrations.service, integration.service),
              ),
            );

          oauth2Client.setCredentials(credentials);

          await logger.info("Successfully refreshed Google Calendar token", {
            operation: "oauth",
            additionalData: {
              op: "google_calendar.token_refreshed",
              userId,
            },
          });
        }
      } catch (refreshError: unknown) {
        const refreshMsg =
          refreshError instanceof Error ? refreshError.message : String(refreshError);
        await logger.error(
          "Failed to refresh Google Calendar token",
          {
            operation: "oauth",
            additionalData: {
              op: "google_calendar.token_refresh_failed",
              userId,
              error: refreshMsg,
            },
          },
          refreshError instanceof Error ? refreshError : undefined,
        );

        // Check for specific auth errors
        if (refreshMsg.includes("invalid_grant") || refreshMsg.includes("refresh_token_expired")) {
          // Clear invalid tokens
          await this.clearInvalidTokens(userId);
          throw new GoogleAuthError(
            "Google Calendar authentication expired. Please reconnect your calendar.",
            "invalid_grant",
            false,
          );
        }

        throw new GoogleAuthError(
          "Failed to refresh Google Calendar token",
          "token_refresh_failed",
          true,
        );
      }
    }

    return oauth2Client;
  }

  /**
   * Check if an error is an authentication/authorization error
   */
  private static isAuthError(error: unknown): boolean {
    if (!error || typeof error !== "object") return false;

    const errorObj = error as Record<string, unknown>;

    // Safely extract message
    const messageVal = errorObj["message"];
    const message = typeof messageVal === "string" ? messageVal.toLowerCase() : "";

    // Safely extract code
    const codeVal = errorObj["code"];
    const code = typeof codeVal === "string" || typeof codeVal === "number" ? String(codeVal) : "";

    // Check for common auth error patterns
    const authErrorPatterns = [
      "invalid_grant",
      "invalid_credentials",
      "token_expired",
      "unauthorized",
      "authentication",
      "access_denied",
      "refresh_token_expired",
    ];

    const hasAuthMessage = authErrorPatterns.some((pattern) => message.includes(pattern));
    const hasAuthCode = [401, 403].includes(Number(code));

    return hasAuthMessage || hasAuthCode;
  }

  /**
   * Clear invalid tokens for a user
   */
  private static async clearInvalidTokens(userId: string): Promise<void> {
    const db = await getDb();

    try {
      // Clear all Google integrations for the user since tokens may be shared
      await db
        .delete(userIntegrations)
        .where(and(eq(userIntegrations.userId, userId), eq(userIntegrations.provider, "google")));

      await logger.info("Cleared invalid Google Calendar tokens", {
        operation: "oauth",
        additionalData: {
          op: "google_calendar.tokens_cleared",
          userId,
        },
      });
    } catch (error) {
      await logger.error(
        "Failed to clear invalid tokens",
        {
          operation: "oauth",
          additionalData: {
            op: "google_calendar.clear_tokens_failed",
            userId,
            error: error instanceof Error ? error.message : String(error),
          },
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Sync all calendar events for a user with enhanced error handling
   */
  static async syncUserCalendars(
    userId: string,
    options: {
      daysPast?: number;
      daysFuture?: number;
      maxResults?: number;
      batchId?: string;
      sessionId?: string;
      onProgress?: (progress: {
        currentStep: string;
        progressPercentage: number;
        totalItems?: number;
        importedItems?: number;
        failedItems?: number;
      }) => Promise<void>;
    } = {},
  ): Promise<{
    success: boolean;
    syncedEvents: number;
    error?: string;
  }> {
    try {
      const auth = await this.getAuth(userId);
      const calendar = google.calendar({ version: "v3", auth });

      // Report progress: discovering calendars
      await options.onProgress?.({
        currentStep: "Discovering calendars...",
        progressPercentage: 10,
      });

      // Get list of calendars with rate limiting
      const rateLimitedCalendarList = withRateLimit("calendar")(() => calendar.calendarList.list());
      const calendarsResponse = await rateLimitedCalendarList(userId);
      const calendars = calendarsResponse.data.items ?? [];

      let totalSyncedEvents = 0;
      let totalFailedEvents = 0;
      const totalCalendars = calendars.length;

      // Report progress: starting calendar sync
      await options.onProgress?.({
        currentStep: `Syncing ${totalCalendars} calendars...`,
        progressPercentage: 15,
        totalItems: totalCalendars,
        importedItems: 0,
        failedItems: 0,
      });

      // Sync events from each calendar
      for (let i = 0; i < calendars.length; i++) {
        const cal = calendars[i];
        if (!cal?.id) continue;

        try {
          // Report progress for this calendar
          await options.onProgress?.({
            currentStep: `Syncing calendar "${cal.summary ?? cal.id}"...`,
            progressPercentage: 15 + Math.floor((i / totalCalendars) * 55), // 15% to 70%
            totalItems: totalCalendars,
            importedItems: i,
            failedItems: totalFailedEvents,
          });

          const events = await this.syncCalendarEvents(userId, cal.id, calendar, options);
          totalSyncedEvents += events;
        } catch (error: unknown) {
          totalFailedEvents++;
          await logger.error(
            `Error syncing calendar ${cal.id || "unknown"}`,
            {
              operation: "api_call",
              additionalData: {
                op: "google_calendar.calendar_sync_error",
                userId,
                calendarId: cal.id || "unknown",
                error: error instanceof Error ? error.message : String(error),
              },
            },
            error instanceof Error ? error : undefined,
          );

          // Check for auth errors in individual calendar sync
          if (this.isAuthError(error)) {
            throw error; // Re-throw auth errors to be handled at the top level
          }
          // Continue with other calendars for non-auth errors
        }
      }

      // Report progress: calendar sync completed
      await options.onProgress?.({
        currentStep: `Completed syncing ${totalSyncedEvents} events from ${totalCalendars} calendars`,
        progressPercentage: 70,
        totalItems: totalCalendars,
        importedItems: totalCalendars - totalFailedEvents,
        failedItems: totalFailedEvents,
      });

      // Enqueue normalization jobs for the synced events
      if (totalSyncedEvents > 0 && options.batchId) {
        try {
          await enqueue(
            "normalize_google_event",
            { batchId: options.batchId, provider: "google_calendar" },
            userId,
            options.batchId,
          );
        } catch (jobError) {
          // Non-fatal for initial sync; raw events written successfully
          await logger.warn("Failed to enqueue normalization job after calendar sync", {
            operation: "job_enqueue",
            additionalData: {
              userId,
              batchId: options.batchId,
              syncedEvents: totalSyncedEvents,
              error: jobError instanceof Error ? jobError.message : String(jobError),
            },
          });
        }
      }

      return {
        success: true,
        syncedEvents: totalSyncedEvents,
      };
    } catch (error: unknown) {
      await logger.error(
        "Calendar sync failed",
        {
          operation: "api_call",
          additionalData: {
            op: "google_calendar.sync_failed",
            userId,
            error: error instanceof Error ? error.message : String(error),
            errorCode: error instanceof GoogleAuthError ? error.code : "unknown",
          },
        },
        error instanceof Error ? error : undefined,
      );

      // Handle specific auth errors
      if (error instanceof GoogleAuthError) {
        return {
          success: false,
          syncedEvents: 0,
          error: error.message,
        };
      }

      // Handle Google API errors
      if (this.isAuthError(error)) {
        // Clear tokens and return auth error
        await this.clearInvalidTokens(userId);
        return {
          success: false,
          syncedEvents: 0,
          error: "Google Calendar authentication expired. Please reconnect your calendar.",
        };
      }

      return {
        success: false,
        syncedEvents: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync events from a specific calendar
   */
  private static async syncCalendarEvents(
    userId: string,
    calendarId: string,
    calendar: calendar_v3.Calendar,
    options: {
      daysPast?: number;
      daysFuture?: number;
      maxResults?: number;
      batchId?: string;
    } = {},
  ): Promise<number> {
    // Configurable sync range - defaults to larger window for comprehensive data
    const daysPast = options.daysPast ?? 180; // 6 months back
    const daysFuture = options.daysFuture ?? 365; // 1 year ahead
    const maxResults = options.maxResults ?? 2500; // Google's max

    const timeMin = new Date();
    timeMin.setDate(timeMin.getDate() - daysPast);

    const timeMax = new Date();
    timeMax.setDate(timeMax.getDate() + daysFuture);

    const rateLimitedEventsList = withRateLimit("calendar")(() =>
      calendar.events.list({
        calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults,
      }),
    );
    const eventsResponse = await rateLimitedEventsList(userId);

    const events = eventsResponse.data.items ?? [];
    let syncedCount = 0;

    for (const event of events) {
      try {
        await this.writeToRawEvents(userId, calendarId, event, options.batchId);
        // Also write directly to calendarEvents for immediate UI availability
        await this.writeToCalendarEvents(userId, calendarId, event);
        syncedCount++;
      } catch (error) {
        await logger.error(
          "Error writing event to database",
          {
            operation: "calendar.sync.write_event",
            additionalData: {
              userId: userId.slice(0, 8) + "...",
              eventId: event.id,
              calendarId,
            },
          },
          error instanceof Error ? error : undefined,
        );
      }
    }

    return syncedCount;
  }

  /**
   * Write calendar event to raw_events for proper ingestion pipeline
   */
  private static async writeToRawEvents(
    userId: string,
    calendarId: string,
    event: calendar_v3.Schema$Event,
    batchId?: string,
  ): Promise<void> {
    if (!event.id || !event.start || !event.end) {
      return; // Skip events without required data
    }

    // Determine start and end times
    const startTime = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date)
        : new Date(); // fallback to current time

    const endTime = event.end.dateTime
      ? new Date(event.end.dateTime)
      : event.end.date
        ? new Date(event.end.date)
        : new Date(); // fallback to current time

    const db = await getDb();

    // Use direct event payload for consistency with background job processor
    const eventPayload = event;

    const sourceMeta = {
      calendarId: calendarId,
      eventId: event.id,
      status: event.status,
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      isAllDay: !event.start?.dateTime,
      recurring: !!event.recurrence,
      lastSynced: new Date().toISOString(),
    };

    // Use Drizzle ORM for safe database operations with upsert
    try {
      await db
        .insert(rawEvents)
        .values({
          userId: userId,
          provider: "google_calendar",
          payload: eventPayload,
          sourceId: event.id,
          occurredAt: startTime,
          sourceMeta: sourceMeta,
          batchId: batchId ?? null,
        })
        .onConflictDoUpdate({
          target: [rawEvents.userId, rawEvents.provider, rawEvents.sourceId],
          set: {
            payload: eventPayload,
            occurredAt: startTime,
            sourceMeta: sourceMeta,
            batchId: batchId ?? null,
          },
        });
    } catch (error: unknown) {
      // Handle any remaining errors
      const pgError = error as { code?: string };
      if (pgError?.code === "23505") {
        // Fallback for unique constraint violations
        await db
          .update(rawEvents)
          .set({
            payload: eventPayload,
            sourceMeta: sourceMeta,
            batchId: batchId ?? null,
            createdAt: new Date(),
          })
          .where(
            and(
              eq(rawEvents.userId, userId),
              eq(rawEvents.provider, "google_calendar"),
              eq(rawEvents.sourceId, event.id),
            ),
          );
      } else {
        throw error; // Re-throw if it's not a unique constraint violation
      }
    }
  }

  /**
   * Write calendar event directly to calendarEvents table for immediate UI availability
   */
  private static async writeToCalendarEvents(
    userId: string,
    calendarId: string,
    event: calendar_v3.Schema$Event,
  ): Promise<void> {
    if (!event.id || !event.start || !event.end) {
      return; // Skip events without required data
    }

    // Determine start and end times
    const startTime = event.start.dateTime
      ? new Date(event.start.dateTime)
      : event.start.date
        ? new Date(event.start.date)
        : new Date(); // fallback to current time

    const endTime = event.end.dateTime
      ? new Date(event.end.dateTime)
      : event.end.date
        ? new Date(event.end.date)
        : new Date(); // fallback to current time

    const db = await getDb();

    // Transform Google Calendar event to our schema format
    const calendarEventData = {
      userId,
      googleEventId: event.id,
      title: event.summary ?? "Untitled Event",
      description: event.description ?? null,
      startTime,
      endTime,
      location: event.location ?? null,
      status: event.status ?? null,
      attendees: event.attendees ?? [],
      timeZone: event.start.timeZone ?? null,
      isAllDay: !event.start.dateTime,
      visibility: event.visibility ?? null,
      eventType: null, // Can be enhanced with business logic
      businessCategory: null, // Can be enhanced with business logic
      keywords: [], // Can be enhanced with content analysis
      googleUpdated: event.updated ? new Date(event.updated) : new Date(),
      lastSynced: new Date(),
    };

    // Use upsert to handle duplicates gracefully
    try {
      await db
        .insert(calendarEvents)
        .values(calendarEventData)
        .onConflictDoUpdate({
          target: [calendarEvents.userId, calendarEvents.googleEventId],
          set: {
            title: calendarEventData.title,
            description: calendarEventData.description,
            startTime: calendarEventData.startTime,
            endTime: calendarEventData.endTime,
            location: calendarEventData.location,
            status: calendarEventData.status,
            attendees: calendarEventData.attendees,
            timeZone: calendarEventData.timeZone,
            isAllDay: calendarEventData.isAllDay,
            visibility: calendarEventData.visibility,
            googleUpdated: calendarEventData.googleUpdated,
            lastSynced: calendarEventData.lastSynced,
            updatedAt: new Date(),
          },
        });
    } catch (error: unknown) {
      // Log error but don't throw to avoid breaking the sync process
      await logger.error(
        "Failed to write calendar event directly to calendarEvents",
        {
          operation: "calendar.sync.write_calendar_event",
          additionalData: {
            userId: userId.slice(0, 8) + "...",
            eventId: event.id,
            calendarId,
          },
        },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get upcoming events for a user
   */
  static async getUpcomingEvents(userId: string, limit = 10): Promise<CalendarEvent[]> {
    const db = await getDb();
    const now = new Date();

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          eq(calendarEvents.status, "confirmed"),
          gte(calendarEvents.startTime, now),
        ),
      )
      .orderBy(asc(calendarEvents.startTime))
      .limit(limit);

    // Return simplified calendar event structure matching actual database
    return events.map((event) => ({
      id: event.id,
      userId: event.userId,
      googleEventId: event.googleEventId,
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      status: event.status,
      attendees: event.attendees,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      // Use actual database fields
      calendarId: "unknown", // Not stored in DB
      timeZone: event.timeZone,
      isAllDay: event.isAllDay,
      visibility: event.visibility,
      eventType: event.eventType,
      businessCategory: event.businessCategory,
      lastSynced: event.lastSynced ?? event.updatedAt,
      googleUpdated: event.googleUpdated ?? event.updatedAt,
    })) as CalendarEvent[];
  }

  /**
   * Get events by date range
   */
  static async getEventsByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<CalendarEvent[]> {
    const db = await getDb();

    const events = await db
      .select()
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          gte(calendarEvents.startTime, startDate),
          lte(calendarEvents.startTime, endDate),
        ),
      )
      .orderBy(asc(calendarEvents.startTime));

    // Return simplified calendar event structure matching actual database
    return events.map((event) => ({
      id: event.id,
      userId: event.userId,
      googleEventId: event.googleEventId,
      title: event.title,
      description: event.description,
      location: event.location,
      startTime: event.startTime,
      endTime: event.endTime,
      status: event.status,
      attendees: event.attendees,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
      // Use actual database fields
      calendarId: "unknown", // Not stored in DB
      timeZone: event.timeZone,
      isAllDay: event.isAllDay,
      visibility: event.visibility,
      eventType: event.eventType,
      businessCategory: event.businessCategory,
      lastSynced: event.lastSynced ?? event.updatedAt,
      googleUpdated: event.googleUpdated ?? event.updatedAt,
    })) as CalendarEvent[];
  }

  /**
   * List Google Calendar calendars for a user
   */
  static async listCalendars(userId: string): Promise<CalendarListResult> {
    const auth = await this.getAuth(userId);
    const calendar = google.calendar({ version: "v3", auth });

    const response = await calendar.calendarList.list({
      maxResults: 250, // Google's max is 250
      showHidden: false,
      showDeleted: false,
    });

    const rawItems = response.data.items ?? [];
    let processedCount = 0;
    let skippedCount = 0;

    const calendars: CalendarItem[] = rawItems
      .map((item: calendar_v3.Schema$CalendarListEntry) => {
        try {
          const transformedItem = {
            id: item.id ?? "",
            summary: item.summary ?? "Untitled Calendar",
            primary: item.primary ?? false,
            accessRole: item.accessRole ?? "reader",
          };

          // Validate each calendar item
          const validationResult = CalendarItemSchema.safeParse(transformedItem);
          if (!validationResult.success) {
            console.warn(`Skipping invalid calendar item: ${validationResult.error.message}`, {
              itemId: item.id,
              itemSummary: item.summary,
              validationErrors: validationResult.error.issues,
            });
            skippedCount++;
            return null;
          }
          processedCount++;
          return validationResult.data;
        } catch (error) {
          console.warn(
            `Error processing calendar item: ${error instanceof Error ? error.message : "Unknown error"}`,
            {
              itemId: item.id,
              itemSummary: item.summary,
              error: error instanceof Error ? error.stack : error,
            },
          );
          skippedCount++;
          return null;
        }
      })
      .filter((item): item is CalendarItem => item !== null);

    // Log processing summary
    if (skippedCount > 0) {
      console.warn(
        `Calendar list processing: ${processedCount} items processed, ${skippedCount} items skipped out of ${rawItems.length} total`,
      );
    }

    // Check if we have any valid calendars
    if (calendars.length === 0 && rawItems.length > 0) {
      throw new Error(`No valid calendars found after processing ${rawItems.length} items from Google Calendar API`);
    }

    // Sort calendars: primary first, then by summary
    calendars.sort((a, b) => {
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      return a.summary.localeCompare(b.summary);
    });

    return {
      calendars,
      meta: {
        totalProcessed: processedCount,
        totalSkipped: skippedCount,
        totalRequested: rawItems.length,
      },
    };
  }
}
