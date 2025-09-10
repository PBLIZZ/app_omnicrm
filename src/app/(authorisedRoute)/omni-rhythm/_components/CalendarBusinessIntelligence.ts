import { format, isToday, differenceInDays, startOfWeek, endOfWeek } from "date-fns";

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  attendees?: Array<{ email: string; name?: string }>;
  eventType?: string;
  businessCategory?: string;
}

export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  totalSessions: number;
  totalSpent: number;
  lastSessionDate: string;
  status: "active" | "inactive" | "prospect";
}

export interface BusinessIntelligenceEvent extends CalendarEvent {
  clientContext?: {
    clientId?: string;
    clientName?: string;
    sessionNumber?: number;
    lastSessionDate?: string;
    totalSessions?: number;
    notes?: string;
    preparationNeeded?: string[];
    estimatedRevenue?: number;
  };
  businessInsights?: {
    isHighValue?: boolean;
    isRepeatClient?: boolean;
    requiresPreparation?: boolean;
    suggestedActions?: string[];
  };
}

export interface WeeklyStats {
  totalAppointments: number;
  totalRevenue: number;
  totalHours: number;
  busiestDay: string;
  clientRetention: number;
  newClients: number;
  avgSessionLength: number;
  utilizationRate: number;
}

export class CalendarBusinessIntelligence {
  private clients: Client[] = [];

  constructor(clients: Client[] = []) {
    this.clients = clients;
  }

  /**
   * Enhance calendar events with business intelligence
   */
  enhanceEvents(events: CalendarEvent[]): BusinessIntelligenceEvent[] {
    return events.map((event) => this.enhanceSingleEvent(event));
  }

  /**
   * Enhance a single calendar event with business intelligence
   */
  private enhanceSingleEvent(event: CalendarEvent): BusinessIntelligenceEvent {
    const enhancedEvent: BusinessIntelligenceEvent = { ...event };

    // Match with client data
    const clientMatch = this.matchEventToClient(event);
    if (clientMatch) {
      enhancedEvent.clientContext = {
        clientId: clientMatch.id,
        clientName: clientMatch.name,
        sessionNumber: clientMatch.totalSessions + 1,
        lastSessionDate: clientMatch.lastSessionDate,
        totalSessions: clientMatch.totalSessions,
        estimatedRevenue: this.calculateEstimatedRevenue(event),
        preparationNeeded: this.generatePreparationTasks(event, clientMatch),
        notes: this.generateClientNotes(clientMatch),
      };

      enhancedEvent.businessInsights = {
        isHighValue: this.isHighValueEvent(event, clientMatch),
        isRepeatClient: clientMatch.totalSessions > 1,
        requiresPreparation: this.requiresPreparation(event, clientMatch),
        suggestedActions: this.generateSuggestedActions(event, clientMatch),
      };
    }

    return enhancedEvent;
  }

  /**
   * Match calendar event to client based on attendee emails and names
   */
  private matchEventToClient(event: CalendarEvent): Client | null {
    if (!event.attendees || event.attendees.length === 0) {
      return null;
    }

    // Try to match by email first
    for (const attendee of event.attendees) {
      if (attendee.email) {
        const clientByEmail = this.clients.find(
          (c) => c.email.toLowerCase() === attendee.email.toLowerCase(),
        );
        if (clientByEmail) return clientByEmail;
      }
    }

    // Try to match by name (fuzzy matching)
    for (const attendee of event.attendees) {
      if (attendee.name) {
        const attendeeName = attendee.name.toLowerCase();
        const clientByName = this.clients.find(
          (c) =>
            c.name.toLowerCase().includes(attendeeName) ||
            attendeeName.includes(c.name.toLowerCase()),
        );
        if (clientByName) return clientByName;
      }
    }

    return null;
  }

  /**
   * Calculate estimated revenue for an event
   */
  private calculateEstimatedRevenue(event: CalendarEvent): number {
    const duration =
      (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60); // minutes

    let ratePerHour = 100; // Default rate

    switch (event.eventType) {
      case "consultation":
        ratePerHour = 150;
        break;
      case "workshop":
        ratePerHour = 75;
        break;
      case "class":
        ratePerHour = 50;
        break;
      case "massage":
        ratePerHour = 80;
        break;
      case "yoga":
        ratePerHour = 60;
        break;
    }

    return Math.round((ratePerHour * duration) / 60);
  }

