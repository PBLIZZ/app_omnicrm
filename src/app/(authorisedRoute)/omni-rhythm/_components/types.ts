/**
 * Unified calendar and appointment type definitions
 * Consolidates all calendar-related interfaces to prevent type conflicts
 *
 * Contains strict TypeScript interfaces that eliminate all `any` types
 * and provide proper type safety for calendar operations.
 */

// Base calendar event interface
export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string | undefined;
  attendees?: Array<{ email: string; name?: string }> | undefined;
  eventType?: string | undefined;
  businessCategory?: string | undefined;
  description?: string | undefined;
}

// Enhanced appointment interface with business intelligence
export interface Appointment {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string | undefined;
  attendees?: Array<{ email: string; name?: string }> | undefined;
  eventType?: string | undefined;
  businessCategory?: string | undefined;
  description?: string | undefined;
  clientContext?:
    | {
        clientId?: string;
        clientName?: string;
        sessionNumber?: number;
        lastSessionDate?: string;
        totalSessions?: number;
        notes?: string;
        preparationNeeded?: string[];
        estimatedRevenue?: number;
      }
    | undefined;
  businessInsights?:
    | {
        isHighValue?: boolean;
        isRepeatClient?: boolean;
        requiresPreparation?: boolean;
        suggestedActions?: string[];
      }
    | undefined;
}

// Calendar sync and connection types
export type CalendarItem = {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string;
};

// Client management types
export interface Client {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  totalSessions: number;
  totalSpent: number;
  lastSessionDate: string;
  nextSessionDate?: string;
  status: "active" | "inactive" | "prospect";
  satisfaction: number; // 1-5 stars
  preferences?: {
    preferredTimes?: string[];
    preferredServices?: string[];
    goals?: string[];
  };
}

// Session and milestone tracking
export interface SessionMilestone {
  id: string;
  clientId: string;
  sessionNumber: number;
  date: string;
  type: "completed" | "scheduled" | "cancelled" | "no-show";
  duration: number;
  revenue: number;
  notes?: string;
  feedback?: string;
}

// Preparation workflow types
export interface PreparationTask {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  priority: "low" | "medium" | "high";
  estimatedTime: number; // minutes
  category: "client" | "preparation" | "followup" | "administrative";
  dueDate?: Date;
}

export interface UpcomingAppointment {
  id: string;
  title: string;
  clientName: string;
  date: string;
  startTime: string;
  endTime: string;
  serviceType: string;
  preparationTasks: PreparationTask[];
  clientNotes?: string;
  lastSessionNotes?: string;
}

// Component props interfaces
export interface TodayIntelligencePanelProps {
  appointments: Appointment[];
  isLoading?: boolean;
}

export interface WeeklyBusinessFlowProps {
  appointments: Appointment[];
  weeklyStats?: WeeklyStats;
  isLoading?: boolean;
}

export interface ClientSessionTimelineProps {
  clients: Client[];
  milestones: SessionMilestone[];
  isLoading?: boolean;
}

export interface PreparationWorkflowProps {
  upcomingAppointments: UpcomingAppointment[];
  isLoading?: boolean;
}

export interface QuickActionsProps {
  onNewSession?: () => void;
  onScheduleFollowup?: () => void;
  onGenerateInsights?: () => void;
  onSendMessage?: () => void;
  onViewHistory?: () => void;
}

export interface RhythmHeaderProps {
  onLoadInsights?: () => void;
  onProcessJobs?: () => void;
  onSearch?: (query: string) => void;
}

// Calendar event creation data interface for strict typing (Google Calendar API format)
export interface CalendarEventCreateData {
  summary: string; // Google Calendar uses 'summary' instead of 'title'
  description?: string;
  location?: string;
  start: {
    dateTime: string; // ISO string
    timeZone: string;
  };
  end: {
    dateTime: string; // ISO string
    timeZone: string;
  };
  attendees?: Array<{ email: string; name?: string }>;
  calendarId?: string;
  isAllDay?: boolean;
  visibility?: "default" | "public" | "private" | "confidential";
  eventType?: string;
  businessCategory?: string;
}

