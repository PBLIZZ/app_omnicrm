/**
 * OmniRhythm Component Types
 *
 * Types for rhythm and productivity tracking components
 */

/**
 * Rhythm Pattern
 */

/**
 * Productivity Metric
 */

/**
 * Contact
 */
export interface Contact {
  id: string;
  name: string;
  status: "active" | "inactive" | "prospect";
  totalSessions: number;
  totalSpent: number;
  satisfaction: number;
  lastSessionDate: string;
  nextSessionDate?: string;
}

/**
 * Session Milestone
 */
export interface SessionMilestone {
  id: string;
  contactId: string;
  title: string;
  description: string;
  date: string;
  type: "session" | "milestone" | "achievement" | "completed" | "scheduled" | "cancelled";
  sessionNumber?: number;
  revenue?: number;
}

/**
 * Contact Session Timeline Props
 */
export interface ContactSessionTimelineProps {
  contacts: Contact[];
  milestones: SessionMilestone[];
  isLoading?: boolean;
}

/**
 * Preparation Task
 */
export interface PreparationTask {
  id: string;
  title: string;
  description: string;
  category:
    | "preparation"
    | "research"
    | "follow-up"
    | "documentation"
    | "client"
    | "administrative"
    | "followup";
  priority: "low" | "medium" | "high";
  estimatedMinutes?: number;
  estimatedTime?: number;
  isRequired: boolean;
  completed?: boolean;
  dueDate?: Date | string;
}

/**
 * Attendee
 */
export interface Attendee {
  name?: string;
  email: string;
}

/**
 * Contact Context
 */
export interface ContactContext {
  contactName?: string;
  lastSession?: string;
  lastSessionDate?: string;
  totalSessions?: number;
  sessionNumber?: number;
  preferences?: string[];
  notes?: string;
  preparationNeeded?: string[];
}

/**
 * Appointment
 */
export interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  contactName?: string;
  clientName?: string;
  type: string;
  eventType?: string;
  title?: string;
  preparationTasks: PreparationTask[];
  attendees?: Attendee[];
  description?: string;
  contactContext?: ContactContext;
  location?: string;
  serviceType?: string;
  date?: string;
  clientNotes?: string;
  lastSessionNotes?: string;
}

/**
 * Preparation Workflow Props
 */
export interface PreparationWorkflowProps {
  upcomingAppointments: Appointment[];
  isLoading?: boolean;
}

/**
 * Today Intelligence Panel Props
 */
export interface TodayIntelligencePanelProps {
  appointments: Appointment[];
  isLoading?: boolean;
}

/**
 * Weekly Stats
 */
export interface WeeklyStats {
  totalAppointments: number;
  totalRevenue: number;
  totalHours: number;
  busiestDay: string;
  averageSessionLength: number;
  averageSessionValue?: number;
  avgSessionLength?: number;
  utilizationRate?: number;
  clientRetention?: number;
  clientSatisfaction?: number;
  newClients: number;
  returningClients: number;
}

/**
 * Weekly Business Flow Props
 */
export interface WeeklyBusinessFlowProps {
  appointments: Appointment[];
  weeklyStats?: WeeklyStats;
  isLoading?: boolean;
}

/**
 * Business Metrics Props
 */
export interface BusinessMetricsProps {
  appointments?: Appointment[];
  weeklyStats?: WeeklyStats;
  isLoading?: boolean;
  totalSessions?: number;
  totalRevenue?: number;
  newClients?: number;
  busiestDay?: string;
  utilizationRate?: number;
  clientRetention?: number;
}

/**
 * Client
 */
export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: "active" | "inactive" | "prospect";
  totalSessions?: number;
  lastSession?: string;
  nextSession?: string;
  notes?: string;
  totalSpent?: number;
  satisfaction?: number;
}

/**
 * Calendar Connection Card Props
 */
export interface CalendarConnectionCardProps {
  isConnected: boolean;
  isConnecting: boolean;
  isSyncing: boolean;
  importedEventsCount: number;
  lastSync?: Date | string | null;
  error?: string | null;
  onConnect: () => void;
  onSync: () => void;
  sessionsNext7Days: number;
  sessionsThisMonth: number;
}

/**
 * Calendar Event Create Data
 */
export interface CalendarEventCreateData {
  summary: string;
  description?: string;
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
  attendees?: Array<{ email: string }>;
  location?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

/**
 * Calendar Item
 */
export interface CalendarItem {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
  accessRole?: string;
}

/**
 * Quick Actions Props
 */
export interface QuickActionsProps {
  onNewSession?: () => void;
  onNewSelfCare?: () => void;
  onViewCalendar?: () => void;
  onQuickNote?: () => void;
  onScheduleFollowup?: () => void;
  onGenerateInsights?: () => void;
  onSendMessage?: () => void;
  onViewHistory?: () => void;
}

/**
 * Rhythm Header Props
 */
export interface RhythmHeaderProps {
  onLoadInsights?: () => void;
  onProcessJobs?: () => void;
  onSearch?: (query: string) => void;
}

/**
 * Session Modal Props
 */
export interface SessionModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSubmit?: (data: CalendarEventCreateData) => void;
  onCreateEvent?: (data: CalendarEventCreateData) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Self Care Modal Props
 */
export interface SelfCareModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onSubmit?: (data: CalendarEventCreateData) => void;
  onCreateEvent?: (data: CalendarEventCreateData) => Promise<void>;
  isSubmitting?: boolean;
}

/**
 * Utility Functions
 */
export function getHtmlLink(event: { htmlLink?: string }): string {
  return event.htmlLink ?? "";
}

export function safeParseApiData<T>(data: unknown): T {
  return data as T;
}

/**
 * Rhythm Dashboard Props
 */