  /**
   * Generate preparation tasks based on event type and client history
   */
  private generatePreparationTasks(event: CalendarEvent, client: Client): string[] {
    const tasks: string[] = [];

    // Basic preparation tasks
    tasks.push("Review client intake form");
    tasks.push("Check previous session notes");

    // Event type specific tasks
    switch (event.eventType) {
      case "consultation":
        tasks.push("Prepare assessment questions");
        tasks.push("Review client goals");
        break;
      case "massage":
        tasks.push("Check for contraindications");
        tasks.push("Prepare treatment plan");
        break;
      case "yoga":
        tasks.push("Plan sequence based on client level");
        tasks.push("Prepare modifications");
        break;
    }

    // Client-specific tasks
    if (client.totalSessions === 0) {
      tasks.push("Prepare new client welcome");
    } else if (client.totalSessions > 5) {
      tasks.push("Review long-term progress");
    }

    return tasks;
  }

  /**
   * Generate contextual notes about the client
   */
  private generateClientNotes(client: Client): string {
    const notes: string[] = [];

    if (client.totalSessions > 0) {
      const lastSession = new Date(client.lastSessionDate);
      const daysSince = differenceInDays(new Date(), lastSession);
      notes.push(`${client.totalSessions} sessions completed`);

      if (daysSince < 7) {
        notes.push("Recent client - review latest session");
      } else if (daysSince > 30) {
        notes.push("Returning client - check progress updates");
      }
    } else {
      notes.push("New client - prepare welcome experience");
    }

    return notes.join(", ");
  }

  /**
   * Determine if this is a high-value event
   */
  private isHighValueEvent(event: CalendarEvent, client: Client): boolean {
    const revenue = this.calculateEstimatedRevenue(event);
    return revenue > 100 || client.totalSpent > 500;
  }

  /**
   * Determine if event requires special preparation
   */
  private requiresPreparation(event: CalendarEvent, client: Client): boolean {
    return (
      client.totalSessions === 0 ||
      event.eventType === "consultation" ||
      client.status === "inactive"
    );
  }

  /**
   * Generate suggested actions for the event
   */
  private generateSuggestedActions(event: CalendarEvent, client: Client): string[] {
    const actions: string[] = [];

    if (client.totalSessions === 0) {
      actions.push("Send welcome email");
      actions.push("Prepare intake questionnaire");
    }

    if (client.status === "inactive") {
      actions.push("Schedule follow-up call");
    }

    if (event.eventType === "consultation") {
      actions.push("Prepare assessment tools");
    }

    return actions;
  }

  /**
   * Calculate weekly business statistics
   */
  calculateWeeklyStats(events: CalendarEvent[]): WeeklyStats {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    // Filter events for this week
    const weekEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const totalAppointments = weekEvents.length;

    // Calculate total hours
    const totalHours = weekEvents.reduce((total, event) => {
      const duration =
        (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) /
        (1000 * 60 * 60);
      return total + duration;
    }, 0);

    // Calculate total revenue
    const totalRevenue = weekEvents.reduce((total, event) => {
      return total + this.calculateEstimatedRevenue(event);
    }, 0);

    // Find busiest day
    const appointmentsByDay = weekEvents.reduce(
      (acc, event) => {
        const dayName = format(new Date(event.startTime), "EEEE");
        acc[dayName] = (acc[dayName] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const busiestDay = Object.entries(appointmentsByDay).reduce(
      (max, [day, count]) => (count > max.count ? { day, count } : max),
      { day: "None", count: 0 },
    ).day;

    // Calculate average session length
    const avgSessionLength =
      totalAppointments > 0
        ? weekEvents.reduce((total, event) => {
            const duration =
              (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) /
              (1000 * 60);
            return total + duration;
          }, 0) / totalAppointments
        : 0;

    // Calculate utilization rate (assuming 8-hour workday, 5 days/week = 40 hours)
    const utilizationRate = Math.round((totalHours / 40) * 100);

    return {
      totalAppointments,
      totalRevenue,
      totalHours: Math.round(totalHours * 10) / 10,
      busiestDay,
      clientRetention: 85, // This would be calculated from actual client data
      newClients: Math.floor(totalAppointments * 0.3), // Placeholder
      avgSessionLength: Math.round(avgSessionLength),
      utilizationRate,
    };
  }

  /**
   * Get today's priority events
   */
  getTodaysPriorityEvents(events: CalendarEvent[]): BusinessIntelligenceEvent[] {
    const todaysEvents = events.filter((event) => isToday(new Date(event.startTime)));

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
  getUpcomingPriorityEvents(
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
  getUpcomingPreparationEvents(events: CalendarEvent[]): BusinessIntelligenceEvent[] {
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
   * Update client database (this would integrate with your actual client service)
   */
  updateClientData(clients: Client[]): void {
    this.clients = clients;
  }
}
