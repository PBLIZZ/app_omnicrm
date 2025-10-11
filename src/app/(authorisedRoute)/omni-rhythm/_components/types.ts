/**
 * OmniRhythm Component Types
 *
 * Types for rhythm and productivity tracking components
 */

/**
 * Rhythm Pattern
 */
export interface RhythmPattern {
  id: string;
  name: string;
  type: "daily" | "weekly" | "monthly";
  frequency: number;
  data: Record<string, unknown>;
}

/**
 * Productivity Metric
 */
export interface ProductivityMetric {
  id: string;
  name: string;
  value: number;
  trend: "up" | "down" | "stable";
  period: string;
}

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
  type: "session" | "milestone" | "achievement";
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
  category: "preparation" | "research" | "follow-up" | "documentation";
  priority: "low" | "medium" | "high";
  estimatedMinutes: number;
  isRequired: boolean;
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
  preparationNeeded: string[];
  notes?: string;
}

/**
 * Appointment
 */
export interface Appointment {
  id: string;
  startTime: string;
  endTime: string;
  contactName: string;
  type: string;
  eventType?: string;
  title?: string;
  preparationTasks: PreparationTask[];
  attendees?: Attendee[];
  description?: string;
  contactContext?: ContactContext;
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
  averageSessionLength: number;
  clientSatisfaction: number;
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
 * Rhythm Dashboard Props
 */
export interface RhythmDashboardProps {
  userId: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
}
