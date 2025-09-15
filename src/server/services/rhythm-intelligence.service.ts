/**
 * RhythmIntelligence Service
 *
 * Unified business intelligence service for OmniRhythm calendar management.
 * Consolidates functionality from CalendarBusinessIntelligence and ClientContextService
 * to provide comprehensive wellness business insights.
 */

import { format, differenceInDays, startOfWeek, endOfWeek } from "date-fns";

// ============================================================================
// CORE INTERFACES
// ============================================================================

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string | undefined;
  attendees?: Array<{ email: string; name?: string }> | undefined;
  eventType?: string | undefined;
  businessCategory?: string | undefined;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalSessions: number;
  totalSpent: number;
  lastSessionDate: string;
  nextSessionDate?: string;
  status: "active" | "inactive" | "prospect";
  satisfaction: number; // 1-5 stars
  preferences?: {
    preferredTimes?: string[];
    preferredServices?: string[];
    allergies?: string[];
    goals?: string[];
  };
  medicalNotes?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

export interface SessionHistory {
  id: string;
  clientId: string;
  date: string;
  duration: number;
  service: string;
  revenue: number;
  notes?: string;
  feedback?: string;
  followUpNeeded: boolean;
  goals?: string[];
}

export interface BusinessIntelligenceEvent extends CalendarEvent {
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

export interface ClientContext {
  client: Client;
  sessionHistory: SessionHistory[];
  upcomingAppointments: Array<{
    id: string;
    date: string;
    service: string;
    duration: number;
  }>;
  preparationItems: string[];
  insights: string[];
  recommendations: string[];
  riskFactors: string[];
}

// ============================================================================
// MAIN SERVICE CLASS
// ============================================================================

export class RhythmIntelligenceService {
  private static mockClients: Client[] = [
    {
      id: "client-1",
      name: "Sarah Johnson",
      email: "sarah@example.com",
      phone: "+1-555-0123",
      totalSessions: 24,
      totalSpent: 2400,
      lastSessionDate: "2024-01-10",
      nextSessionDate: "2024-01-17",
      status: "active",
      satisfaction: 5,
      preferences: {
        preferredTimes: ["morning", "afternoon"],
        preferredServices: ["massage", "yoga"],
        allergies: ["latex"],
        goals: ["stress relief", "flexibility"],
      },
      medicalNotes: "Lower back pain, prefers gentle pressure",
    },
  ];

  // ============================================================================
  // EVENT ENHANCEMENT METHODS
  // ============================================================================

  /**
   * Enhance calendar events with business intelligence
   */
  public static enhanceEvents(events: CalendarEvent[]): BusinessIntelligenceEvent[] {
    return events.map((event) => this.enhanceSingleEvent(event));
  }

  private static enhanceSingleEvent(event: CalendarEvent): BusinessIntelligenceEvent {
    const clientMatch = this.matchEventToClient(event);

    const enhanced: BusinessIntelligenceEvent = {
      ...event,
      clientContext: clientMatch
        ? {
            clientId: clientMatch.id,
            clientName: clientMatch.name,
            sessionNumber: clientMatch.totalSessions + 1,
            lastSessionDate: clientMatch.lastSessionDate,
            totalSessions: clientMatch.totalSessions,
            notes: this.generateClientNotes(clientMatch),
            preparationNeeded: this.generatePreparationTasks(event, clientMatch),
            estimatedRevenue: this.calculateEstimatedRevenue(event),
          }
        : undefined,
      businessInsights: clientMatch
        ? {
            isHighValue: this.isHighValueEvent(event, clientMatch),
            isRepeatClient: clientMatch.totalSessions > 0,
            requiresPreparation: this.requiresPreparation(event, clientMatch),
            suggestedActions: this.generateSuggestedActions(event, clientMatch),
          }
        : undefined,
    };

    return enhanced;
  }

  /**
   * Single source of truth for matching events to clients
   * Consolidates the duplicate logic from both original services
   */
  private static matchEventToClient(event: CalendarEvent): Client | null {
    if (!event.attendees || event.attendees.length === 0) {
      return null;
    }

    // Try to match by email first (most reliable)
    for (const attendee of event.attendees) {
      const client = this.mockClients.find(
        (c) => c.email.toLowerCase() === attendee.email.toLowerCase(),
      );
      if (client) {
        return client;
      }
    }

    // Try to match by name as fallback
    for (const attendee of event.attendees) {
      if (attendee.name) {
        const client = this.mockClients.find(
          (c) =>
            c.name.toLowerCase().includes(attendee.name!.toLowerCase()) ||
            attendee.name!.toLowerCase().includes(c.name.toLowerCase()),
        );
        if (client) {
          return client;
        }
      }
    }

    return null;
  }

  // ============================================================================
  // BUSINESS CALCULATION METHODS
  // ============================================================================