// Google Calendar API response interface
export interface GoogleCalendarEventResponse {
  id: string;
  htmlLink: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus?: "needsAction" | "declined" | "tentative" | "accepted";
  }>;
  status?: "confirmed" | "tentative" | "cancelled";
}

export interface SessionModalProps {
  onCreateEvent: (eventData: CalendarEventCreateData) => Promise<void>;
}

export interface SelfCareModalProps {
  onCreateEvent: (eventData: CalendarEventCreateData) => Promise<void>;
}

export interface CalendarConnectionCardProps {
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  isEmbedding?: boolean;
  upcomingEventsCount?: number;
  importedEventsCount?: number;
  lastSync?: string | null | undefined;
  syncStatus?: string;
  error?: string | null;
  onConnect: () => void;
  onSync: () => void;
  sessionsNext7Days?: number;
  sessionsThisMonth?: number;
}

export interface BusinessMetricsProps {
  totalSessions: number;
  totalRevenue: number;
  newClients: number;
  busiestDay: string;
  utilizationRate: number;
  clientRetention: number;
  isLoading?: boolean;
}

// Weekly stats interface (matches rhythm-intelligence.service.ts)
export interface WeeklyStats {
  totalAppointments: number;
  totalRevenue: number;
  totalHours: number;
  busiestDay: string;
  clientRetention: number;
  newClients: number;
  averageSessionValue: number;
  avgSessionLength: number;
  utilizationRate: number;
}

// Type guard to check if a CalendarEvent has business intelligence data
export function isAppointment(event: CalendarEvent): event is Appointment {
  return "clientContext" in event || "businessInsights" in event;
}

// Type guard to check if API response has expected structure
export function isGoogleCalendarResponse(data: unknown): data is GoogleCalendarEventResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "id" in data &&
    "htmlLink" in data &&
    typeof (data as Record<string, unknown>)["id"] === "string" &&
    typeof (data as Record<string, unknown>)["htmlLink"] === "string"
  );
}

// Type guard to check if error response has expected structure
export function hasErrorMessage(
  error: unknown,
): error is { error?: { message?: string }; message?: string } {
  return (
    typeof error === "object" &&
    error !== null &&
    (("error" in error &&
      typeof (error as Record<string, unknown>)["error"] === "object" &&
      (error as Record<string, unknown>)["error"] !== null &&
      "message" in ((error as Record<string, unknown>)["error"] as Record<string, unknown>)) ||
      ("message" in error && typeof (error as Record<string, unknown>)["message"] === "string"))
  );
}

// Helper function to safely extract error message from unknown error
export function getErrorMessage(error: unknown): string {
  if (hasErrorMessage(error)) {
    // First try to get nested error.message
    if (error.error?.message) {
      return error.error.message;
    }
    // Fallback to direct message
    if (error.message) {
      return error.message;
    }
  }

  // Final fallback for Error instances
  if (error instanceof Error) {
    return error.message;
  }

  return "An unknown error occurred";
}

// Helper function to safely extract HTML link from API response
export function getHtmlLink(data: unknown): string {
  if (isGoogleCalendarResponse(data)) {
    return data.htmlLink;
  }
  return "Check your calendar";
}

// Helper function to convert CalendarEvent to Appointment
export function toAppointment(event: CalendarEvent): Appointment {
  return {
    ...event,
    clientContext: undefined,
    businessInsights: undefined,
  };
}

// Helper function to convert CalendarEvent array to Appointment array
export function toAppointments(events: CalendarEvent[]): Appointment[] {
  return events.map(toAppointment);
}

// Helper function to safely parse API response data
export function safeParseApiData(data: unknown): { data?: GoogleCalendarEventResponse } {
  if (typeof data === "object" && data !== null && "data" in data) {
    const typedData = data as Record<string, unknown>;
    if (isGoogleCalendarResponse(typedData["data"])) {
      return { data: typedData["data"] };
    }
  }
  return {};
}
