import { differenceInDays, format } from "date-fns";

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

export class ClientContextService {
  private clients: Client[] = [];
  private sessionHistory: SessionHistory[] = [];

  constructor(clients: Client[] = [], sessionHistory: SessionHistory[] = []) {
    this.clients = clients;
    this.sessionHistory = sessionHistory;
  }

  /**
   * Get comprehensive context for a client
   */
  getClientContext(clientId: string): ClientContext | null {
    const client = this.clients.find((c) => c.id === clientId);
    if (!client) return null;

    const clientSessionHistory = this.sessionHistory
      .filter((s) => s.clientId === clientId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      client,
      sessionHistory: clientSessionHistory,
      upcomingAppointments: this.getUpcomingAppointments(clientId),
      preparationItems: this.generatePreparationItems(client, clientSessionHistory),
      insights: this.generateInsights(client, clientSessionHistory),
      recommendations: this.generateRecommendations(client, clientSessionHistory),
      riskFactors: this.identifyRiskFactors(client, clientSessionHistory),
    };
  }

  /**
   * Match attendee to client
   */
  matchAttendeeToClient(attendee: { email?: string; name?: string }): Client | null {
    if (!attendee.email && !attendee.name) return null;

    // Try email match first
    if (attendee.email) {
      const clientByEmail = this.clients.find(
        (c) => c.email.toLowerCase() === attendee.email!.toLowerCase(),
      );
      if (clientByEmail) return clientByEmail;
    }

    // Try name match
    if (attendee.name) {
      const attendeeName = attendee.name.toLowerCase();
      const clientByName = this.clients.find(
        (c) =>
          c.name.toLowerCase().includes(attendeeName) ||
          attendeeName.includes(c.name.toLowerCase()),
      );
      if (clientByName) return clientByName;
    }

    return null;
  }

  /**
   * Get upcoming appointments for a client
   */
  private getUpcomingAppointments(clientId: string): Array<{
    id: string;
    date: string;
    service: string;
    duration: number;
  }> {
    // This would integrate with your calendar API
    // For now, return mock data structure
    return [];
  }

  /**
   * Generate preparation items for upcoming session
   */
  private generatePreparationItems(client: Client, history: SessionHistory[]): string[] {
    const items: string[] = [];

    // Basic preparation
    items.push("Review client intake form");
    items.push("Check previous session notes");

    // Client-specific preparation
    if (client.totalSessions === 0) {
      items.push("Prepare new client welcome package");
      items.push("Review intake questionnaire responses");
    }

    if (client.medicalNotes) {
      items.push("Review medical notes and contraindications");
    }

    if (client.preferences?.allergies?.length) {
      items.push(`Check for allergies: ${client.preferences.allergies.join(", ")}`);
    }

    // Service-specific preparation
    const lastSession = history[0];
    if (lastSession) {
      items.push(
        `Review ${lastSession.service} session from ${format(new Date(lastSession.date), "MMM d")}`,
      );

      if (lastSession.goals?.length) {
        items.push(`Focus on goals: ${lastSession.goals.join(", ")}`);
      }

      if (lastSession.followUpNeeded) {
        items.push("Address follow-up items from previous session");
      }
    }

    // Emergency contact verification
    if (client.emergencyContact && client.totalSessions < 3) {
      items.push("Verify emergency contact information");
    }

    return items;
  }