  private static calculateEstimatedRevenue(event: CalendarEvent): number {
    const baseRates: Record<string, number> = {
      massage: 120,
      yoga: 85,
      pilates: 95,
      meditation: 75,
      "personal training": 100,
      consultation: 150,
    };

    const eventTitle = event.title.toLowerCase();

    for (const [service, rate] of Object.entries(baseRates)) {
      if (eventTitle.includes(service)) {
        return rate;
      }
    }

    // Duration-based estimation as fallback
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

    return Math.round(durationHours * 100); // $100/hour default rate
  }

  private static generatePreparationTasks(event: CalendarEvent, client: Client): string[] {
    const tasks: string[] = [];
    const eventTitle = event.title.toLowerCase();

    // Service-specific preparation
    if (eventTitle.includes("massage")) {
      tasks.push("Prepare massage oils and towels");
      tasks.push("Set room temperature to 72-75°F");
    }

    if (eventTitle.includes("yoga") || eventTitle.includes("pilates")) {
      tasks.push("Set up mats and props");
      tasks.push("Prepare playlist for session");
    }

    // Client-specific preparation
    if (client.medicalNotes) {
      tasks.push(`Review medical notes: ${client.medicalNotes}`);
    }

    if (client.preferences?.allergies && client.preferences.allergies.length > 0) {
      tasks.push(`Check for allergies: ${client.preferences.allergies.join(", ")}`);
    }

    // Follow-up preparation
    if (differenceInDays(new Date(), new Date(client.lastSessionDate)) > 30) {
      tasks.push("Prepare welcome back conversation");
    }

    return tasks;
  }

  private static generateClientNotes(client: Client): string {
    const notes: string[] = [];

    notes.push(`${client.totalSessions} previous sessions`);
    notes.push(`Last seen: ${format(new Date(client.lastSessionDate), "MMM d, yyyy")}`);
    notes.push(`Satisfaction: ${client.satisfaction}/5 stars`);

    if (client.preferences?.goals && client.preferences.goals.length > 0) {
      notes.push(`Goals: ${client.preferences.goals.join(", ")}`);
    }

    return notes.join(" • ");
  }

  private static isHighValueEvent(event: CalendarEvent, client: Client): boolean {
    const estimatedRevenue = this.calculateEstimatedRevenue(event);
    return estimatedRevenue > 150 || client.totalSpent > 1000;
  }

  private static requiresPreparation(event: CalendarEvent, client: Client): boolean {
    return !!(
      client.medicalNotes ??
      client.preferences?.allergies?.length ??
      event.title.toLowerCase().includes("first") ??
      differenceInDays(new Date(), new Date(client.lastSessionDate)) > 30
    );
  }

  private static generateSuggestedActions(event: CalendarEvent, client: Client): string[] {
    const actions: string[] = [];

    if (differenceInDays(new Date(event.startTime), new Date()) <= 1) {
      actions.push("Send reminder text");
    }

    if (client.totalSessions > 0 && client.totalSessions % 10 === 0) {
      actions.push("Consider loyalty discount");
    }

    if (client.satisfaction >= 4 && Math.random() > 0.7) {
      actions.push("Ask for referral");
    }

    return actions;
  }

  // ============================================================================
  // CLIENT CONTEXT METHODS
  // ============================================================================

  /**
   * Get comprehensive client context for deep-dive analysis
   */
  public static async getClientContext(clientId: string): Promise<ClientContext | null> {
    const client = this.mockClients.find((c) => c.id === clientId);
    if (!client) {
      return null;
    }

    const sessionHistory = await this.getSessionHistory(clientId);
    const upcomingAppointments = this.getUpcomingAppointments();

    return {
      client,
      sessionHistory,
      upcomingAppointments,
      preparationItems: this.generatePreparationItems(client, sessionHistory),
      insights: this.generateInsights(client, sessionHistory),
      recommendations: this.generateRecommendations(client),
      riskFactors: this.identifyRiskFactors(client),
    };
  }

  private static async getSessionHistory(clientId: string): Promise<SessionHistory[]> {
    // Mock data - in real implementation, this would query the database
    return [
      {
        id: "session-1",
        clientId,
        date: "2024-01-03",
        duration: 60,
        service: "Deep tissue massage",
        revenue: 120,
        notes: "Client reported tension in shoulders",
        feedback: "Very relaxing, felt great afterwards",
        followUpNeeded: false,
        goals: ["stress relief", "muscle tension"],
      },
    ];
  }

  private static getUpcomingAppointments(): Array<{
    id: string;
    date: string;
    service: string;
    duration: number;
  }> {
    // Mock data - in real implementation, this would query calendar events
    return [
      {
        id: "upcoming-1",
        date: "2024-01-17",
        service: "Swedish massage",
        duration: 60,
      },
    ];
  }

  private static generatePreparationItems(client: Client, history: SessionHistory[]): string[] {
    const items: string[] = [];

    if (client.medicalNotes) {
      items.push(`Review medical notes: ${client.medicalNotes}`);
    }

    if (history.length > 0 && history.some((h) => h.followUpNeeded)) {
      items.push("Follow up on previous session concerns");
    }

    return items;
  }

