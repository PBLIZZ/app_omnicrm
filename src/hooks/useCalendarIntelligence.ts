/**
 * Calendar Business Intelligence Hook
 *
 * Separated from data fetching concerns, this hook focuses solely on
 * processing calendar events into business intelligence insights.
 *
 * Responsibilities:
 * - Process calendar events for business metrics
 * - Generate weekly statistics
 * - Calculate session metrics
 * - Provide enhanced appointments with BI data
 */
import { useMemo } from "react";
import { CalendarBusinessIntelligence } from "@/app/(authorisedRoute)/omni-rhythm/_components/CalendarBusinessIntelligence";
import type {
  CalendarEvent,
  Client,
  Appointment,
  WeeklyStats
} from "@/app/(authorisedRoute)/omni-rhythm/_components/types";

export interface SessionMetrics {
  sessionsNext7Days: number;
  sessionsThisMonth: number;
}

export interface UseCalendarIntelligenceResult {
  // Business Intelligence Service
  biService: CalendarBusinessIntelligence;

  // Enhanced data with BI
  enhancedAppointments: Appointment[];
  weeklyStats: WeeklyStats;
  sessionMetrics: SessionMetrics;

  // Convenience methods
  updateClientData: (clients: Client[]) => void;
  calculateRevenue: () => number;
  getBusiestDay: () => string;
}