  /**
   * Generate insights about the client
   */
  private generateInsights(client: Client, history: SessionHistory[]): string[] {
    const insights: string[] = [];

    // Session frequency insights
    const lastSessionDate = new Date(client.lastSessionDate);
    const daysSinceLastSession = differenceInDays(new Date(), lastSessionDate);

    if (daysSinceLastSession < 7) {
      insights.push("Very active client - weekly sessions");
    } else if (daysSinceLastSession < 14) {
      insights.push("Regular client - bi-weekly sessions");
    } else if (daysSinceLastSession < 30) {
      insights.push("Occasional client - monthly sessions");
    } else {
      insights.push("Inactive client - consider re-engagement");
    }

    // Revenue insights
    if (client.totalSpent > 1000) {
      insights.push("High-value client - focus on retention");
    } else if (client.totalSpent > 500) {
      insights.push("Growing client - upsell opportunities");
    }

    // Satisfaction insights
    if (client.satisfaction >= 4) {
      insights.push("Highly satisfied - excellent retention risk");
    } else if (client.satisfaction <= 2) {
      insights.push("Low satisfaction - address concerns immediately");
    }

    // Session progression insights
    if (history.length > 5) {
      const recentSessions = history.slice(0, 3);
      const avgDuration =
        recentSessions.reduce((sum, s) => sum + s.duration, 0) / recentSessions.length;

      if (avgDuration > 75) {
        insights.push("Longer sessions suggest complex needs or deep work");
      }
    }

    return insights;
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(client: Client, history: SessionHistory[]): string[] {
    const recommendations: string[] = [];

    const daysSinceLastSession = differenceInDays(new Date(), new Date(client.lastSessionDate));

    // Re-engagement recommendations
    if (daysSinceLastSession > 30) {
      recommendations.push("Send re-engagement email or call");
      recommendations.push("Offer special return rate");
    } else if (daysSinceLastSession > 14) {
      recommendations.push("Schedule follow-up appointment");
    }

    // Service recommendations
    if (client.totalSessions > 10) {
      recommendations.push("Consider package pricing or membership");
    }

    // Satisfaction-based recommendations
    if (client.satisfaction >= 4) {
      recommendations.push("Ask for referral or testimonial");
    } else if (client.satisfaction <= 3) {
      recommendations.push("Schedule satisfaction review call");
    }

    // Goal-based recommendations
    const lastSession = history[0];
    if (lastSession?.goals?.length) {
      recommendations.push(`Focus session on: ${lastSession.goals[0]}`);
    }

    // Time preference recommendations
    if (client.preferences?.preferredTimes?.length) {
      recommendations.push(
        `Schedule during preferred times: ${client.preferences.preferredTimes.join(", ")}`,
      );
    }

    return recommendations;
  }

  /**
   * Identify potential risk factors
   */
  private identifyRiskFactors(client: Client, history: SessionHistory[]): string[] {
    const risks: string[] = [];

    const daysSinceLastSession = differenceInDays(new Date(), new Date(client.lastSessionDate));

    // Inactivity risks
    if (daysSinceLastSession > 60) {
      risks.push("High churn risk - last session over 60 days ago");
    } else if (daysSinceLastSession > 30) {
      risks.push("Medium churn risk - last session over 30 days ago");
    }

    // Satisfaction risks
    if (client.satisfaction <= 2) {
      risks.push("Low satisfaction - immediate attention needed");
    }

    // Session frequency risks
    if (client.totalSessions > 0) {
      const avgDaysBetweenSessions = daysSinceLastSession / client.totalSessions;
      if (avgDaysBetweenSessions > 21) {
        risks.push("Irregular attendance pattern - inconsistent engagement");
      }
    }

    // Cancellation risks
    const recentCancellations = history.filter((h) =>
      h.feedback?.toLowerCase().includes("cancel"),
    ).length;
    if (recentCancellations > 2) {
      risks.push("High cancellation rate - investigate barriers");
    }

    return risks;
  }

  /**
   * Get preparation summary for an appointment
   */
  getPreparationSummary(
    clientId: string,
    appointmentDate: Date,
    serviceType: string,
  ): {
    priority: "low" | "medium" | "high";
    estimatedPrepTime: number; // minutes
    items: string[];
    notes: string;
  } {
    const context = this.getClientContext(clientId);
    if (!context) {
      return {
        priority: "low",
        estimatedPrepTime: 5,
        items: ["Review basic client information"],
        notes: "New or unknown client",
      };
    }

    const { client, preparationItems } = context;
    const daysUntilAppointment = differenceInDays(appointmentDate, new Date());

    let priority: "low" | "medium" | "high" = "low";
    let estimatedPrepTime = 10;

    // Determine priority and prep time
    if (client.totalSessions === 0) {
      priority = "high";
      estimatedPrepTime = 30;
    } else if (daysUntilAppointment <= 1) {
      priority = "high";
      estimatedPrepTime = 20;
    } else if (client.status === "inactive") {
      priority = "medium";
      estimatedPrepTime = 15;
    }

    const notes = this.generatePreparationNotes(client, serviceType, daysUntilAppointment);

    return {
      priority,
      estimatedPrepTime,
      items: preparationItems,
      notes,
    };
  }

  /**
   * Generate preparation notes
   */
  private generatePreparationNotes(
    client: Client,
    serviceType: string,
    daysUntilAppointment: number,
  ): string {
    const notes: string[] = [];

    if (daysUntilAppointment <= 1) {
      notes.push("Appointment is soon - prioritize preparation");
    }

    if (client.totalSessions === 0) {
      notes.push("First-time client - focus on welcome and assessment");
    } else {
      notes.push(`${client.totalSessions} sessions completed - review progress`);
    }

    if (client.satisfaction <= 3) {
      notes.push("Address any previous concerns or feedback");
    }

    if (client.preferences?.goals?.length) {
      notes.push(`Client goals: ${client.preferences.goals.slice(0, 2).join(", ")}`);
    }

    return notes.join(". ");
  }

  /**
   * Update client data
   */
  updateClientData(clients: Client[], sessionHistory: SessionHistory[] = []): void {
    this.clients = clients;
    this.sessionHistory = sessionHistory;
  }
}