  private static generateInsights(client: Client, history: SessionHistory[]): string[] {
    const insights: string[] = [];

    if (history.length > 5) {
      insights.push("Loyal client with consistent booking patterns");
    }

    if (client.satisfaction >= 4) {
      insights.push("Highly satisfied client - good referral candidate");
    }

    return insights;
  }

  private static generateRecommendations(client: Client): string[] {
    const recommendations: string[] = [];

    if (client.totalSessions > 10 && client.satisfaction >= 4) {
      recommendations.push("Consider offering package deal or loyalty program");
    }

    return recommendations;
  }

  private static identifyRiskFactors(client: Client): string[] {
    const risks: string[] = [];

    const daysSinceLastSession = differenceInDays(new Date(), new Date(client.lastSessionDate));
    if (daysSinceLastSession > 60) {
      risks.push("Client hasn't booked in over 60 days - risk of churn");
    }

    if (client.satisfaction < 3) {
      risks.push("Low satisfaction score - needs attention");
    }

    return risks;
  }

  // ============================================================================
  // WEEKLY ANALYTICS METHODS
  // ============================================================================

  /**
   * Get today's priority events
   */
  public static getTodaysPriorityEvents(events: CalendarEvent[]): BusinessIntelligenceEvent[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todaysEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= today && eventDate < tomorrow;
    });

    return this.enhanceEvents(todaysEvents).sort((a, b) => {
      // Sort by priority: high-value clients first, then by time
      const aPriority =
        (a.businessInsights?.isHighValue ? 2 : 0) +
        (a.businessInsights?.requiresPreparation ? 1 : 0);
      const bPriority =
        (b.businessInsights?.isHighValue ? 2 : 0) +
        (b.businessInsights?.requiresPreparation ? 1 : 0);

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }

  /**
   * Get upcoming priority events (next N events)
   */
  public static getUpcomingPriorityEvents(
    events: CalendarEvent[],
    limit: number = 5,
  ): BusinessIntelligenceEvent[] {
    const now = new Date();
    const upcomingEvents = events
      .filter((event) => new Date(event.startTime) >= now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limit);

    return this.enhanceEvents(upcomingEvents).sort((a, b) => {
      // Sort by priority: high-value clients first, then by time
      const aPriority =
        (a.businessInsights?.isHighValue ? 2 : 0) +
        (a.businessInsights?.requiresPreparation ? 1 : 0);
      const bPriority =
        (b.businessInsights?.isHighValue ? 2 : 0) +
        (b.businessInsights?.requiresPreparation ? 1 : 0);

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
  }

  /**
   * Get upcoming events that need preparation
   */
  public static getUpcomingPreparationEvents(events: CalendarEvent[]): BusinessIntelligenceEvent[] {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const upcomingEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= new Date() && eventDate <= tomorrow;
    });

    return this.enhanceEvents(upcomingEvents).filter(
      (event) => event.businessInsights?.requiresPreparation,
    );
  }

  /**
   * Calculate weekly business statistics
   */
  public static calculateWeeklyStats(events: BusinessIntelligenceEvent[]): WeeklyStats {
    const weekStart = startOfWeek(new Date());
    const weekEnd = endOfWeek(new Date());

    const weekEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const totalRevenue = weekEvents.reduce(
      (sum, event) => sum + (event.clientContext?.estimatedRevenue ?? 0),
      0,
    );

    const totalHours = weekEvents.reduce((sum, event) => {
      const start = new Date(event.startTime);
      const end = new Date(event.endTime);
      return sum + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0);

    const dayGroups = weekEvents.reduce(
      (groups, event) => {
        const day = format(new Date(event.startTime), "EEEE");
        groups[day] = (groups[day] ?? 0) + 1;
        return groups;
      },
      {} as Record<string, number>,
    );

    const busiestDay = Object.entries(dayGroups).sort(([, a], [, b]) => b - a)[0]?.[0] ?? "Monday";

    const uniqueClients = new Set(weekEvents.map((e) => e.clientContext?.clientId).filter(Boolean))
      .size;

    const newClients = weekEvents.filter(
      (event) => event.clientContext?.sessionNumber === 1,
    ).length;

    // Calculate average session length in minutes
    const avgSessionLength =
      weekEvents.length > 0
        ? Math.round(
            weekEvents.reduce((total, event) => {
              const duration =
                (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) /
                (1000 * 60);
              return total + duration;
            }, 0) / weekEvents.length,
          )
        : 0;

    // Calculate utilization rate (assuming 8-hour workday, 5 days/week = 40 hours)
    const utilizationRate = Math.round((totalHours / 40) * 100);

    return {
      totalAppointments: weekEvents.length,
      totalRevenue,
      totalHours: Math.round(totalHours * 10) / 10,
      busiestDay,
      clientRetention:
        uniqueClients > 0 ? Math.round(((uniqueClients - newClients) / uniqueClients) * 100) : 0,
      newClients,
      averageSessionValue: weekEvents.length > 0 ? Math.round(totalRevenue / weekEvents.length) : 0,
      avgSessionLength,
      utilizationRate,
    };
  }
}