export function useCalendarIntelligence(
  events: CalendarEvent[],
  clients: Client[]
): UseCalendarIntelligenceResult {

  // Create stable BI service instance
  const biService = useMemo(() => {
    const service = new CalendarBusinessIntelligence();
    return service;
  }, []);

  // Update client data when clients change
  useMemo(() => {
    if (clients.length > 0) {
      biService.updateClientData(clients);
    }
  }, [biService, clients]);

  // Calculate session metrics from events
  const sessionMetrics = useMemo((): SessionMetrics => {
    const now = new Date();
    const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const sessionsNext7Days = events.filter((event) => {
      if (!event.startTime) return false;
      const eventDate = new Date(event.startTime);
      return eventDate >= now && eventDate <= next7Days;
    }).length;

    const sessionsThisMonth = events.filter((event) => {
      if (!event.startTime) return false;
      const eventDate = new Date(event.startTime);
      return eventDate >= startOfCurrentMonth && eventDate <= endOfCurrentMonth;
    }).length;

    return { sessionsNext7Days, sessionsThisMonth };
  }, [events]);

  // Generate enhanced appointments with BI data
  const enhancedAppointments = useMemo((): Appointment[] => {
    return events.map((event): Appointment => {
      // Find matching client for this event
      const matchingClient = findMatchingClient(event, clients);

      return {
        ...event,
        clientContext: matchingClient ? {
          clientId: matchingClient.id,
          clientName: matchingClient.name,
          sessionNumber: matchingClient.totalSessions,
          lastSessionDate: matchingClient.lastSessionDate,
          totalSessions: matchingClient.totalSessions,
          estimatedRevenue: calculateEventRevenue(event, matchingClient),
        } : undefined,
        businessInsights: {
          isHighValue: matchingClient ? matchingClient.totalSpent > 1000 : false,
          isRepeatClient: matchingClient ? matchingClient.totalSessions > 1 : false,
          requiresPreparation: isPreparationRequired(event),
          suggestedActions: generateSuggestedActions(event, matchingClient),
        },
      };
    });
  }, [events, clients]);

  // Calculate weekly statistics
  const weeklyStats = useMemo((): WeeklyStats => {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay()); // Start of current week
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // End of current week

    const weekEvents = events.filter((event) => {
      const eventDate = new Date(event.startTime);
      return eventDate >= weekStart && eventDate <= weekEnd;
    });

    const totalAppointments = weekEvents.length;
    const totalRevenue = weekEvents.reduce((sum, event) => {
      const client = findMatchingClient(event, clients);
      return sum + calculateEventRevenue(event, client);
    }, 0);

    const totalHours = weekEvents.reduce((sum, event) => {
      const duration = calculateEventDuration(event);
      return sum + duration;
    }, 0);

    const dayCount = weekEvents.reduce((acc, event) => {
      const day = new Date(event.startTime).toLocaleDateString('en-US', { weekday: 'long' });
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const busiestDay = Object.keys(dayCount).length > 0
      ? Object.keys(dayCount).reduce((a, b) =>
          (dayCount[a] ?? 0) > (dayCount[b] ?? 0) ? a : b
        )
      : 'Monday';

    const uniqueClients = new Set(
      weekEvents
        .map(event => findMatchingClient(event, clients))
        .filter(Boolean)
        .map(client => client!.id)
    ).size;

    const newClientsThisWeek = clients.filter(client => {
      const joinDate = new Date(client.lastSessionDate);
      return joinDate >= weekStart && joinDate <= weekEnd && client.totalSessions === 1;
    }).length;

    return {
      totalAppointments,
      totalRevenue,
      totalHours,
      busiestDay,
      clientRetention: uniqueClients > 0 ? ((uniqueClients - newClientsThisWeek) / uniqueClients) * 100 : 0,
      newClients: newClientsThisWeek,
      averageSessionValue: totalAppointments > 0 ? totalRevenue / totalAppointments : 0,
      avgSessionLength: totalAppointments > 0 ? totalHours / totalAppointments : 0,
      utilizationRate: calculateUtilizationRate(weekEvents),
    };
  }, [events, clients]);

  // Convenience methods
  const updateClientData = (newClients: Client[]): void => {
    biService.updateClientData(newClients);
  };

  const calculateRevenue = (): number => {
    return events.reduce((sum, event) => {
      const client = findMatchingClient(event, clients);
      return sum + calculateEventRevenue(event, client);
    }, 0);
  };

  const getBusiestDay = (): string => {
    return weeklyStats.busiestDay;
  };

  return {
    biService,
    enhancedAppointments,
    weeklyStats,
    sessionMetrics,
    updateClientData,
    calculateRevenue,
    getBusiestDay,
  };
}

// Helper function to find matching client for an event
function findMatchingClient(event: CalendarEvent, clients: Client[]): Client | null {
  // First, try to match by attendee emails
  if (event.attendees && event.attendees.length > 0) {
    for (const attendee of event.attendees) {
      const matchingClient = clients.find(client =>
        client.email.toLowerCase() === attendee.email.toLowerCase()
      );
      if (matchingClient) return matchingClient;
    }
  }

  // If no attendee match, try to extract client name from event title
  if (event.title) {
    const titleText = event.title.toLowerCase();

    // Look for patterns like "session with [Name]", "[Name]'s appointment", etc.
    const namePatterns = [
      /(?:session|appointment|class|meeting)\s+(?:with|for)\s+([a-z]+(?:\s+[a-z]+)*)/i,
      /([a-z]+(?:\s+[a-z]+)*)\s*'?s?\s+(?:session|appointment|class)/i,
      /private\s+(?:session|class|appointment)\s+(?:with|for)\s+([a-z]+(?:\s+[a-z]+)*)/i,
    ];

    for (const pattern of namePatterns) {
      const match = titleText.match(pattern);
      if (match?.[1]) {
        const extractedName = match[1].trim();

        // Try to find a client with a similar name
        const matchingClient = clients.find(client => {
          const clientNameLower = client.name.toLowerCase();
          const extractedNameLower = extractedName.toLowerCase();

          // Check for exact match or partial match (first name, last name, or full name)
          return clientNameLower === extractedNameLower ||
                 clientNameLower.includes(extractedNameLower) ||
                 extractedNameLower.includes(clientNameLower) ||
                 // Check for first name + last name combinations
                 clientNameLower.split(' ').some(part => part === extractedNameLower) ||
                 extractedNameLower.split(' ').some(part => clientNameLower.includes(part));
        });

        if (matchingClient) return matchingClient;
      }
    }
  }

  return null;
}

// Helper function to calculate estimated revenue for an event
function calculateEventRevenue(event: CalendarEvent, client: Client | null): number {
  if (!client) return 0;

  // Basic revenue calculation based on session type and client history
  const baseRate = 100; // Default session rate
  const duration = calculateEventDuration(event);
  const hourlyRate = baseRate + (client.totalSpent / Math.max(client.totalSessions, 1) - baseRate) * 0.1;

  return duration * hourlyRate;
}

// Helper function to calculate event duration in hours
function calculateEventDuration(event: CalendarEvent): number {
  const start = new Date(event.startTime);
  const end = new Date(event.endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60); // Convert to hours
}

// Helper function to determine if preparation is required
function isPreparationRequired(event: CalendarEvent): boolean {
  const title = event.title.toLowerCase();
  const description = event.description?.toLowerCase() ?? '';

  // Check for keywords that typically require preparation
  const preparationKeywords = [
    'massage', 'therapy', 'consultation', 'assessment',
    'treatment', 'private', 'personal', 'coaching'
  ];

  return preparationKeywords.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  );
}

// Helper function to generate suggested actions
function generateSuggestedActions(event: CalendarEvent, client: Client | null): string[] {
  const actions: string[] = [];

  if (client) {
    if (client.totalSessions === 1) {
      actions.push('Prepare welcome materials for new client');
    }

    if (client.satisfaction < 3) {
      actions.push('Review client feedback and address concerns');
    }

    if (client.preferences?.goals && client.preferences.goals.length > 0) {
      actions.push(`Focus on client goals: ${client.preferences.goals.join(', ')}`);
    }
  }

  if (isPreparationRequired(event)) {
    actions.push('Review client history and prepare treatment plan');
  }

  const eventTime = new Date(event.startTime);
  const now = new Date();
  const hoursUntil = (eventTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntil < 2 && hoursUntil > 0) {
    actions.push('Send reminder to client');
  }

  return actions;
}

// Helper function to calculate utilization rate
function calculateUtilizationRate(events: CalendarEvent[]): number {
  const totalHours = events.reduce((sum, event) => sum + calculateEventDuration(event), 0);
  const workingHours = 40; // Assuming 40 hour work week
  return Math.min((totalHours / workingHours) * 100, 100);
}